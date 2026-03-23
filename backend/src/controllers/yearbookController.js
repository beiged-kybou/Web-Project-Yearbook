import cloudinary from "../config/cloudinary.js";

const PAGE_OWNER_TYPES = new Set(["department", "club", "individual", "admin"]);
const RELEASE_STATUSES = new Set(["draft", "collecting", "final", "published"]);

const uploadBufferToCloudinary = (buffer, folder = "iut-yearbook/yearbooks") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );

    stream.end(buffer);
  });

const snapshotMemory = async (pool, memoryId) => {
  const result = await pool.query(
    `SELECT m.id, m.title, m.content, m.created_at,
            s.first_name || ' ' || s.last_name AS author_name,
            s.department
     FROM memories m
     LEFT JOIN students s ON s.student_id = m.created_by
     WHERE m.id = $1`,
    [memoryId],
  );

  if (!result.rows.length) {
    return null;
  }

  return {
    id: result.rows[0].id,
    title: result.rows[0].title,
    body: result.rows[0].content,
    createdAt: result.rows[0].created_at,
    authorName: result.rows[0].author_name,
    department: result.rows[0].department,
  };
};

const snapshotEventPost = async (pool, postId) => {
  const result = await pool.query(
    `SELECT ep.id, ep.title, ep.body, ep.created_at, e.title AS event_title
     FROM event_posts ep
     JOIN events e ON e.id = ep.event_id
     WHERE ep.id = $1`,
    [postId],
  );

  if (!result.rows.length) {
    return null;
  }

  return {
    id: result.rows[0].id,
    title: result.rows[0].title,
    body: result.rows[0].body,
    createdAt: result.rows[0].created_at,
    eventTitle: result.rows[0].event_title,
  };
};

const seedDefaultPages = async (pool, releaseId) => {
  const departments = await pool.query(
    `SELECT code
     FROM departments
     ORDER BY code ASC`,
  );

  const clubs = await pool.query(
    `SELECT code
     FROM clubs
     ORDER BY code ASC`,
  );

  let pageNumber = 1;
  const pageRows = [];

  const pushPages = (ownerType, ownerRef, titlePrefix) => {
    for (let i = 0; i < 3; i += 1) {
      pageRows.push({
        release_id: releaseId,
        page_number: pageNumber,
        owner_type: ownerType,
        owner_ref: ownerRef,
        title: `${titlePrefix} · Page ${i + 1}`,
      });
      pageNumber += 1;
    }
  };

  departments.rows.forEach((dept) => {
    pushPages("department", dept.code, `${dept.code} Department`);
  });

  clubs.rows.forEach((club) => {
    pushPages("club", club.code, `${club.code} Club`);
  });

  if (!pageRows.length) {
    return;
  }

  const values = [];
  const placeholders = pageRows
    .map((row, index) => {
      const base = index * 5;
      values.push(row.release_id, row.page_number, row.owner_type, row.owner_ref, row.title);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    })
    .join(", ");

  await pool.query(
    `INSERT INTO yearbook_pages (release_id, page_number, owner_type, owner_ref, title)
     VALUES ${placeholders}`,
    values,
  );
};

const loadPageWithAssets = async (pool, pageId) => {
  const result = await pool.query(
    `SELECT yp.*, yr.status AS release_status,
            COALESCE(images.images, '[]'::json) AS images,
            COALESCE(posts.attachments, '[]'::json) AS attachments
     FROM yearbook_pages yp
     JOIN yearbook_releases yr ON yr.id = yp.release_id
     LEFT JOIN LATERAL (
       SELECT json_agg(
                json_build_object(
                  'id', i.id,
                  'url', i.photo_url,
                  'sort', i.sort_order
                ) ORDER BY i.sort_order
              ) AS images
       FROM images i
       WHERE i.entity_type = 'yearbook_page' AND i.entity_id = yp.id::text
     ) images ON TRUE
     LEFT JOIN LATERAL (
       SELECT json_agg(
                json_build_object(
                  'id', ypp.id,
                  'type', ypp.entity_type,
                  'entityId', ypp.entity_id,
                  'snapshot', ypp.snapshot
                )
              ) AS attachments
       FROM yearbook_page_posts ypp
       WHERE ypp.page_id = yp.id
     ) posts ON TRUE
     WHERE yp.id = $1`,
    [pageId],
  );

  return result.rows[0] || null;
};

const canEditPage = (page, user) => {
  if (!user) {
    return false;
  }
  if (user.role === "admin") {
    return true;
  }
  if (page.assigned_user_id && page.assigned_user_id === user.userId) {
    return true;
  }
  return false;
};

const canViewPage = (page, user) => {
  if (!user) {
    return false;
  }
  if (user.role === "admin") {
    return true;
  }
  return page.assigned_user_id === user.userId;
};

export const listReleases = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { status } = req.query;

  try {
    const params = [];
    const clauses = [];

    if (status && RELEASE_STATUSES.has(status)) {
      clauses.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const releases = await pool.query(
      `SELECT id, title, year, theme, cover_photo_url, intro_text, status, created_at, updated_at, published_at
       FROM yearbook_releases
       ${whereClause}
       ORDER BY year DESC, created_at DESC`,
      params,
    );

    res.json({ releases: releases.rows });
  } catch (error) {
    console.error("List releases error", error);
    res.status(500).json({ error: "Failed to load releases" });
  }
};

export const listPublishedReleases = async (req, res) => {
  const pool = await req.app.locals.getPool();

  try {
    const releases = await pool.query(
      `SELECT id, title, year, theme, cover_photo_url, intro_text, published_at
       FROM yearbook_releases
       WHERE status = 'published'
       ORDER BY year DESC`,
    );

    res.json({ releases: releases.rows });
  } catch (error) {
    console.error("List published releases error", error);
    res.status(500).json({ error: "Failed to load published releases" });
  }
};

export const createRelease = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { title, year, theme, introText } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }

  if (!year || Number.isNaN(Number(year))) {
    return res.status(400).json({ error: "Valid year is required" });
  }

  try {
    let coverPhotoUrl = req.body.coverPhotoUrl?.trim() || null;
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer, "iut-yearbook/releases");
      coverPhotoUrl = uploadResult.secure_url;
    }

    const existing = await pool.query(
      `SELECT id FROM yearbook_releases WHERE year = $1 LIMIT 1`,
      [year],
    );

    if (existing.rows.length) {
      return res.status(409).json({ error: "A release already exists for this year" });
    }

    const result = await pool.query(
      `INSERT INTO yearbook_releases (title, year, theme, intro_text, cover_photo_url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title.trim(), Number(year), theme?.trim() || null, introText?.trim() || null, coverPhotoUrl, req.user.userId],
    );

    await seedDefaultPages(pool, result.rows[0].id);

    res.status(201).json({ release: result.rows[0] });
  } catch (error) {
    console.error("Create release error", error);
    res.status(500).json({ error: "Failed to create release" });
  }
};

export const updateReleaseStatus = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { releaseId } = req.params;
  const { status } = req.body;

  if (!RELEASE_STATUSES.has(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const update = await pool.query(
      `UPDATE yearbook_releases
       SET status = $1,
           published_at = CASE WHEN $1 = 'published' THEN NOW() ELSE published_at END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, releaseId],
    );

    if (!update.rows.length) {
      return res.status(404).json({ error: "Release not found" });
    }

    res.json({ release: update.rows[0] });
  } catch (error) {
    console.error("Update release status error", error);
    res.status(500).json({ error: "Failed to update status" });
  }
};

export const assignPageOwner = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { pageId } = req.params;
  const { ownerType, ownerRef, assignedUserId, title } = req.body;

  if (ownerType && !PAGE_OWNER_TYPES.has(ownerType)) {
    return res.status(400).json({ error: "Invalid owner type" });
  }

  try {
    const update = await pool.query(
      `UPDATE yearbook_pages
       SET owner_type = COALESCE($1, owner_type),
           owner_ref = COALESCE($2, owner_ref),
           assigned_user_id = $3,
           title = COALESCE($4, title),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [ownerType, ownerRef?.trim() || null, assignedUserId || null, title?.trim() || null, pageId],
    );

    if (!update.rows.length) {
      return res.status(404).json({ error: "Page not found" });
    }

    res.json({ page: update.rows[0] });
  } catch (error) {
    console.error("Assign page owner error", error);
    res.status(500).json({ error: "Failed to assign page" });
  }
};

export const listReleasePages = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { releaseId } = req.params;

  try {
    const release = await pool.query(
      `SELECT id, title, year, status FROM yearbook_releases WHERE id = $1`,
      [releaseId],
    );

    if (!release.rows.length) {
      return res.status(404).json({ error: "Release not found" });
    }

    const pages = await pool.query(
      `SELECT yp.*, u.display_name AS assignee_name
       FROM yearbook_pages yp
       LEFT JOIN users u ON u.id = yp.assigned_user_id
       WHERE yp.release_id = $1
       ORDER BY yp.page_number ASC`,
      [releaseId],
    );

    res.json({ release: release.rows[0], pages: pages.rows });
  } catch (error) {
    console.error("List release pages error", error);
    res.status(500).json({ error: "Failed to load pages" });
  }
};

export const listMyPages = async (req, res) => {
  const pool = await req.app.locals.getPool();

  try {
    const pages = await pool.query(
      `SELECT yp.*, yr.title AS release_title, yr.year, yr.status AS release_status,
              COALESCE(images.images, '[]'::json) AS images,
              COALESCE(posts.attachments, '[]'::json) AS attachments
       FROM yearbook_pages yp
       JOIN yearbook_releases yr ON yr.id = yp.release_id
       LEFT JOIN LATERAL (
         SELECT json_agg(
                  json_build_object(
                    'id', i.id,
                    'url', i.photo_url,
                    'sort', i.sort_order
                  ) ORDER BY i.sort_order
                ) AS images
         FROM images i
         WHERE i.entity_type = 'yearbook_page' AND i.entity_id = yp.id::text
       ) images ON TRUE
       LEFT JOIN LATERAL (
         SELECT json_agg(
                  json_build_object(
                    'id', ypp.id,
                    'type', ypp.entity_type,
                    'entityId', ypp.entity_id,
                    'snapshot', ypp.snapshot
                  )
                ) AS attachments
         FROM yearbook_page_posts ypp
         WHERE ypp.page_id = yp.id
       ) posts ON TRUE
       WHERE yp.assigned_user_id = $1
       ORDER BY yr.year DESC, yp.page_number ASC`,
      [req.user.userId],
    );

    res.json({ pages: pages.rows });
  } catch (error) {
    console.error("List my pages error", error);
    res.status(500).json({ error: "Failed to load assigned pages" });
  }
};

export const updatePageContent = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { pageId } = req.params;
  const { layout, content } = req.body;

  try {
    const page = await loadPageWithAssets(pool, pageId);
    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    if (!canEditPage(page, req.user)) {
      return res.status(403).json({ error: "Not allowed to edit this page" });
    }

    const update = await pool.query(
      `UPDATE yearbook_pages
       SET layout = COALESCE($1::jsonb, layout),
           content = COALESCE($2::jsonb, content),
           status = CASE WHEN status = 'approved' THEN 'submitted' ELSE status END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [layout ? JSON.stringify(layout) : null, content ? JSON.stringify(content) : null, pageId],
    );

    const reloaded = await loadPageWithAssets(pool, pageId);

    res.json({ page: reloaded });
  } catch (error) {
    console.error("Update page content error", error);
    res.status(500).json({ error: "Failed to update page" });
  }
};

export const submitPage = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { pageId } = req.params;

  try {
    const pageResult = await pool.query(`SELECT * FROM yearbook_pages WHERE id = $1`, [pageId]);
    if (!pageResult.rows.length) {
      return res.status(404).json({ error: "Page not found" });
    }

    if (!canEditPage(pageResult.rows[0], req.user)) {
      return res.status(403).json({ error: "Not allowed to submit this page" });
    }

    const update = await pool.query(
      `UPDATE yearbook_pages
       SET status = 'submitted',
           submitted_at = NOW(),
           submitted_by = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.user.userId, pageId],
    );

    res.json({ page: update.rows[0] });
  } catch (error) {
    console.error("Submit page error", error);
    res.status(500).json({ error: "Failed to submit page" });
  }
};

export const approvePage = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { pageId } = req.params;

  try {
    const update = await pool.query(
      `UPDATE yearbook_pages
       SET status = 'approved',
           approved_at = NOW(),
           approved_by = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.user.userId, pageId],
    );

    if (!update.rows.length) {
      return res.status(404).json({ error: "Page not found" });
    }

    res.json({ page: update.rows[0] });
  } catch (error) {
    console.error("Approve page error", error);
    res.status(500).json({ error: "Failed to approve page" });
  }
};

export const uploadPageImage = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { pageId } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: "Image file required" });
  }

  try {
    const page = await loadPageWithAssets(pool, pageId);
    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    if (!canEditPage(page, req.user)) {
      return res.status(403).json({ error: "Not allowed to upload to this page" });
    }

    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, "iut-yearbook/yearbook-pages");

    const insert = await pool.query(
      `INSERT INTO images (entity_type, entity_id, photo_url, sort_order)
       VALUES ('yearbook_page', $1, $2, COALESCE(
         (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM images WHERE entity_type = 'yearbook_page' AND entity_id = $1),
         0
       ))
       RETURNING id, photo_url, sort_order`,
      [String(pageId), uploadResult.secure_url],
    );

    const updatedPage = await loadPageWithAssets(pool, pageId);

    res.status(201).json({ image: insert.rows[0], page: updatedPage });
  } catch (error) {
    console.error("Upload page image error", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
};

export const addPostToPage = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { pageId } = req.params;
  const { entityType, entityId } = req.body;

  if (!["memory", "event_post"].includes(entityType)) {
    return res.status(400).json({ error: "Invalid entity type" });
  }

  try {
    const page = await loadPageWithAssets(pool, pageId);
    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    if (!canEditPage(page, req.user)) {
      return res.status(403).json({ error: "Not allowed to edit this page" });
    }

    let snapshot = null;
    if (entityType === "memory") {
      snapshot = await snapshotMemory(pool, entityId);
    } else {
      snapshot = await snapshotEventPost(pool, entityId);
    }

    if (!snapshot) {
      return res.status(404).json({ error: "Referenced content not found" });
    }

    const insert = await pool.query(
      `INSERT INTO yearbook_page_posts (page_id, entity_type, entity_id, snapshot)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (page_id, entity_type, entity_id)
       DO UPDATE SET snapshot = EXCLUDED.snapshot
       RETURNING *`,
      [pageId, entityType, entityId, JSON.stringify(snapshot)],
    );

    const updatedPage = await loadPageWithAssets(pool, pageId);

    res.status(201).json({ attachment: insert.rows[0], page: updatedPage });
  } catch (error) {
    console.error("Add post to page error", error);
    res.status(500).json({ error: "Failed to attach post" });
  }
};

export const removePostFromPage = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { pageId, attachmentId } = req.params;

  try {
    const page = await loadPageWithAssets(pool, pageId);
    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    if (!canEditPage(page, req.user)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    await pool.query(
      `DELETE FROM yearbook_page_posts WHERE id = $1 AND page_id = $2`,
      [attachmentId, pageId],
    );

    const updatedPage = await loadPageWithAssets(pool, pageId);

    res.json({ message: "Removed", page: updatedPage });
  } catch (error) {
    console.error("Remove post error", error);
    res.status(500).json({ error: "Failed to remove attachment" });
  }
};

export const getPublishedRelease = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { releaseId } = req.params;

  try {
    const releaseResult = await pool.query(
      `SELECT id, title, year, theme, intro_text, cover_photo_url, published_at
       FROM yearbook_releases
       WHERE id = $1 AND status = 'published'`,
      [releaseId],
    );

    if (!releaseResult.rows.length) {
      return res.status(404).json({ error: "Published release not found" });
    }

    const pagesResult = await pool.query(
      `SELECT yp.*, COALESCE(images.images, '[]'::json) AS images,
              COALESCE(posts.attachments, '[]'::json) AS attachments
       FROM yearbook_pages yp
       LEFT JOIN LATERAL (
         SELECT json_agg(
                  json_build_object(
                    'id', i.id,
                    'url', i.photo_url,
                    'sort', i.sort_order
                  ) ORDER BY i.sort_order
                ) AS images
         FROM images i
         WHERE i.entity_type = 'yearbook_page' AND i.entity_id = yp.id::text
       ) images ON TRUE
       LEFT JOIN LATERAL (
         SELECT json_agg(
                  json_build_object(
                    'id', ypp.id,
                    'type', ypp.entity_type,
                    'entityId', ypp.entity_id,
                    'snapshot', ypp.snapshot
                  )
                ) AS attachments
         FROM yearbook_page_posts ypp
         WHERE ypp.page_id = yp.id
       ) posts ON TRUE
       WHERE yp.release_id = $1
       ORDER BY yp.page_number ASC`,
      [releaseId],
    );

    res.json({ release: releaseResult.rows[0], pages: pagesResult.rows });
  } catch (error) {
    console.error("Get published release error", error);
    res.status(500).json({ error: "Failed to load flipbook" });
  }
};

export const getPageDetail = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { pageId } = req.params;

  try {
    const page = await loadPageWithAssets(pool, pageId);
    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    if (!canViewPage(page, req.user)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    res.json({ page });
  } catch (error) {
    console.error("Get page detail error", error);
    res.status(500).json({ error: "Failed to load page" });
  }
};

export const deletePageImage = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { pageId, imageId } = req.params;

  try {
    const page = await loadPageWithAssets(pool, pageId);
    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    if (!canEditPage(page, req.user)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    await pool.query(
      `DELETE FROM images
       WHERE id = $1 AND entity_type = 'yearbook_page' AND entity_id = $2`,
      [imageId, pageId],
    );

    const updatedPage = await loadPageWithAssets(pool, pageId);

    res.json({ message: "Image removed", page: updatedPage });
  } catch (error) {
    console.error("Delete page image error", error);
    res.status(500).json({ error: "Failed to remove image" });
  }
};

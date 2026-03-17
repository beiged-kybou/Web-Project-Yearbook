import cloudinary from "../config/cloudinary.js";

const PRIVACY_CONFIG = {
  department: {
    albumType: "department",
    title: "Department Memories",
    description: null,
  },
  batch: {
    albumType: "batch",
    title: "Batch Memories",
    description: null,
  },
  public: {
    albumType: "group",
    title: "Public Memories",
    description: null,
  },
};

const HEADLINE_LIMITS = {
  min: 6,
  max: 120,
};

const CAPTION_LIMITS = {
  min: 20,
  max: 1500,
};

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      return trimmed
        .split(/\n|,|\s+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const isLikelyUrl = (url) => /^https?:\/\//i.test(url);

const uploadBufferToCloudinary = (buffer, folder = "iut-yearbook/memories") =>
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

const isEligibleForPrivacy = (privacy, creator, candidate) => {
  if (privacy === "public") {
    return true;
  }

  if (privacy === "department") {
    return (
      Boolean(candidate.department) &&
      Boolean(creator.department) &&
      candidate.department === creator.department
    );
  }

  if (privacy === "batch") {
    return (
      Boolean(candidate.graduation_year) &&
      Boolean(creator.graduation_year) &&
      Number(candidate.graduation_year) === Number(creator.graduation_year)
    );
  }

  return false;
};

const coerceBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "1", "yes", "draft"].includes(normalized);
  }

  return false;
};

const findDuplicateIds = (ids = []) => {
  const counts = ids.reduce((acc, id) => {
    if (!id) {
      return acc;
    }
    const normalized = id.trim();
    if (!normalized) {
      return acc;
    }
    acc[normalized] = (acc[normalized] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
};

const buildValidationErrors = ({ headline, caption, isDraft }) => {
  const issues = [];

  if (!headline) {
    if (!isDraft) {
      issues.push("Headline is required.");
    }
  } else {
    if (headline.length > HEADLINE_LIMITS.max) {
      issues.push(`Headline must be ${HEADLINE_LIMITS.max} characters or fewer.`);
    }
    if (!isDraft && headline.length < HEADLINE_LIMITS.min) {
      issues.push(`Headline must be at least ${HEADLINE_LIMITS.min} characters.`);
    }
  }

  if (!caption) {
    if (!isDraft) {
      issues.push("Caption is required.");
    }
  } else {
    if (caption.length > CAPTION_LIMITS.max) {
      issues.push(`Caption must be ${CAPTION_LIMITS.max} characters or fewer.`);
    }
    if (!isDraft && caption.length < CAPTION_LIMITS.min) {
      issues.push(`Caption must be at least ${CAPTION_LIMITS.min} characters.`);
    }
  }

  return issues;
};

const parseJsonArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return [];
    }
  }

  return [];
};

const sanitizeUrlArray = (values = []) =>
  values
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter(isLikelyUrl);

const parseImageLayout = (value) => {
  const entries = parseJsonArray(value);
  return entries
    .map((entry) => ({
      type: typeof entry?.type === "string" ? entry.type : "",
      index: Number(entry?.index),
    }))
    .filter(
      (entry) =>
        ["existing", "url", "file"].includes(entry.type) &&
        Number.isInteger(entry.index) &&
        entry.index >= 0,
    );
};

const buildImagesFromLayout = (layout, buckets) => {
  const fallback = [
    ...(buckets.existing || []),
    ...(buckets.url || []),
    ...(buckets.file || []),
  ];

  if (!layout || layout.length === 0) {
    return fallback;
  }

  const ordered = [];
  layout.forEach((entry) => {
    const bucket = buckets[entry.type];
    if (!bucket) {
      return;
    }

    const value = bucket[entry.index];
    if (typeof value === "string" && value.length > 0) {
      ordered.push(value);
    }
  });

  if (ordered.length === 0) {
    return fallback;
  }

  return ordered;
};

const sanitizeExistingImagePayload = (entries = []) =>
  entries
    .map((entry) => ({
      id: Number(entry?.id),
      url: typeof entry?.url === "string" ? entry.url.trim() : "",
    }))
    .filter((entry) => Number.isInteger(entry.id) && entry.id > 0 && isLikelyUrl(entry.url));

export const createMemory = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.user;

  const headline = req.body.headline?.trim();
  const caption = req.body.caption?.trim();
  const privacy = (req.body.privacy || "public").trim().toLowerCase();
  const clubCode = req.body.clubCode?.trim();
  const existingImages = sanitizeExistingImagePayload(parseJsonArray(req.body.keptImages));
  const imageUrls = sanitizeUrlArray(parseJsonArray(req.body.imageUrls));
  const layout = parseImageLayout(req.body.imageLayout);
  const taggedStudentIds = [
    ...new Set(normalizeStringArray(req.body.taggedStudentIds)),
  ];
  const isDraft = coerceBoolean(req.body.isDraft);

  const validationIssues = buildValidationErrors({ headline, caption, isDraft });

  if (!isDraft && validationIssues.length > 0) {
    return res.status(400).json({
      error: "Memory validation failed.",
      issues: validationIssues,
    });
  }

  const allowedPrivacy = new Set([...Object.keys(PRIVACY_CONFIG), "club"]);

  if (!allowedPrivacy.has(privacy)) {
    return res
      .status(400)
      .json({
        error: "Invalid privacy. Use department, batch, club, or public.",
      });
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return res.status(500).json({
      error:
        "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT u.student_id, s.department, s.graduation_year
       FROM users u
       LEFT JOIN students s ON u.student_id = s.student_id
       WHERE u.id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const creator = userResult.rows[0];
    const creatorStudentId = creator.student_id;

    if (!creatorStudentId) {
      return res
        .status(400)
        .json({
          error: "Your account is not linked to a student profile yet.",
        });
    }

    if (privacy === "department" && !creator.department) {
      return res
        .status(400)
        .json({ error: "No department found for your profile." });
    }

    if (privacy === "batch" && !creator.graduation_year) {
      return res
        .status(400)
        .json({ error: "No batch found for your profile." });
    }

    let clubContext = null;

    if (privacy === "club") {
      if (!clubCode) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "clubCode is required for club privacy." });
      }

      const clubResult = await client.query(
        `SELECT c.id, c.code, c.name
         FROM clubs c
         JOIN club_members cm ON cm.club_id = c.id
         WHERE c.code = $1 AND cm.student_id = $2`,
        [clubCode, creatorStudentId],
      );

      if (clubResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "You must be a member of the selected club to post." });
      }

      clubContext = clubResult.rows[0];
    }

    const privacyConfig =
      privacy === "club"
        ? {
            albumType: "club",
            title: `${clubContext.name} Club Memories`,
            description: `Shared inside ${clubContext.name}`,
          }
        : PRIVACY_CONFIG[privacy];

    const albumLookupResult = await client.query(
      `SELECT id
       FROM albums
       WHERE type = $1 AND created_by = $2 AND title = $3
       LIMIT 1`,
      [privacyConfig.albumType, creatorStudentId, privacyConfig.title],
    );

    let albumId;
    if (albumLookupResult.rows.length > 0) {
      albumId = albumLookupResult.rows[0].id;
    } else {
      const albumInsertResult = await client.query(
        `INSERT INTO albums (title, description, type, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          privacyConfig.title,
          privacyConfig.description,
          privacyConfig.albumType,
          creatorStudentId,
        ],
      );
      albumId = albumInsertResult.rows[0].id;
    }

    const status = isDraft ? "draft" : "pending";
    const memoryInsertResult = await client.query(
      `INSERT INTO memories (title, content, created_by, album_id, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, content, created_by, album_id, created_at, status`,
      [headline || null, caption || null, creatorStudentId, albumId, status],
    );

    const memory = memoryInsertResult.rows[0];

    const uploadedImageUrls = [];
    for (const file of req.files || []) {
      const uploadResult = await uploadBufferToCloudinary(file.buffer);
      uploadedImageUrls.push(uploadResult.secure_url);
    }

    const buckets = {
      existing: existingImages.map((image) => image.url),
      url: imageUrls,
      file: uploadedImageUrls,
    };

    const orderedImageUrls = buildImagesFromLayout(layout, buckets);

    for (let index = 0; index < orderedImageUrls.length; index += 1) {
      await client.query(
        `INSERT INTO images (entity_type, entity_id, photo_url, sort_order)
         VALUES ('memory', $1, $2, $3)`,
        [String(memory.id), orderedImageUrls[index], index],
      );
    }

    const duplicateTaggedIds = findDuplicateIds(taggedStudentIds);
    const cleanTagIds = taggedStudentIds.filter(
      (studentId) => studentId && studentId !== creatorStudentId,
    );

    let existingTaggedRows = [];
    if (cleanTagIds.length > 0) {
      const existingTagsResult = await client.query(
        `SELECT student_id, department, graduation_year
         FROM students
         WHERE student_id = ANY($1::varchar[])`,
        [cleanTagIds],
      );

      existingTaggedRows = existingTagsResult.rows;
    }

    const existingStudentIds = existingTaggedRows.map((row) => row.student_id);
    const invalidTaggedStudentIds = cleanTagIds.filter(
      (studentId) => !existingStudentIds.includes(studentId),
    );

    let eligibleTaggedIds = [];

    if (existingTaggedRows.length > 0) {
      if (privacy === "club" && clubContext) {
        const membershipResult = await client.query(
          `SELECT student_id
           FROM club_members
           WHERE club_id = $1 AND student_id = ANY($2::varchar[])`,
          [clubContext.id, existingStudentIds],
        );
        const memberIds = new Set(membershipResult.rows.map((row) => row.student_id));
        eligibleTaggedIds = existingTaggedRows
          .filter((row) => memberIds.has(row.student_id))
          .map((row) => row.student_id);
      } else {
        eligibleTaggedIds = existingTaggedRows
          .filter((row) => isEligibleForPrivacy(privacy, creator, row))
          .map((row) => row.student_id);
      }
    }

    const outOfPrivacyGroupTagIds = existingStudentIds.filter(
      (studentId) => !eligibleTaggedIds.includes(studentId),
    );

    if (eligibleTaggedIds.length > 0) {
      await client.query(
        `INSERT INTO tag_notifications (
           memory_id,
           tagged_student_id,
           requested_by_student_id,
           status
         )
         SELECT $1, tagged_id, $2, 'pending'
         FROM unnest($3::varchar[]) AS tagged_id
         ON CONFLICT (memory_id, tagged_student_id)
         DO UPDATE SET status = 'pending', acted_at = NULL, acted_by_student_id = NULL, note = NULL`,
        [memory.id, creatorStudentId, eligibleTaggedIds],
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: isDraft
        ? "Memory saved as draft."
        : "Memory submitted for review.",
      memory,
      privacy,
      imagesAdded: orderedImageUrls.length,
      uploadedFiles: uploadedImageUrls.length,
      linkedImageUrls: imageUrls.length,
      tagsPendingApproval: eligibleTaggedIds,
      tagsSkipped: [...invalidTaggedStudentIds, ...outOfPrivacyGroupTagIds],
      outOfPrivacyGroupTagIds,
      invalidTaggedStudentIds,
      duplicateTaggedIds,
      clubCode: privacy === "club" ? clubContext?.code : null,
      issues: validationIssues,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create Memory Error:", error);
    return res.status(500).json({ error: "Failed to create memory." });
  } finally {
    client.release();
  }
};

export const listDrafts = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.user;

  try {
    const userResult = await pool.query(
      `SELECT student_id
       FROM users
       WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const studentId = userResult.rows[0].student_id;
    if (!studentId) {
      return res.status(400).json({ error: "Link a student profile before managing drafts." });
    }

    const draftsResult = await pool.query(
      `SELECT m.id, m.title, m.content, m.created_at, m.updated_at,
              m.status, m.album_id,
              COALESCE(a.type, 'group') AS album_type,
              COALESCE(a.title, 'Public Memories') AS album_title,
              (SELECT json_agg(json_build_object('id', i.id, 'url', i.photo_url, 'sort', i.sort_order)
                               ORDER BY i.sort_order)
               FROM images i
               WHERE i.entity_type = 'memory' AND i.entity_id = m.id::text
              ) AS images
       FROM memories m
       LEFT JOIN albums a ON a.id = m.album_id
       WHERE m.created_by = $1 AND m.status = 'draft'
       ORDER BY m.updated_at DESC NULLS LAST, m.created_at DESC`,
      [studentId],
    );

    return res.status(200).json({ drafts: draftsResult.rows });
  } catch (error) {
    console.error("List drafts error", error);
    return res.status(500).json({ error: "Failed to load drafts." });
  }
};

export const updateDraft = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.user;
  const { draftId } = req.params;
  const action = (req.body.action || "save").trim().toLowerCase();

  const allowedActions = new Set(["save", "publish", "delete"]);
  if (!allowedActions.has(action)) {
    return res.status(400).json({ error: "action must be save, publish, or delete." });
  }

  const headline = req.body.headline?.trim();
  const caption = req.body.caption?.trim();
  const privacy = req.body.privacy?.trim().toLowerCase();
  const clubCode = req.body.clubCode?.trim();
  const imageUrls = sanitizeUrlArray(parseJsonArray(req.body.imageUrls));
  const keptImages = sanitizeExistingImagePayload(parseJsonArray(req.body.keptImages));
  const removedImageIds = parseJsonArray(req.body.removedImageIds)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  const layout = parseImageLayout(req.body.imageLayout);
  const taggedStudentIds = [
    ...new Set(normalizeStringArray(req.body.taggedStudentIds)),
  ];

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT u.student_id, s.department, s.graduation_year
       FROM users u
       LEFT JOIN students s ON u.student_id = s.student_id
       WHERE u.id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found." });
    }

    const creator = userResult.rows[0];
    const creatorStudentId = creator.student_id;

    if (!creatorStudentId) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Link a student profile first." });
    }

    const draftResult = await client.query(
      `SELECT m.id, m.title, m.content, m.album_id, m.status,
              a.type AS album_type, a.title AS album_title
       FROM memories m
       LEFT JOIN albums a ON a.id = m.album_id
       WHERE m.id = $1 AND m.created_by = $2`,
      [draftId, creatorStudentId],
    );

    if (draftResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Draft not found." });
    }

    const draft = draftResult.rows[0];
    if (draft.status !== "draft") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Only drafts can be updated via this endpoint." });
    }

    if (action === "delete") {
      await client.query(`DELETE FROM memories WHERE id = $1`, [draft.id]);
      await client.query("COMMIT");
      return res.status(200).json({ message: "Draft deleted." });
    }

    if (privacy && ![...Object.keys(PRIVACY_CONFIG), "club"].includes(privacy)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid privacy choice." });
    }

    let clubContext = null;
    if (privacy === "club") {
      if (!clubCode) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "clubCode is required for club privacy." });
      }

      const clubResult = await client.query(
        `SELECT c.id, c.code, c.name
         FROM clubs c
         JOIN club_members cm ON cm.club_id = c.id
         WHERE c.code = $1 AND cm.student_id = $2`,
        [clubCode, creatorStudentId],
      );

      if (clubResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "You must be a club member to post." });
      }

      clubContext = clubResult.rows[0];
    }

    const nextPrivacy = privacy || draft.album_type || "public";
    let albumId = draft.album_id;

    if (!albumId || (privacy && privacy !== draft.album_type)) {
      const privacyConfig =
        nextPrivacy === "club"
          ? {
              albumType: "club",
              title: `${clubContext?.name || "Club"} Club Memories`,
              description: clubContext ? `Shared inside ${clubContext.name}` : null,
            }
          : PRIVACY_CONFIG[nextPrivacy] || PRIVACY_CONFIG.public;

      const albumLookupResult = await client.query(
        `SELECT id
         FROM albums
         WHERE type = $1 AND created_by = $2 AND title = $3
         LIMIT 1`,
        [privacyConfig.albumType, creatorStudentId, privacyConfig.title],
      );

      if (albumLookupResult.rows.length > 0) {
        albumId = albumLookupResult.rows[0].id;
      } else {
        const albumInsertResult = await client.query(
          `INSERT INTO albums (title, description, type, created_by)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [
            privacyConfig.title,
            privacyConfig.description,
            privacyConfig.albumType,
            creatorStudentId,
          ],
        );
        albumId = albumInsertResult.rows[0].id;
      }
    }

    const isPublishing = action === "publish";
    const validationIssues = buildValidationErrors({
      headline,
      caption,
      isDraft: !isPublishing,
    });

    if (isPublishing && validationIssues.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Validation failed.", issues: validationIssues });
    }

    const nextStatus = isPublishing ? "pending" : "draft";

    await client.query(
      `UPDATE memories
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           album_id = $3,
           status = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [headline || null, caption || null, albumId, nextStatus, draft.id],
    );

    const uploadedImageUrls = [];
    for (const file of req.files || []) {
      const uploadResult = await uploadBufferToCloudinary(file.buffer);
      uploadedImageUrls.push(uploadResult.secure_url);
    }

    const buckets = {
      existing: keptImages.map((image) => image.url),
      url: imageUrls,
      file: uploadedImageUrls,
    };

    const finalImageOrder = buildImagesFromLayout(layout, buckets);

    if (removedImageIds.length > 0) {
      await client.query(
        `DELETE FROM images WHERE entity_type = 'memory' AND entity_id = $1 AND id = ANY($2::int[])`,
        [draft.id, removedImageIds],
      );
    }

    if (
      finalImageOrder.length > 0 ||
      removedImageIds.length > 0 ||
      uploadedImageUrls.length > 0 ||
      imageUrls.length > 0 ||
      keptImages.length > 0
    ) {
      await client.query(`DELETE FROM images WHERE entity_type = 'memory' AND entity_id = $1`, [draft.id]);
      for (let index = 0; index < finalImageOrder.length; index += 1) {
        await client.query(
          `INSERT INTO images (entity_type, entity_id, photo_url, sort_order)
           VALUES ('memory', $1, $2, $3)`,
         [String(draft.id), finalImageOrder[index], index],
        );
      }
    }

    await client.query(`DELETE FROM tag_notifications WHERE memory_id = $1`, [draft.id]);
    await client.query(`DELETE FROM memory_participants WHERE memory_id = $1`, [draft.id]);

    if (isPublishing && taggedStudentIds.length > 0) {
      const cleanTagIds = taggedStudentIds.filter((studentId) => studentId && studentId !== creatorStudentId);

      if (cleanTagIds.length > 0) {
        const existingTagsResult = await client.query(
          `SELECT student_id, department, graduation_year
           FROM students
           WHERE student_id = ANY($1::varchar[])`,
          [cleanTagIds],
        );

        const eligibleTaggedIds = existingTagsResult.rows
          .filter((row) => isEligibleForPrivacy(nextPrivacy, creator, row))
          .map((row) => row.student_id);

        if (eligibleTaggedIds.length > 0) {
          await client.query(
            `INSERT INTO tag_notifications (
               memory_id,
               tagged_student_id,
               requested_by_student_id,
               status
             )
             SELECT $1, tagged_id, $2, 'pending'
             FROM unnest($3::varchar[]) AS tagged_id
             ON CONFLICT (memory_id, tagged_student_id)
             DO UPDATE SET status = 'pending', acted_at = NULL, acted_by_student_id = NULL, note = NULL`,
            [draft.id, creatorStudentId, eligibleTaggedIds],
          );
        }
      }
    }

    await client.query("COMMIT");

    return res.status(200).json({
      message: isPublishing ? "Draft submitted for review." : "Draft saved.",
      draftId: draft.id,
      status: nextStatus,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update draft error", error);
    return res.status(500).json({ error: "Failed to update draft." });
  } finally {
    client.release();
  }
};

export const createPublicMemory = (req, res) => {
  req.body = { ...req.body, privacy: "public" };
  return createMemory(req, res);
};

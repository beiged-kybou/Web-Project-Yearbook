import cloudinary from "../config/cloudinary.js";

const EVENT_SCOPES = new Set(["global", "department", "club"]);

const uploadBufferToCloudinary = (buffer, folder = "iut-yearbook/events") =>
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

const coerceDate = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

export const listEvents = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { scope, page = 1, limit = 20 } = req.query;
  const pageSize = Math.min(Math.max(Number(limit) || 20, 5), 50);
  const currentPage = Math.max(Number(page) || 1, 1);
  const offset = (currentPage - 1) * pageSize;

  const filters = [];
  const values = [];

  if (scope && EVENT_SCOPES.has(scope)) {
    values.push(scope);
    filters.push(`scope = $${values.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const eventsResult = await pool.query(
    `SELECT *
     FROM events
     ${whereClause}
     ORDER BY start_time IS NULL, start_time ASC NULLS LAST, created_at DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    [...values, pageSize, offset],
  );

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM events ${whereClause}`,
    values,
  );

  res.json({
    events: eventsResult.rows,
    pagination: {
      total: Number(countResult.rows[0]?.total || 0),
      page: currentPage,
      limit: pageSize,
    },
  });
};

export const createEvent = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const {
    title,
    description,
    scope = "global",
    scopeRef,
    startTime,
    endTime,
    location,
  } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }

  if (!EVENT_SCOPES.has(scope)) {
    return res.status(400).json({ error: "Invalid scope" });
  }

  let coverPhotoUrl = req.body.coverPhotoUrl?.trim() || null;

  try {
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      coverPhotoUrl = uploadResult.secure_url;
    }

    const result = await pool.query(
      `INSERT INTO events (title, description, cover_photo_url, scope, scope_ref, start_time, end_time, location, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        title.trim(),
        description?.trim() || null,
        coverPhotoUrl,
        scope,
        scopeRef?.trim() || null,
        coerceDate(startTime),
        coerceDate(endTime),
        location?.trim() || null,
        req.user.userId,
      ],
    );

    res.status(201).json({ event: result.rows[0] });
  } catch (error) {
    console.error("Create event error", error);
    res.status(500).json({ error: "Failed to create event" });
  }
};

export const updateEvent = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { eventId } = req.params;
  const {
    title,
    description,
    scope,
    scopeRef,
    startTime,
    endTime,
    location,
    coverPhotoUrl,
  } = req.body;

  if (scope && !EVENT_SCOPES.has(scope)) {
    return res.status(400).json({ error: "Invalid scope" });
  }

  try {
    let resolvedCover = coverPhotoUrl?.trim() || null;
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      resolvedCover = uploadResult.secure_url;
    }

    const result = await pool.query(
      `UPDATE events
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           cover_photo_url = COALESCE($3, cover_photo_url),
           scope = COALESCE($4, scope),
           scope_ref = COALESCE($5, scope_ref),
           start_time = COALESCE($6, start_time),
           end_time = COALESCE($7, end_time),
           location = COALESCE($8, location)
       WHERE id = $9
       RETURNING *`,
      [
        title?.trim(),
        description?.trim(),
        resolvedCover,
        scope,
        scopeRef?.trim() || null,
        coerceDate(startTime),
        coerceDate(endTime),
        location?.trim() || null,
        eventId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({ event: result.rows[0] });
  } catch (error) {
    console.error("Update event error", error);
    res.status(500).json({ error: "Failed to update event" });
  }
};

export const deleteEvent = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { eventId } = req.params;

  try {
    const result = await pool.query("DELETE FROM events WHERE id = $1", [eventId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ message: "Event removed" });
  } catch (error) {
    console.error("Delete event error", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
};

export const createEventPost = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { eventId } = req.params;
  const { title, body } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }

  try {
    const eventResult = await pool.query("SELECT id FROM events WHERE id = $1", [eventId]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const postResult = await pool.query(
      `INSERT INTO event_posts (event_id, title, body, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [eventId, title.trim(), body?.trim() || null, req.user.userId],
    );

    const createdPost = postResult.rows[0];

    if (req.files?.length) {
      const uploadPromises = req.files.map((file, index) =>
        uploadBufferToCloudinary(file.buffer, "iut-yearbook/event-posts").then((result) => ({
          url: result.secure_url,
          sort: index,
        })),
      );

      const uploads = await Promise.all(uploadPromises);

      if (uploads.length) {
        const insertValues = uploads.flatMap((upload) => [createdPost.id, upload.url, upload.sort]);
        const placeholders = uploads
          .map((_, idx) => `($${idx * 3 + 1}, 'event_post', $${idx * 3 + 2}, $${idx * 3 + 3})`)
          .join(", ");

        await pool.query(
          `INSERT INTO images (entity_id, entity_type, photo_url, sort_order)
           VALUES ${placeholders}`,
          insertValues,
        );
      }
    }

    res.status(201).json({ post: createdPost });
  } catch (error) {
    console.error("Create event post error", error);
    res.status(500).json({ error: "Failed to create event post" });
  }
};

export const listEventPosts = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { eventId } = req.params;

  try {
    const posts = await pool.query(
      `SELECT ep.*, u.display_name AS author_name,
              COALESCE(images.images, '[]'::json) AS images
       FROM event_posts ep
       JOIN users u ON u.id = ep.created_by
       LEFT JOIN LATERAL (
         SELECT json_agg(
                  json_build_object(
                    'id', i.id,
                    'url', i.photo_url,
                    'sort', i.sort_order
                  ) ORDER BY i.sort_order
                ) AS images
         FROM images i
         WHERE i.entity_type = 'event_post' AND i.entity_id = ep.id::text
       ) images ON true
       WHERE ep.event_id = $1
       ORDER BY ep.created_at DESC`,
      [eventId],
    );

    res.json({ posts: posts.rows });
  } catch (error) {
    console.error("List event posts error", error);
    res.status(500).json({ error: "Failed to load posts" });
  }
};

export const subscribeEvent = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { eventId } = req.params;

  try {
    const eventResult = await pool.query("SELECT id FROM events WHERE id = $1", [eventId]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    await pool.query(
      `INSERT INTO event_subscriptions (event_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (event_id, user_id) DO NOTHING`,
      [eventId, req.user.userId],
    );

    res.json({ message: "Subscribed" });
  } catch (error) {
    console.error("Subscribe event error", error);
    res.status(500).json({ error: "Failed to subscribe" });
  }
};

export const unsubscribeEvent = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { eventId } = req.params;

  try {
    await pool.query(
      `DELETE FROM event_subscriptions
       WHERE event_id = $1 AND user_id = $2`,
      [eventId, req.user.userId],
    );

    res.json({ message: "Unsubscribed" });
  } catch (error) {
    console.error("Unsubscribe event error", error);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
};

export const bookmarkEntity = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { entityType, entityId } = req.body;
  const allowed = new Set(["memory", "event", "event_post"]);

  if (!allowed.has(entityType)) {
    return res.status(400).json({ error: "Invalid entity" });
  }

  try {
    await pool.query(
      `INSERT INTO bookmarks (user_id, entity_type, entity_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING`,
      [req.user.userId, entityType, entityId],
    );

    res.json({ message: "Bookmarked" });
  } catch (error) {
    console.error("Bookmark error", error);
    res.status(500).json({ error: "Failed to bookmark" });
  }
};

export const removeBookmark = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { entityType, entityId } = req.body;

  try {
    await pool.query(
      `DELETE FROM bookmarks
       WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3`,
      [req.user.userId, entityType, entityId],
    );

    res.json({ message: "Bookmark removed" });
  } catch (error) {
    console.error("Remove bookmark error", error);
    res.status(500).json({ error: "Failed to remove bookmark" });
  }
};

export const listBookmarks = async (req, res) => {
  const pool = await req.app.locals.getPool();

  try {
    const result = await pool.query(
      `SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.userId],
    );
    res.json({ bookmarks: result.rows });
  } catch (error) {
    console.error("List bookmarks error", error);
    res.status(500).json({ error: "Failed to load bookmarks" });
  }
};

export const followUser = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { targetUserId } = req.params;

  if (targetUserId === req.user.userId) {
    return res.status(400).json({ error: "Cannot follow yourself" });
  }

  try {
    const targetResult = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [targetUserId],
    );

    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    await pool.query(
      `INSERT INTO follows (follower_id, following_id)
       VALUES ($1, $2)
       ON CONFLICT (follower_id, following_id) DO NOTHING`,
      [req.user.userId, targetUserId],
    );

    res.json({ message: "Following" });
  } catch (error) {
    console.error("Follow error", error);
    res.status(500).json({ error: "Failed to follow" });
  }
};

export const unfollowUser = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { targetUserId } = req.params;

  try {
    await pool.query(
      `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [req.user.userId, targetUserId],
    );

    res.json({ message: "Unfollowed" });
  } catch (error) {
    console.error("Unfollow error", error);
    res.status(500).json({ error: "Failed to unfollow" });
  }
};

export const listFollowing = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT u.id, u.display_name, u.email, u.avatar_url
       FROM follows f
       JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = $1`,
      [userId || req.user.userId],
    );

    res.json({ following: result.rows });
  } catch (error) {
    console.error("List following error", error);
    res.status(500).json({ error: "Failed to load following" });
  }
};

export const listFollowers = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT u.id, u.display_name, u.email, u.avatar_url
       FROM follows f
       JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = $1`,
      [userId || req.user.userId],
    );

    res.json({ followers: result.rows });
  } catch (error) {
    console.error("List followers error", error);
    res.status(500).json({ error: "Failed to load followers" });
  }
};

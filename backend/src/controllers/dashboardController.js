/**
 * Dashboard controller
 *
 * Returns memories & albums visible to the logged-in user, grouped by:
 *   - their department  (e.g. all CSE albums/memories)
 *   - their batch       (e.g. all batch '22 albums/memories)
 *
 * The user's department & batch are derived from their linked student record.
 */

export const getDashboard = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.user;

  try {
    // 1. Look up the user's student record to get department & graduation_year
    const userResult = await pool.query(
      `SELECT u.id, u.display_name, u.email, u.student_id, u.role, u.avatar_url,
              s.department, s.graduation_year, s.first_name, s.last_name
       FROM users u
       LEFT JOIN students s ON u.student_id = s.student_id
       WHERE u.id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = userResult.rows[0];
    const { department, graduation_year } = user;

    // Derive batch label from graduation_year (graduation_year - 4 → 2-digit)
    const batchYear = graduation_year ? graduation_year - 4 : null;
    const batch = batchYear ? String(batchYear).slice(-2) : null;

    // 2. Fetch department albums & their memories
    const deptAlbumsResult = await pool.query(
      `SELECT a.id, a.title, a.description, a.type, a.created_at,
              s.first_name || ' ' || s.last_name AS created_by_name,
              s.student_id AS created_by_id
       FROM albums a
       LEFT JOIN students s ON a.created_by = s.student_id
       WHERE a.type = 'department'
         AND a.created_by IN (
           SELECT student_id FROM students WHERE department = $1
         )
       ORDER BY a.created_at DESC
       LIMIT 20`,
      [department],
    );

    // 3. Fetch batch albums & their memories
    const batchAlbumsResult = await pool.query(
      `SELECT a.id, a.title, a.description, a.type, a.created_at,
              s.first_name || ' ' || s.last_name AS created_by_name,
              s.student_id AS created_by_id
       FROM albums a
       LEFT JOIN students s ON a.created_by = s.student_id
       WHERE a.type = 'batch'
         AND a.created_by IN (
           SELECT student_id FROM students WHERE graduation_year = $1
         )
       ORDER BY a.created_at DESC
       LIMIT 20`,
      [graduation_year],
    );

    // Collect all album IDs to fetch their memories in one query
    const allAlbumIds = [
      ...deptAlbumsResult.rows.map((a) => a.id),
      ...batchAlbumsResult.rows.map((a) => a.id),
    ];

    let memoriesByAlbum = {};
    if (allAlbumIds.length > 0) {
      const memoriesResult = await pool.query(
        `SELECT m.id, m.title, m.content, m.album_id, m.created_at,
                s.first_name || ' ' || s.last_name AS created_by_name,
                s.student_id AS created_by_id,
                (SELECT json_agg(json_build_object('id', i.id, 'url', i.photo_url, 'sort', i.sort_order)
                                 ORDER BY i.sort_order)
                 FROM images i
                 WHERE i.entity_type = 'memory' AND i.entity_id = m.id::text
                ) AS images
         FROM memories m
         LEFT JOIN students s ON m.created_by = s.student_id
         WHERE m.album_id = ANY($1)
         ORDER BY m.created_at DESC`,
        [allAlbumIds],
      );

      for (const memory of memoriesResult.rows) {
        if (!memoriesByAlbum[memory.album_id]) {
          memoriesByAlbum[memory.album_id] = [];
        }
        memoriesByAlbum[memory.album_id].push(memory);
      }
    }

    // 4. Fetch recent standalone memories from same department (no album)
    const deptMemoriesResult = await pool.query(
      `SELECT m.id, m.title, m.content, m.album_id, m.created_at,
              s.first_name || ' ' || s.last_name AS created_by_name,
              s.student_id AS created_by_id,
              (SELECT json_agg(json_build_object('id', i.id, 'url', i.photo_url, 'sort', i.sort_order)
                               ORDER BY i.sort_order)
               FROM images i
               WHERE i.entity_type = 'memory' AND i.entity_id = m.id::text
              ) AS images
       FROM memories m
       LEFT JOIN students s ON m.created_by = s.student_id
       WHERE m.album_id IS NULL
         AND m.created_by IN (
           SELECT student_id FROM students WHERE department = $1
         )
       ORDER BY m.created_at DESC
       LIMIT 20`,
      [department],
    );

    // 5. Fetch recent standalone memories from same batch (no album)
    const batchMemoriesResult = await pool.query(
      `SELECT m.id, m.title, m.content, m.album_id, m.created_at,
              s.first_name || ' ' || s.last_name AS created_by_name,
              s.student_id AS created_by_id,
              (SELECT json_agg(json_build_object('id', i.id, 'url', i.photo_url, 'sort', i.sort_order)
                               ORDER BY i.sort_order)
               FROM images i
               WHERE i.entity_type = 'memory' AND i.entity_id = m.id::text
              ) AS images
       FROM memories m
       LEFT JOIN students s ON m.created_by = s.student_id
       WHERE m.album_id IS NULL
         AND m.created_by IN (
           SELECT student_id FROM students WHERE graduation_year = $1
         )
       ORDER BY m.created_at DESC
       LIMIT 20`,
      [graduation_year],
    );

    // Attach memories to albums
    const attachMemories = (albums) =>
      albums.map((album) => ({
        ...album,
        memories: memoriesByAlbum[album.id] || [],
      }));

    res.status(200).json({
      user: {
        id: user.id,
        displayName: user.display_name,
        email: user.email,
        studentId: user.student_id,
        role: user.role,
        avatarUrl: user.avatar_url,
        firstName: user.first_name,
        lastName: user.last_name,
        department,
        graduationYear: graduation_year,
        batch,
      },
      department: {
        code: department,
        albums: attachMemories(deptAlbumsResult.rows),
        memories: deptMemoriesResult.rows,
      },
      batch: {
        year: graduation_year,
        label: batch ? `'${batch}` : null,
        albums: attachMemories(batchAlbumsResult.rows),
        memories: batchMemoriesResult.rows,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

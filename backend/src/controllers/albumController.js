export async function createAlbum(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const { title, description, type } = req.body;
    const created_by = req.user.id; // From authMiddleware

    const result = await pool.query(
      `INSERT INTO albums (title, description, type, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, description, type, created_by],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAlbums(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const result = await pool.query(
      `SELECT a.*, s.first_name || ' ' || s.last_name as creator_name
       FROM albums a
       LEFT JOIN students s ON a.created_by = s.student_id
       ORDER BY a.created_at DESC`,
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAlbumById(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const { id } = req.params;

    const albumResult = await pool.query("SELECT * FROM albums WHERE id = $1", [
      id,
    ]);

    if (albumResult.rows.length === 0) {
      return res.status(404).json({ error: "Album not found" });
    }

    const memoriesResult = await pool.query(
      `SELECT m.*, s.first_name || ' ' || s.last_name as author_name,
              string_agg(i.photo_url, ',') as photo_urls
       FROM memories m
       LEFT JOIN students s ON m.created_by = s.student_id
       LEFT JOIN images i ON i.entity_id = m.id::text AND i.entity_type = 'memory'
       WHERE m.album_id = $1
       GROUP BY m.id, s.first_name, s.last_name
       ORDER BY m.created_at DESC`,
      [id],
    );

    res.json({ ...albumResult.rows[0], memories: memoriesResult.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

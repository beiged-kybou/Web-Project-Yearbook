export async function addImage(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const { entity_type, entity_id, photo_url, sort_order } = req.body;

    const result = await pool.query(
      `INSERT INTO images (entity_type, entity_id, photo_url, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [entity_type, entity_id, photo_url, sort_order || 0],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getImagesByEntity(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const { type, id } = req.params;

    const result = await pool.query(
      "SELECT * FROM images WHERE entity_type = $1 AND entity_id = $2 ORDER BY sort_order ASC",
      [type, id],
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

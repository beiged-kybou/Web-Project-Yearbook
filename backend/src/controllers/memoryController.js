export async function createMemory(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const { title, content } = req.body;
    const album_id = req.params.id;
    const created_by = req.user.id;

    const memoryResult = await pool.query(
      `INSERT INTO memories (title, content, created_by, album_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, content, created_by, album_id],
    );
    const memory = memoryResult.rows[0];

    if (req.files && req.files.length > 0) {
      const imageValues = req.files
        .map(
          (file, index) =>
            `('memory', '${memory.id}', '${file.path}', ${index})`,
        )
        .join(",");

      await pool.query(
        `INSERT INTO images (entity_type, entity_id, photo_url, sort_order)
         VALUES ${imageValues}`,
      );
    }

    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

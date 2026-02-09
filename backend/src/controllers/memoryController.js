export async function getAllMemories(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const result = await pool.query(`
      SELECT m.*,
             array_agg(s.first_name || ' ' || s.last_name) as participants,
             COUNT(mp.memory_id) as participant_count
      FROM memories m
      LEFT JOIN memory_participants mp ON m.id = mp.memory_id
      LEFT JOIN students s ON mp.student_id = s.student_id
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getMemoryById(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT m.*,
             array_agg(s.first_name || ' ' || s.last_name) as participants
      FROM memories m
      LEFT JOIN memory_participants mp ON m.id = mp.memory_id
      LEFT JOIN students s ON mp.student_id = s.student_id
      WHERE m.id = $1
      GROUP BY m.id
    `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Memory not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getMemoriesByStudent(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const { studentId } = req.params;

    const result = await pool.query(
      `
      SELECT DISTINCT m.*,
             array_agg(s2.first_name || ' ' || s2.last_name) as participants
      FROM memories m
      JOIN memory_participants mp ON m.id = mp.memory_id
      JOIN students s ON mp.student_id = s.student_id
      LEFT JOIN memory_participants mp2 ON m.id = mp2.memory_id
      LEFT JOIN students s2 ON mp2.student_id = s2.student_id
      WHERE mp.student_id = $1
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `,
      [studentId],
    );

    res.json({
      memories: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
export async function createMemory(req, res) {
  const pool = await req.app.locals.getPool();
  const client = await pool.connect();

  try {
    const { title, content, created_by, participants } = req.body;

    await client.query("BEGIN");

    const memoryResult = await client.query(
      `INSERT INTO memories (title, content, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [title, content, created_by],
    );

    const newMemory = memoryResult.rows[0];

    if (participants && participants.length > 0) {
      const participantQueries = participants.map((studentId) => {
        return client.query(
          `INSERT INTO memory_participants (memory_id, student_id) VALUES ($1, $2)`,
          [newMemory.id, studentId],
        );
      });
      await Promise.all(participantQueries);
    }

    await client.query("COMMIT");
    res.status(201).json(newMemory);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}

export async function updateMemory(req, res) {
  const pool = await req.app.locals.getPool();
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { title, content, participants } = req.body;

    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE memories SET title = $1, content = $2 WHERE id = $3 RETURNING *`,
      [title, content, id],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Memory not found" });
    }

    if (participants) {
      await client.query(
        `DELETE FROM memory_participants WHERE memory_id = $1`,
        [id],
      );
      const participantQueries = participants.map((studentId) => {
        return client.query(
          `INSERT INTO memory_participants (memory_id, student_id) VALUES ($1, $2)`,
          [id, studentId],
        );
      });
      await Promise.all(participantQueries);
    }

    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}

export async function deleteMemory(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM memories WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Memory not found" });
    }

    res.json({ message: "Memory deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAllStudents(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const result = await pool.query(
      "SELECT * FROM students ORDER BY student_id ASC",
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getStudentsByYear(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const { year } = req.params;
    const result = await pool.query(
      "SELECT * FROM students WHERE graduation_year = $1 ORDER BY student_id ASC",
      [year],
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getStudentByName(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const { name } = req.query;

    if (!name || name.length < 2) {
      return res.status(400).json({
        error: "Search term must be at least 2 characters",
      });
    }

    const result = await pool.query(
      `SELECT student_id, first_name, last_name, email, department,
              graduation_year, photo_url, bio, motto,
       LOWER(first_name || ' ' || last_name) AS full_name
       FROM students
       WHERE LOWER(first_name) LIKE $1
          OR LOWER(last_name) LIKE $1
          OR LOWER(first_name || ' ' || last_name) LIKE $1
       ORDER BY full_name
       LIMIT 50`,
      [`%${name.toLowerCase()}%`],
    );

    res.json({
      students: result.rows,
      count: result.rows.length,
      query: name,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getStudentById(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM students WHERE student_id = $1",
      [id],
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

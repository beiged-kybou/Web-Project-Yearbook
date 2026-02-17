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

export async function createStudent(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const {
      student_id,
      first_name,
      last_name,
      email,
      phone,
      department,
      photo_url,
      bio,
      motto,
      graduation_year,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO students (
        student_id, first_name, last_name, email, phone,
        department, photo_url, bio, motto, graduation_year
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        student_id,
        first_name,
        last_name,
        email,
        phone,
        department,
        photo_url,
        bio,
        motto,
        graduation_year,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ error: "Student ID or Email already exists." });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function updateStudent(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      department,
      photo_url,
      bio,
      motto,
      graduation_year,
    } = req.body;

    const result = await pool.query(
      `UPDATE students
       SET first_name = $1, last_name = $2, email = $3, phone = $4,
           department = $5, photo_url = $6, bio = $7, motto = $8,
           graduation_year = $9, updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $10
       RETURNING *`,
      [
        first_name,
        last_name,
        email,
        phone,
        department,
        photo_url,
        bio,
        motto,
        graduation_year,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteStudent(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM students WHERE student_id = $1 RETURNING student_id",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ message: `Student ${id} deleted successfully` });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(400).json({
        error: "Cannot delete student: they are linked to existing memories.",
      });
    }
    res.status(500).json({ error: error.message });
  }
}

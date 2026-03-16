import cloudinary from "../config/cloudinary.js";

const mapStudentRow = (row) => ({
  studentId: row.student_id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  department: row.department,
  departmentName: row.department_name,
  graduationYear: row.graduation_year,
  photoUrl: row.photo_url,
  bio: row.bio,
  motto: row.motto,
  phone: row.phone,
  updatedAt: row.updated_at,
});

const uploadBufferToCloudinary = (buffer, folder = "iut-yearbook/profiles") =>
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

export async function getAllStudents(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const {
      search = "",
      department = "",
      batch,
      limit = 24,
      page = 1,
    } = req.query;

    const pageSize = Math.min(Math.max(Number(limit) || 24, 6), 60);
    const currentPage = Math.max(Number(page) || 1, 1);
    const offset = (currentPage - 1) * pageSize;

    const filters = [];
    const values = [];

    if (search.trim()) {
      values.push(`%${search.trim().toLowerCase()}%`);
      values.push(`%${search.trim()}%`);
      filters.push(
        `(LOWER(s.first_name) LIKE $${values.length - 1}
          OR LOWER(s.last_name) LIKE $${values.length - 1}
          OR LOWER(s.first_name || ' ' || s.last_name) LIKE $${values.length - 1}
          OR s.student_id LIKE $${values.length})`,
      );
    }

    if (department.trim()) {
      values.push(department.trim().toUpperCase());
      filters.push(`s.department = $${values.length}`);
    }

    if (batch && Number(batch)) {
      values.push(Number(batch));
      filters.push(`s.graduation_year = $${values.length}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM students s ${whereClause}`,
      values,
    );

    const total = Number(countResult.rows[0]?.total || 0);

    const result = await pool.query(
      `SELECT s.student_id, s.first_name, s.last_name, s.email, s.phone,
              s.department, d.name AS department_name, s.photo_url, s.bio,
              s.motto, s.graduation_year, s.updated_at
       FROM students s
       LEFT JOIN departments d ON d.code = s.department
       ${whereClause}
       ORDER BY s.graduation_year DESC NULLS LAST, s.first_name ASC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, pageSize, offset],
    );

    res.json({
      students: result.rows.map(mapStudentRow),
      pagination: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      filters: {
        search: search.trim(),
        department: department.trim().toUpperCase(),
        batch: batch ? Number(batch) : null,
      },
    });
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
          OR student_id LIKE $2
       ORDER BY full_name
       LIMIT 50`,
      [`%${name.toLowerCase()}%`, `%${name}%`],
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

export async function getMyProfile(req, res) {
  try {
    const pool = await req.app.locals.getPool();
    const { userId } = req.user;

    const userResult = await pool.query(
      `SELECT u.id, u.display_name, u.email, u.avatar_url, u.student_id,
              s.first_name, s.last_name, s.department, s.graduation_year,
              s.photo_url, s.bio, s.motto
       FROM users u
       LEFT JOIN students s ON u.student_id = s.student_id
       WHERE u.id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const profile = userResult.rows[0];

    if (!profile.student_id) {
      return res.status(400).json({
        error: "Your account is not linked to a student profile.",
      });
    }

    const memoriesResult = await pool.query(
      `SELECT m.id, m.title, m.content, m.created_at,
              CASE
                WHEN a.type = 'department' THEN 'department'
                WHEN a.type = 'batch' THEN 'batch'
                WHEN a.type = 'group' THEN 'public'
                ELSE 'public'
              END AS privacy,
              (SELECT json_agg(
                        json_build_object('id', i.id, 'url', i.photo_url, 'sort', i.sort_order)
                        ORDER BY i.sort_order
                      )
               FROM images i
               WHERE i.entity_type = 'memory' AND i.entity_id = m.id::text
              ) AS images,
              (SELECT json_agg(
                        json_build_object(
                          'student_id', ts.student_id,
                          'first_name', ts.first_name,
                          'last_name', ts.last_name,
                          'department', ts.department,
                          'graduation_year', ts.graduation_year,
                          'photo_url', ts.photo_url
                        )
                      )
               FROM memory_participants mp
               JOIN students ts ON mp.student_id = ts.student_id
               WHERE mp.memory_id = m.id
              ) AS tagged_students,
               (SELECT json_agg(
                         json_build_object(
                           'student_id', pending_ts.student_id,
                           'first_name', pending_ts.first_name,
                           'last_name', pending_ts.last_name,
                           'department', pending_ts.department,
                           'graduation_year', pending_ts.graduation_year,
                           'photo_url', pending_ts.photo_url
                         )
                       )
               FROM tag_notifications tn
               JOIN students pending_ts ON tn.tagged_student_id = pending_ts.student_id
               WHERE tn.memory_id = m.id AND tn.status = 'pending'
              ) AS pending_tags
       FROM memories m
       LEFT JOIN albums a ON m.album_id = a.id
       WHERE m.created_by = $1
       ORDER BY m.created_at DESC`,
      [profile.student_id],
    );

    const groupedMemories = {
      department: [],
      batch: [],
      public: [],
    };

    for (const memory of memoriesResult.rows) {
      const groupKey = memory.privacy || "public";
      if (!groupedMemories[groupKey]) {
        groupedMemories[groupKey] = [];
      }
      groupedMemories[groupKey].push(memory);
    }

    res.json({
      profile: {
        id: profile.id,
        displayName: profile.display_name,
        email: profile.email,
        studentId: profile.student_id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        department: profile.department,
        graduationYear: profile.graduation_year,
        displayPhoto: profile.photo_url || profile.avatar_url || "",
        motto: profile.motto || "",
        bio: profile.bio || "",
      },
      memories: groupedMemories,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateMyProfile(req, res) {
  const pool = await req.app.locals.getPool();
  const { userId } = req.user;

  const displayPhotoInput = req.body.displayPhoto?.trim() || "";
  const motto = req.body.motto?.trim() || "";
  const bio = req.body.bio?.trim() || "";

  try {
    let resolvedDisplayPhoto = displayPhotoInput;

    if (req.file) {
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

      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      resolvedDisplayPhoto = uploadResult.secure_url;
    }

    const userResult = await pool.query(
      `SELECT student_id FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const studentId = userResult.rows[0].student_id;
    if (!studentId) {
      return res.status(400).json({
        error: "Your account is not linked to a student profile.",
      });
    }

    await pool.query("BEGIN");

    await pool.query(
      `UPDATE students
       SET photo_url = $1,
           motto = $2,
           bio = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $4`,
      [resolvedDisplayPhoto || null, motto || null, bio || null, studentId],
    );

    await pool.query(
      `UPDATE users
       SET avatar_url = $1
       WHERE id = $2`,
      [resolvedDisplayPhoto || null, userId],
    );

    await pool.query("COMMIT");

    return getMyProfile(req, res);
  } catch (error) {
    await pool.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  }
}

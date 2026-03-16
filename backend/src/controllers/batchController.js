const deriveBatchLabel = (graduationYear) => {
  if (!graduationYear || Number.isNaN(Number(graduationYear))) {
    return {
      graduationYear: null,
      entryYear: null,
      label: "Upcoming Batch",
    };
  }

  const entryYear = graduationYear - 4;
  const shortEntry = entryYear ? String(entryYear).slice(-2) : null;
  const label = shortEntry ? `Batch '${shortEntry}` : `Class of ${graduationYear}`;

  return {
    graduationYear,
    entryYear,
    label,
  };
};

const buildExcerpt = (content = "", limit = 180) => {
  if (!content) {
    return "";
  }
  if (content.length <= limit) {
    return content;
  }
  return `${content.slice(0, limit).trim()}…`;
};

const normalizeDepartmentsByYear = (departmentRows) => {
  return departmentRows.reduce((acc, row) => {
    const graduationYear = Number(row.graduation_year);
    if (!graduationYear) {
      return acc;
    }

    if (!acc[graduationYear]) {
      acc[graduationYear] = [];
    }

    acc[graduationYear].push({
      code: row.department,
      name: row.department_name,
      studentCount: Number(row.student_count) || 0,
    });

    return acc;
  }, {});
};

const normalizeHighlightsByYear = (highlightRows) => {
  return highlightRows.reduce((acc, row) => {
    const graduationYear = Number(row.graduation_year);
    if (!graduationYear) {
      return acc;
    }

    acc[graduationYear] = {
      memoryId: row.id,
      title: row.title,
      content: row.content,
      excerpt: buildExcerpt(row.content, 200),
      createdAt: row.created_at,
      authorName: row.author_name,
      coverImage: row.cover_image,
    };

    return acc;
  }, {});
};

const mapDepartmentBreakdown = (rows, totalStudents) => {
  if (!rows || rows.length === 0) {
    return [];
  }

  return rows.map((row) => {
    const studentCount = Number(row.student_count) || 0;
    const percentage = totalStudents
      ? Number(((studentCount / totalStudents) * 100).toFixed(1))
      : 0;

    return {
      code: row.department,
      name: row.department_name,
      studentCount,
      percentage,
    };
  });
};

const mapMemoryRow = (row) => {
  if (!row) {
    return null;
  }

  const images = Array.isArray(row.images) ? row.images : [];
  const taggedStudents = Array.isArray(row.tagged_students)
    ? row.tagged_students
    : [];

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    excerpt: buildExcerpt(row.content, 220),
    createdAt: row.created_at,
    authorName: row.author_name,
    coverImage: images[0]?.url || null,
    gallery: images,
    taggedStudents,
  };
};

export const listBatches = async (req, res) => {
  const pool = await req.app.locals.getPool();

  try {
    const summaryResult = await pool.query(
      `WITH available_years AS (
         SELECT year
         FROM yearbooks
         WHERE year IS NOT NULL
         UNION
         SELECT DISTINCT graduation_year
         FROM students
         WHERE graduation_year IS NOT NULL
       )
       SELECT
         ay.year AS graduation_year,
         y.theme,
         COUNT(DISTINCT s.student_id) AS student_count,
         COUNT(DISTINCT m.id) AS memory_count,
         MAX(m.created_at) AS last_memory_at
       FROM available_years ay
       LEFT JOIN yearbooks y ON y.year = ay.year
       LEFT JOIN students s ON s.graduation_year = ay.year
       LEFT JOIN memories m ON m.created_by = s.student_id
       GROUP BY ay.year, y.theme
       ORDER BY ay.year DESC`,
    );

    const departmentResult = await pool.query(
      `SELECT
         s.graduation_year,
         s.department,
         d.name AS department_name,
         COUNT(*) AS student_count
       FROM students s
       LEFT JOIN departments d ON d.code = s.department
       WHERE s.graduation_year IS NOT NULL AND s.department IS NOT NULL
       GROUP BY s.graduation_year, s.department, d.name
       ORDER BY s.graduation_year DESC, student_count DESC`,
    );

    const highlightResult = await pool.query(
      `SELECT outer_mem.*
       FROM (
         SELECT
           s.graduation_year,
           m.id,
           m.title,
           m.content,
           m.created_at,
           (s.first_name || ' ' || s.last_name) AS author_name,
           ROW_NUMBER() OVER (PARTITION BY s.graduation_year ORDER BY m.created_at DESC) AS rank,
           (
             SELECT i.photo_url
             FROM images i
             WHERE i.entity_type = 'memory' AND i.entity_id = m.id::text
             ORDER BY i.sort_order
             LIMIT 1
           ) AS cover_image
         FROM memories m
         JOIN students s ON m.created_by = s.student_id
         WHERE s.graduation_year IS NOT NULL
       ) AS outer_mem
       WHERE outer_mem.rank = 1`,
    );

    const departmentsByYear = normalizeDepartmentsByYear(departmentResult.rows);
    const highlightsByYear = normalizeHighlightsByYear(highlightResult.rows);

    const batches = summaryResult.rows.map((row) => {
      const graduationYear = Number(row.graduation_year);
      const { entryYear, label } = deriveBatchLabel(graduationYear);
      const studentCount = Number(row.student_count) || 0;
      const memoryCount = Number(row.memory_count) || 0;
      const topDepartmentsRaw = (departmentsByYear[graduationYear] || [])
        .sort((a, b) => b.studentCount - a.studentCount)
        .slice(0, 3);

      const topDepartments = topDepartmentsRaw.map((dept) => {
        const percentage = studentCount
          ? Number(((dept.studentCount / studentCount) * 100).toFixed(1))
          : 0;
        return {
          code: dept.code,
          name: dept.name,
          studentCount: dept.studentCount,
          percentage,
        };
      });

      const highlight = highlightsByYear[graduationYear] || null;

      return {
        graduationYear,
        entryYear,
        label,
        theme: row.theme,
        studentCount,
        memoryCount,
        topDepartments,
        highlight,
        lastMemoryAt: row.last_memory_at,
      };
    });

    return res.status(200).json({
      batches,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("List Batches Error:", error);
    return res.status(500).json({ error: "Failed to load batch timeline." });
  }
};

export const getBatchDetails = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const graduationYear = Number(req.params.year);

  if (!Number.isInteger(graduationYear)) {
    return res.status(400).json({ error: "Invalid batch year." });
  }

  try {
    const summaryResult = await pool.query(
      `WITH available_years AS (
         SELECT year
         FROM yearbooks
         WHERE year IS NOT NULL
         UNION
         SELECT DISTINCT graduation_year
         FROM students
         WHERE graduation_year IS NOT NULL
       )
       SELECT
         ay.year AS graduation_year,
         y.theme,
         COUNT(DISTINCT s.student_id) AS student_count,
         COUNT(DISTINCT m.id) AS memory_count,
         MAX(m.created_at) AS last_memory_at
       FROM available_years ay
       LEFT JOIN yearbooks y ON y.year = ay.year
       LEFT JOIN students s ON s.graduation_year = ay.year
       LEFT JOIN memories m ON m.created_by = s.student_id
       WHERE ay.year = $1
       GROUP BY ay.year, y.theme`,
      [graduationYear],
    );

    if (summaryResult.rows.length === 0) {
      return res.status(404).json({ error: "Batch not found." });
    }

    const summaryRow = summaryResult.rows[0];
    const studentCount = Number(summaryRow.student_count) || 0;
    const memoryCount = Number(summaryRow.memory_count) || 0;
    const { entryYear, label } = deriveBatchLabel(graduationYear);

    const departmentBreakdownResult = await pool.query(
      `SELECT
         s.department,
         d.name AS department_name,
         COUNT(*) AS student_count
       FROM students s
       LEFT JOIN departments d ON d.code = s.department
       WHERE s.graduation_year = $1 AND s.department IS NOT NULL
       GROUP BY s.department, d.name
       ORDER BY student_count DESC`,
      [graduationYear],
    );

    const highlightResult = await pool.query(
      `SELECT
         m.id,
         m.title,
         m.content,
         m.created_at,
         (s.first_name || ' ' || s.last_name) AS author_name,
         (
           SELECT i.photo_url
           FROM images i
           WHERE i.entity_type = 'memory' AND i.entity_id = m.id::text
           ORDER BY i.sort_order
           LIMIT 1
         ) AS cover_image
       FROM memories m
       JOIN students s ON m.created_by = s.student_id
       WHERE s.graduation_year = $1
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [graduationYear],
    );

    const studentSpotlightResult = await pool.query(
      `SELECT
         student_id,
         first_name,
         last_name,
         department,
         photo_url,
         bio,
         motto
       FROM students
       WHERE graduation_year = $1
       ORDER BY updated_at DESC NULLS LAST, last_name ASC
       LIMIT 12`,
      [graduationYear],
    );

    const memorySpotlightResult = await pool.query(
      `SELECT
         m.id,
         m.title,
         m.content,
         m.created_at,
         (s.first_name || ' ' || s.last_name) AS author_name,
         (
           SELECT json_agg(
                    json_build_object(
                      'id', i.id,
                      'url', i.photo_url,
                      'sort', i.sort_order
                    )
                    ORDER BY i.sort_order
                  )
           FROM images i
           WHERE i.entity_type = 'memory' AND i.entity_id = m.id::text
         ) AS images,
         (
           SELECT json_agg(
                    json_build_object(
                      'student_id', ts.student_id,
                      'first_name', ts.first_name,
                      'last_name', ts.last_name,
                      'department', ts.department
                    )
                  )
           FROM memory_participants mp
           JOIN students ts ON mp.student_id = ts.student_id
           WHERE mp.memory_id = m.id
         ) AS tagged_students
       FROM memories m
       JOIN students s ON m.created_by = s.student_id
       WHERE s.graduation_year = $1
       ORDER BY m.created_at DESC
       LIMIT 6`,
      [graduationYear],
    );

    const albumsResult = await pool.query(
      `SELECT
         a.id,
         a.title,
         a.description,
         a.created_at,
         (s.first_name || ' ' || s.last_name) AS created_by_name
       FROM albums a
       JOIN students s ON a.created_by = s.student_id
       WHERE s.graduation_year = $1
       ORDER BY a.created_at DESC
       LIMIT 6`,
      [graduationYear],
    );

    const departmentBreakdown = mapDepartmentBreakdown(
      departmentBreakdownResult.rows,
      studentCount,
    );

    const highlightMemory = mapMemoryRow({
      ...highlightResult.rows[0],
      images: [],
      tagged_students: [],
    }) || null;

    return res.status(200).json({
      batch: {
        graduationYear,
        entryYear,
        label,
        theme: summaryRow.theme,
      },
      stats: {
        studentCount,
        memoryCount,
        topDepartments: departmentBreakdown.slice(0, 5),
        lastMemoryAt: summaryRow.last_memory_at,
      },
      highlightMemory,
      studentSpotlight: studentSpotlightResult.rows.map((row) => ({
        studentId: row.student_id,
        firstName: row.first_name,
        lastName: row.last_name,
        department: row.department,
        photoUrl: row.photo_url,
        bio: row.bio,
        motto: row.motto,
      })),
      memorySpotlight: memorySpotlightResult.rows.map((row) => mapMemoryRow(row)),
      albums: albumsResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        createdAt: row.created_at,
        createdByName: row.created_by_name,
      })),
    });
  } catch (error) {
    console.error("Batch Detail Error:", error);
    return res.status(500).json({ error: "Failed to load batch overview." });
  }
};

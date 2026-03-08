const buildStudentSummary = (student) =>
  student
    ? {
        studentId: student.student_id,
        firstName: student.first_name,
        lastName: student.last_name,
        department: student.department,
        graduationYear: student.graduation_year,
        photoUrl: student.photo_url,
      }
    : null;

export const listClubs = async (req, res) => {
  try {
    const pool = await req.app.locals.getPool();
    const clubsResult = await pool.query(
      `SELECT c.id, c.code, c.name, c.description,
              jsonb_build_object(
                'count', COUNT(cm.student_id),
                'recentMembers', COALESCE(
                  jsonb_agg(
                    jsonb_build_object(
                      'student_id', s.student_id,
                      'first_name', s.first_name,
                      'last_name', s.last_name,
                      'department', s.department,
                      'graduation_year', s.graduation_year,
                      'photo_url', s.photo_url
                    ) ORDER BY cm.joined_at DESC
                  ) FILTER (WHERE cm.student_id IS NOT NULL),
                  '[]'::jsonb
                )
              ) AS members
       FROM clubs c
       LEFT JOIN club_members cm ON cm.club_id = c.id
       LEFT JOIN students s ON cm.student_id = s.student_id
       GROUP BY c.id
       ORDER BY c.name ASC`,
    );

    res.json({ clubs: clubsResult.rows });
  } catch (error) {
    console.error("List Clubs Error:", error);
    res.status(500).json({ error: "Failed to load clubs." });
  }
};

export const joinClub = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.user;
  const { clubCode } = req.params;

  if (!clubCode) {
    return res.status(400).json({ error: "Club code is required." });
  }

  try {
    const userResult = await pool.query(
      `SELECT u.student_id, s.first_name, s.last_name, s.department, s.graduation_year, s.photo_url
       FROM users u
       LEFT JOIN students s ON u.student_id = s.student_id
       WHERE u.id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const student = userResult.rows[0];
    if (!student.student_id) {
      return res.status(400).json({ error: "Link a student profile before joining clubs." });
    }

    const clubResult = await pool.query(`SELECT id, name FROM clubs WHERE code = $1`, [clubCode]);
    if (clubResult.rows.length === 0) {
      return res.status(404).json({ error: "Club not found." });
    }

    const clubId = clubResult.rows[0].id;

    await pool.query(
      `INSERT INTO club_members (club_id, student_id)
       VALUES ($1, $2)
       ON CONFLICT (club_id, student_id) DO NOTHING`,
      [clubId, student.student_id],
    );

    const membershipResult = await pool.query(
      `SELECT COUNT(*) AS member_count FROM club_members WHERE club_id = $1`,
      [clubId],
    );

    res.status(201).json({
      message: `Joined ${clubResult.rows[0].name}.`,
      membership: {
        clubId,
        clubCode,
        memberCount: Number(membershipResult.rows[0].member_count),
        member: buildStudentSummary(student),
      },
    });
  } catch (error) {
    console.error("Join Club Error:", error);
    res.status(500).json({ error: "Failed to join club." });
  }
};

export const leaveClub = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.user;
  const { clubCode } = req.params;

  if (!clubCode) {
    return res.status(400).json({ error: "Club code is required." });
  }

  try {
    const userResult = await pool.query(`SELECT student_id FROM users WHERE id = $1`, [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const studentId = userResult.rows[0].student_id;
    if (!studentId) {
      return res.status(400).json({ error: "Link a student profile before leaving clubs." });
    }

    const clubResult = await pool.query(`SELECT id, name FROM clubs WHERE code = $1`, [clubCode]);
    if (clubResult.rows.length === 0) {
      return res.status(404).json({ error: "Club not found." });
    }

    const clubId = clubResult.rows[0].id;

    const deletionResult = await pool.query(
      `DELETE FROM club_members WHERE club_id = $1 AND student_id = $2 RETURNING club_id`,
      [clubId, studentId],
    );

    if (deletionResult.rows.length === 0) {
      return res.status(404).json({ error: "You are not a member of this club." });
    }

    const membershipResult = await pool.query(
      `SELECT COUNT(*) AS member_count FROM club_members WHERE club_id = $1`,
      [clubId],
    );

    res.json({
      message: `Left ${clubResult.rows[0].name}.`,
      membership: {
        clubId,
        clubCode,
        memberCount: Number(membershipResult.rows[0].member_count),
      },
    });
  } catch (error) {
    console.error("Leave Club Error:", error);
    res.status(500).json({ error: "Failed to leave club." });
  }
};

export const myClubs = async (req, res) => {
  try {
    const pool = await req.app.locals.getPool();
    const { userId } = req.user;

    const userResult = await pool.query(
      `SELECT student_id FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const studentId = userResult.rows[0].student_id;
    if (!studentId) {
      return res.status(400).json({ error: "Link a student profile before viewing clubs." });
    }

    const clubsResult = await pool.query(
      `SELECT c.id, c.code, c.name, c.description, cm.joined_at
       FROM club_members cm
       JOIN clubs c ON cm.club_id = c.id
       WHERE cm.student_id = $1
       ORDER BY cm.joined_at DESC`,
      [studentId],
    );

    res.json({ clubs: clubsResult.rows });
  } catch (error) {
    console.error("My Clubs Error:", error);
    res.status(500).json({ error: "Failed to load memberships." });
  }
};

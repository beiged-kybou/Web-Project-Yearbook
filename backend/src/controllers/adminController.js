export const getAdminDashboard = async (req, res) => {
  const pool = await req.app.locals.getPool();

  try {
    const [metricsResult, pendingMemoriesResult, pendingTagsResult, studentUpdatesResult] = await Promise.all([
      pool.query(
        `SELECT
           (SELECT COUNT(*) FROM users) AS total_users,
           (SELECT COUNT(*) FROM students) AS total_students,
           (SELECT COUNT(*) FROM memories) AS total_memories,
           (SELECT COUNT(*) FROM memories WHERE created_at >= NOW() - INTERVAL '7 days') AS memories_this_week,
           (SELECT COUNT(*) FROM tag_notifications WHERE status = 'pending') AS pending_tags,
           (SELECT COUNT(*) FROM memories WHERE status = 'pending') AS pending_memories`,
      ),
      pool.query(
        `SELECT m.id, m.title, m.content, m.created_at,
                s.student_id, s.first_name, s.last_name, s.department
         FROM memories m
         JOIN students s ON m.created_by = s.student_id
         WHERE m.status = 'pending'
         ORDER BY m.created_at DESC
         LIMIT 20`,
      ),
      pool.query(
        `SELECT tn.id, tn.memory_id, tn.requested_by_student_id, tn.tagged_student_id,
                tn.created_at,
                requester.first_name || ' ' || requester.last_name AS requested_by_name,
                tagged.first_name || ' ' || tagged.last_name AS tagged_student_name,
                m.title AS memory_title
         FROM tag_notifications tn
         JOIN students requester ON tn.requested_by_student_id = requester.student_id
         JOIN students tagged ON tn.tagged_student_id = tagged.student_id
         JOIN memories m ON tn.memory_id = m.id
         WHERE tn.status = 'pending'
         ORDER BY tn.created_at DESC
         LIMIT 20`,
      ),
      pool.query(
        `SELECT student_id, first_name, last_name, department, updated_at
         FROM students
         ORDER BY updated_at DESC NULLS LAST
         LIMIT 20`,
      ),
    ]);

    return res.status(200).json({
      metrics: metricsResult.rows[0] || {},
      pendingMemories: pendingMemoriesResult.rows,
      pendingTags: pendingTagsResult.rows,
      recentStudentUpdates: studentUpdatesResult.rows,
    });
  } catch (error) {
    console.error("Admin dashboard error", error);
    return res.status(500).json({ error: "Failed to load admin dashboard" });
  }
};

export const decideMemory = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { memoryId } = req.params;
  const { decision, note } = req.body;
  const allowed = new Set(["approved", "rejected"]);

  if (!allowed.has(decision)) {
    return res.status(400).json({ error: "Decision must be approved or rejected" });
  }

  try {
    await pool.query(
      `UPDATE memories
       SET status = $1, moderator_note = $2, moderated_by = $3, moderated_at = NOW()
       WHERE id = $4`,
      [decision, note || null, req.user.userId, memoryId],
    );
    return res.status(200).json({ message: "Memory status updated" });
  } catch (error) {
    console.error("Decide memory error", error);
    return res.status(500).json({ error: "Failed to update memory" });
  }
};

export const decideTag = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { tagId } = req.params;
  const { decision, note } = req.body;
  const allowed = new Set(["approved", "declined"]);

  if (!allowed.has(decision)) {
    return res.status(400).json({ error: "Decision must be approved or declined" });
  }

  try {
    await pool.query(
      `UPDATE tag_notifications
       SET status = $1, note = $2, acted_at = NOW(), acted_by_student_id = $3
       WHERE id = $4`,
      [decision, note || null, req.user.userId, tagId],
    );
    return res.status(200).json({ message: "Tag decision recorded" });
  } catch (error) {
    console.error("Decide tag error", error);
    return res.status(500).json({ error: "Failed to update tag" });
  }
};

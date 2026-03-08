export const getMyTagNotifications = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.user;

  try {
    const userResult = await pool.query(
      `SELECT student_id FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const studentId = userResult.rows[0].student_id;
    if (!studentId) {
      return res
        .status(400)
        .json({ error: "Link a student profile to receive tag notifications." });
    }

    const notificationsResult = await pool.query(
      `SELECT tn.id,
              tn.memory_id,
              tn.status,
              tn.created_at,
              tn.acted_at,
              tn.note,
              m.title        AS memory_title,
              m.content      AS memory_content,
              m.created_at   AS memory_created_at,
              requester.first_name || ' ' || requester.last_name AS requested_by_name,
              requester.student_id AS requested_by_student_id
       FROM tag_notifications tn
       JOIN memories m ON tn.memory_id = m.id
       LEFT JOIN students requester ON tn.requested_by_student_id = requester.student_id
       WHERE tn.tagged_student_id = $1
       ORDER BY tn.created_at DESC`,
      [studentId],
    );

    res.json({ notifications: notificationsResult.rows });
  } catch (error) {
    console.error("Get Tag Notifications Error:", error);
    res.status(500).json({ error: "Failed to load tag notifications." });
  }
};

export const actOnTagNotification = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.user;
  const { notificationId } = req.params;
  const decision = req.body?.decision?.toLowerCase();
  const note = req.body?.note?.trim() || null;

  if (!["approved", "declined"].includes(decision)) {
    return res.status(400).json({ error: "Decision must be approved or declined." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT student_id FROM users WHERE id = $1 FOR UPDATE`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found." });
    }

    const studentId = userResult.rows[0].student_id;
    if (!studentId) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Link a student profile before acting on tags." });
    }

    const notificationResult = await client.query(
      `SELECT *
       FROM tag_notifications
       WHERE id = $1
       FOR UPDATE`,
      [notificationId],
    );

    if (notificationResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Notification not found." });
    }

    const notification = notificationResult.rows[0];

    if (notification.tagged_student_id !== studentId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "You cannot act on this notification." });
    }

    if (notification.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Notification already resolved." });
    }

    if (decision === "approved") {
      await client.query(
        `INSERT INTO memory_participants (memory_id, student_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [notification.memory_id, studentId],
      );
    }

    await client.query(
      `UPDATE tag_notifications
       SET status = $1,
           acted_at = NOW(),
           acted_by_student_id = $2,
           note = $3
       WHERE id = $4`,
      [decision, studentId, note, notificationId],
    );

    await client.query("COMMIT");

    res.json({
      message: `Tag ${decision}.`,
      notification: {
        id: notificationId,
        decision,
        note,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Act On Tag Notification Error:", error);
    res.status(500).json({ error: "Failed to update notification." });
  } finally {
    client.release();
  }
};

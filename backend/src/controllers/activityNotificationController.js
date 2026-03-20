import notificationService from "../services/notificationService.js";

const ensureStudentContext = async (pool, userId) => {
  const result = await pool.query(
    `SELECT student_id
     FROM users
     WHERE id = $1`,
    [userId],
  );

  if (result.rows.length === 0) {
    throw new Error("USER_NOT_FOUND");
  }

  const studentId = result.rows[0].student_id;
  if (!studentId) {
    throw new Error("PROFILE_REQUIRED");
  }

  return studentId;
};

export const listActivityNotifications = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.user;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 5), 50);
  const offset = (page - 1) * limit;

  try {
    const studentId = await ensureStudentContext(pool, userId);
    const result = await notificationService.listForStudent(pool, studentId, { limit, offset });

    return res.status(200).json({
      page,
      limit,
      total: result.total,
      notifications: result.notifications,
    });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found." });
    }
    if (error.message === "PROFILE_REQUIRED") {
      return res
        .status(400)
        .json({ error: "Link your student profile to view notifications." });
    }

    console.error("List activity notifications error", error);
    return res.status(500).json({ error: "Failed to load activity notifications." });
  }
};

export const markActivityNotificationRead = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.user;
  const { notificationId } = req.params;

  try {
    const studentId = await ensureStudentContext(pool, userId);
    await notificationService.markRead(pool, studentId, notificationId);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found." });
    }
    if (error.message === "PROFILE_REQUIRED") {
      return res
        .status(400)
        .json({ error: "Link your student profile before updating notifications." });
    }

    console.error("Mark notification read error", error);
    return res.status(500).json({ error: "Failed to update notification." });
  }
};

export const markAllActivityNotificationsRead = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.user;

  try {
    const studentId = await ensureStudentContext(pool, userId);
    await notificationService.markAllRead(pool, studentId);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found." });
    }
    if (error.message === "PROFILE_REQUIRED") {
      return res
        .status(400)
        .json({ error: "Link your student profile before updating notifications." });
    }

    console.error("Mark all notifications read error", error);
    return res.status(500).json({ error: "Failed to update notifications." });
  }
};

export default {
  listActivityNotifications,
  markActivityNotificationRead,
  markAllActivityNotificationsRead,
};

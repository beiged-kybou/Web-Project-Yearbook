import TagNotification from "../models/TagNotification.js";
import Memory from "../models/Memory.js";
import User from "../models/User.js";
import Student from "../models/Student.js";

export const getMyTagNotifications = async (req, res) => {
  const { userId } = req.user;

  try {
    const user = await User.findById(userId);

    if (!user || !user.studentId) {
      return res.status(400).json({ error: "Link a student profile to receive tag notifications." });
    }

    const studentId = user.studentId;

    const notificationsResult = await TagNotification.find({ taggedStudentId: studentId })
      .sort({ created_at: -1 })
      .populate('memoryId', 'title content created_at')
      .lean();

    const requesterIds = notificationsResult.map(n => n.requestedByStudentId);
    const students = await Student.find({ studentId: { $in: requesterIds } }).lean();

    const notifications = notificationsResult.map(n => ({
      ...n,
      requestedByStudentId: students.find(s => s.studentId === n.requestedByStudentId)
    }));

    res.json({ notifications });
  } catch (error) {
    console.error("Get Tag Notifications Error:", error);
    res.status(500).json({ error: "Failed to load tag notifications." });
  }
};

export const actOnTagNotification = async (req, res) => {
  const { userId } = req.user;
  const { notificationId } = req.params;
  const decision = req.body?.decision?.toLowerCase();
  const note = req.body?.note?.trim() || null;

  if (!["approved", "declined"].includes(decision)) {
    return res.status(400).json({ error: "Decision must be approved or declined." });
  }

  try {
    const user = await User.findById(userId);

    if (!user || !user.studentId) {
       return res.status(400).json({ error: "Link a student profile before acting on tags." });
    }

    const studentId = user.studentId;
    const notification = await TagNotification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found." });
    }

    if (notification.taggedStudentId !== studentId) {
      return res.status(403).json({ error: "You cannot act on this notification." });
    }

    if (notification.status !== "pending") {
      return res.status(400).json({ error: "Notification already resolved." });
    }

    if (decision === "approved") {
      // Add participant to Memory
      await Memory.findByIdAndUpdate(
        notification.memoryId,
        { $addToSet: { participants: { studentId } } } // $addToSet prevents duplicates
      );
      
      // Update notification status
      notification.status = "approved";
    } else {
      notification.status = "declined";
    }
    notification.actedAt = new Date();
    notification.actedByStudentId = studentId;
    notification.note = note;
    await notification.save();

    res.json({
      message: `Tag ${decision}.`,
      notification: {
        id: notification._id,
        decision,
        note,
      },
    });
  } catch (error) {
    console.error("Act On Tag Notification Error:", error);
    res.status(500).json({ error: "Failed to update notification." });
  }
};

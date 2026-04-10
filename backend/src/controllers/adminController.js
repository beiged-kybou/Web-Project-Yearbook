import User from "../models/User.js";
import Student from "../models/Student.js";
import Memory from "../models/Memory.js";
import TagNotification from "../models/TagNotification.js";

export const getAdminDashboard = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      total_users,
      total_students,
      total_memories,
      memories_this_week,
      pending_tags,
      pending_memories
    ] = await Promise.all([
      User.countDocuments(),
      Student.countDocuments(),
      Memory.countDocuments(),
      Memory.countDocuments({ created_at: { $gte: sevenDaysAgo } }),
      TagNotification.countDocuments({ status: 'pending' }),
      Memory.countDocuments({ status: 'pending' })
    ]);

    const metrics = {
      total_users,
      total_students,
      total_memories,
      memories_this_week,
      pending_tags,
      pending_memories
    };

    const pendingMemoriesResult = await Memory.find({ status: 'pending' })
      .sort({ created_at: -1 })
      .limit(20)
      .populate('createdBy', 'studentId firstName lastName department');

    const pendingTagsResult = await TagNotification.find({ status: 'pending' })
      .sort({ created_at: -1 })
      .limit(20)
      .populate('requestedByStudentId', 'firstName lastName')
      .populate('taggedStudentId', 'firstName lastName')
      .populate('memoryId', 'title');

    const recentStudentUpdates = await Student.find()
      .sort({ updated_at: -1 })
      .limit(20)
      .select('studentId firstName lastName department updated_at');

    return res.status(200).json({
      metrics,
      pendingMemories: pendingMemoriesResult,
      pendingTags: pendingTagsResult,
      recentStudentUpdates,
    });
  } catch (error) {
    console.error("Admin dashboard error", error);
    return res.status(500).json({ error: "Failed to load admin dashboard" });
  }
};

export const decideMemory = async (req, res) => {
  const { memoryId } = req.params;
  const { decision, note } = req.body;
  const allowed = new Set(["approved", "rejected"]);

  if (!allowed.has(decision)) {
    return res.status(400).json({ error: "Decision must be approved or rejected" });
  }

  try {
    const memory = await Memory.findByIdAndUpdate(
       memoryId,
       { status: decision, moderatorNote: note || null, moderatedBy: req.user.userId, moderatedAt: new Date() },
       { new: true }
    );
    if (!memory) return res.status(404).json({ error: "Memory not found" });

    return res.status(200).json({ message: "Memory status updated", memory });
  } catch (error) {
    console.error("Decide memory error", error);
    return res.status(500).json({ error: "Failed to update memory" });
  }
};

export const decideTag = async (req, res) => {
  const { tagId } = req.params;
  const { decision, note } = req.body;
  const allowed = new Set(["approved", "declined"]);

  if (!allowed.has(decision)) {
    return res.status(400).json({ error: "Decision must be approved or declined" });
  }

  try {
    const tag = await TagNotification.findByIdAndUpdate(
       tagId,
       { status: decision, note: note || null, actedAt: new Date(), actedByStudentId: req.user?.studentId }, // Assumes middleware sets req.user.studentId
       { new: true }
    );
    
    if (!tag) return res.status(404).json({ error: "Tag not found" });

    return res.status(200).json({ message: "Tag decision recorded", tag });
  } catch (error) {
    console.error("Decide tag error", error);
    return res.status(500).json({ error: "Failed to update tag" });
  }
};

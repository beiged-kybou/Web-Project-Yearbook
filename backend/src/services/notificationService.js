import ActivityNotification from "../models/ActivityNotification.js";
import Memory from "../models/Memory.js";

const NOTIFICATION_TYPES = {
  REACTION: "reaction",
  COMMENT: "comment",
  MEMORY: "memory",
};

const buildActorSnapshot = (student) => {
  if (!student) {
    return null;
  }
  return {
    studentId: student.studentId || student.student_id,
    firstName: student.firstName || student.first_name,
    lastName: student.lastName || student.last_name,
    photoUrl: student.photoUrl || student.photo_url,
  };
};

const buildMemorySnapshot = (memory) => {
  if (!memory) {
    return null;
  }
  return {
    memoryId: memory._id || memory.id,
    title: memory.title,
    createdBy: memory.createdBy || memory.created_by,
  };
};

const createNotification = async ({ recipientId, actorId, memoryId, type, payload = {} }) => {
  if (!recipientId || recipientId === actorId) {
    return null;
  }

  if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
    throw new Error("INVALID_NOTIFICATION_TYPE");
  }

  await ActivityNotification.findOneAndUpdate(
    {
      studentId: recipientId,
      actorStudentId: actorId || null,
      memoryId: memoryId || null,
      notificationType: type
    },
    {
      $set: {
        payload,
      },
      $setOnInsert: { isRead: false }
    },
    { upsert: true }
  );
};

const notificationService = {
  NOTIFICATION_TYPES,

  async notifyMemoryCreator({ memory, actor, type, extraPayload = {} }) {
    if (!memory?.createdBy && !memory?.created_by) {
      return;
    }

    await createNotification({
      recipientId: memory.createdBy || memory.created_by,
      actorId: actor?.studentId || actor?.student_id,
      memoryId: memory._id || memory.id,
      type,
      payload: {
        actor: buildActorSnapshot(actor),
        memory: buildMemorySnapshot(memory),
        ...extraPayload,
      },
    });
  },

  async notifyParticipants({ memoryId, actor, type, extraPayload = {} }) {
    if (!memoryId) {
      return;
    }

    const memory = await Memory.findById(memoryId).populate('participants');
    if (!memory) return;

    const actorId = actor?.studentId || actor?.student_id;
    const participants = memory.participants || [];
    
    // Notify all participants except the actor
    const participantsToNotify = participants.filter(p => p.studentId !== actorId);

    await Promise.all(
      participantsToNotify.map((participant) =>
        createNotification({
          recipientId: participant.studentId,
          actorId,
          memoryId,
          type,
          payload: {
            actor: buildActorSnapshot(actor),
            memory: buildMemorySnapshot(memory),
            ...extraPayload,
          },
        })
      )
    );
  },

  async listForStudent(studentId, { limit = 20, offset = 0 } = {}) {
    if (!studentId) {
      return { notifications: [], total: 0 };
    }

    const [notifications, total] = await Promise.all([
      ActivityNotification.find({ studentId })
        .sort({ created_at: -1 })
        .limit(limit)
        .skip(offset),
      ActivityNotification.countDocuments({ studentId })
    ]);

    return {
      notifications: notifications.map(notif => ({
        id: notif._id,
        actorStudentId: notif.actorStudentId,
        memoryId: notif.memoryId,
        type: notif.notificationType,
        payload: notif.payload,
        isRead: notif.isRead,
        createdAt: notif.created_at
      })),
      total
    };
  },

  async markRead(studentId, notificationId) {
    if (!studentId || !notificationId) {
      return;
    }
    await ActivityNotification.findOneAndUpdate(
      { _id: notificationId, studentId },
      { $set: { isRead: true } }
    );
  },

  async markAllRead(studentId) {
    if (!studentId) {
      return;
    }
    await ActivityNotification.updateMany(
      { studentId, isRead: false },
      { $set: { isRead: true } }
    );
  },
};

export { notificationService as default, NOTIFICATION_TYPES };

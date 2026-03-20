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
    studentId: student.student_id,
    firstName: student.first_name,
    lastName: student.last_name,
    photoUrl: student.photo_url,
  };
};

const buildMemorySnapshot = (memory) => {
  if (!memory) {
    return null;
  }

  return {
    memoryId: memory.id,
    title: memory.title,
    createdBy: memory.created_by,
  };
};

const createNotification = async (pool, { recipientId, actorId, memoryId, type, payload = {} }) => {
  if (!recipientId || recipientId === actorId) {
    return null;
  }

  if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
    throw new Error("INVALID_NOTIFICATION_TYPE");
  }

  await pool.query(
    `INSERT INTO activity_notifications (student_id, actor_student_id, memory_id, notification_type, payload)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (notification_type, memory_id, actor_student_id)
     DO UPDATE SET
       payload = EXCLUDED.payload,
       created_at = NOW(),
       is_read = FALSE`,
    [recipientId, actorId || null, memoryId || null, type, payload],
  );
};

const notificationService = {
  NOTIFICATION_TYPES,

  async notifyMemoryCreator(pool, { memory, actor, type, extraPayload = {} }) {
    if (!memory?.created_by) {
      return;
    }

    await createNotification(pool, {
      recipientId: memory.created_by,
      actorId: actor?.student_id,
      memoryId: memory.id,
      type,
      payload: {
        actor: buildActorSnapshot(actor),
        memory: buildMemorySnapshot(memory),
        ...extraPayload,
      },
    });
  },

  async notifyParticipants(pool, { memoryId, actor, type, extraPayload = {} }) {
    if (!memoryId) {
      return;
    }

    const participantsResult = await pool.query(
      `SELECT DISTINCT student_id
       FROM memory_participants
       WHERE memory_id = $1 AND student_id <> $2`,
      [memoryId, actor?.student_id || null],
    );

    if (participantsResult.rows.length === 0) {
      return;
    }

    const memoryResult = await pool.query(
      `SELECT id, title, created_by
       FROM memories
       WHERE id = $1`,
      [memoryId],
    );

    const memory = memoryResult.rows[0] || null;

    await Promise.all(
      participantsResult.rows.map((participant) =>
        createNotification(pool, {
          recipientId: participant.student_id,
          actorId: actor?.student_id,
          memoryId,
          type,
          payload: {
            actor: buildActorSnapshot(actor),
            memory: buildMemorySnapshot(memory),
            ...extraPayload,
          },
        }),
      ),
    );
  },

  async listForStudent(pool, studentId, { limit = 20, offset = 0 } = {}) {
    if (!studentId) {
      return { notifications: [], total: 0 };
    }

    const result = await pool.query(
      `SELECT id, actor_student_id, memory_id, notification_type, payload, is_read, created_at
       FROM activity_notifications
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [studentId, limit, offset],
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM activity_notifications
       WHERE student_id = $1`,
      [studentId],
    );

    return {
      notifications: result.rows.map((row) => ({
        id: row.id,
        actorStudentId: row.actor_student_id,
        memoryId: row.memory_id,
        type: row.notification_type,
        payload: row.payload,
        isRead: row.is_read,
        createdAt: row.created_at,
      })),
      total: countResult.rows[0]?.total || 0,
    };
  },

  async markRead(pool, studentId, notificationId) {
    if (!studentId || !notificationId) {
      return;
    }

    await pool.query(
      `UPDATE activity_notifications
       SET is_read = TRUE
       WHERE id = $1 AND student_id = $2`,
      [notificationId, studentId],
    );
  },

  async markAllRead(pool, studentId) {
    if (!studentId) {
      return;
    }

    await pool.query(
      `UPDATE activity_notifications
       SET is_read = TRUE
       WHERE student_id = $1 AND is_read = FALSE`,
      [studentId],
    );
  },
};

export { notificationService as default, NOTIFICATION_TYPES };

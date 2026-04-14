import mongoose from 'mongoose';

const activityNotificationSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  actorStudentId: { type: String },
  memoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Memory' },
  notificationType: { 
    type: String, 
    required: true, 
    enum: ['reaction', 'comment', 'memory'] 
  },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

activityNotificationSchema.index({ studentId: 1, isRead: 1, created_at: -1 });

export default mongoose.model('ActivityNotification', activityNotificationSchema);

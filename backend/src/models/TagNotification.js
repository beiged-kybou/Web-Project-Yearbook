import mongoose from 'mongoose';

const tagNotificationSchema = new mongoose.Schema({
  memoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Memory', required: true },
  taggedStudentId: { type: String, required: true, ref: 'Student' },
  requestedByStudentId: { type: String, required: true, ref: 'Student' },
  actedByStudentId: { type: String, ref: 'Student' },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending' 
  },
  note: { type: String },
  actedAt: { type: Date }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

tagNotificationSchema.index({ memoryId: 1, taggedStudentId: 1 }, { unique: true });

export default mongoose.model('TagNotification', tagNotificationSchema);

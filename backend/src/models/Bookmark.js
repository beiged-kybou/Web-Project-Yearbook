import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entityType: { 
    type: String, 
    required: true, 
    enum: ['memory', 'event', 'event_post'] 
  },
  entityId: { type: String, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

bookmarkSchema.index({ userId: 1, entityType: 1, entityId: 1 }, { unique: true });

export default mongoose.model('Bookmark', bookmarkSchema);

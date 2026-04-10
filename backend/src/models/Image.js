import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  entityType: { 
    type: String, 
    required: true, 
    enum: ['student', 'memory', 'event_post', 'yearbook_page'] 
  },
  entityId: { type: String, required: true },
  photoUrl: { type: String, required: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'uploaded_at', updatedAt: false } });

imageSchema.index({ entityType: 1, entityId: 1, sortOrder: 1 }, { unique: true });

export default mongoose.model('Image', imageSchema);

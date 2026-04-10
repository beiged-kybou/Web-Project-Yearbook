import mongoose from 'mongoose';

const yearbookPagePostSchema = new mongoose.Schema({
  pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'YearbookPage', required: true },
  entityType: { 
    type: String, 
    required: true, 
    enum: ['memory', 'event_post'] 
  },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Not strongly typed to a single ref since it can be polymorphic
  snapshot: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: { createdAt: 'added_at', updatedAt: false } });

yearbookPagePostSchema.index({ pageId: 1, entityType: 1, entityId: 1 }, { unique: true });

export default mongoose.model('YearbookPagePost', yearbookPagePostSchema);

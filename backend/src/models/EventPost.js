import mongoose from 'mongoose';

const eventPostSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  title: { type: String, required: true },
  body: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

eventPostSchema.index({ eventId: 1, created_at: -1 });

export default mongoose.model('EventPost', eventPostSchema);

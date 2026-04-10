import mongoose from 'mongoose';

const eventSubscriptionSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

eventSubscriptionSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export default mongoose.model('EventSubscription', eventSubscriptionSchema);

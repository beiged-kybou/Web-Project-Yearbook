import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  coverPhotoUrl: { type: String },
  scope: {
    type: String,
    required: true,
    enum: ['global', 'department', 'club'],
    default: 'global'
  },
  scopeRef: { type: String }, // e.g. club code or department code
  startTime: { type: Date },
  endTime: { type: Date },
  location: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

eventSchema.index({ scope: 1, scopeRef: 1 });

export default mongoose.model('Event', eventSchema);

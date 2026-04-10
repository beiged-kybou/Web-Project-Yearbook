import mongoose from 'mongoose';

const yearbookReleaseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  year: { type: Number, required: true },
  theme: { type: String },
  coverPhotoUrl: { type: String },
  introText: { type: String },
  status: { 
    type: String, 
    required: true, 
    enum: ['draft', 'collecting', 'final', 'published'],
    default: 'draft' 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedAt: { type: Date }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

yearbookReleaseSchema.index({ status: 1, year: -1 });

export default mongoose.model('YearbookRelease', yearbookReleaseSchema);

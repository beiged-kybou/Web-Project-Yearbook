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
    enum: ['personal', 'draft', 'collecting', 'final', 'published'],
    default: 'draft' 
  },
  privacy: { 
    type: String, 
    enum: ['batch', 'department', 'club', 'public', 'personal'],
    default: 'public'
  },
  clubCode: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentId: { type: String }, // link to student creator
  publishedAt: { type: Date }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

yearbookReleaseSchema.index({ status: 1, year: -1 });

export default mongoose.model('YearbookRelease', yearbookReleaseSchema);

import mongoose from 'mongoose';

const digitalYearbookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  coverImageUrl: { type: String },
  privacyType: { 
    type: String, 
    enum: ['department', 'batch', 'club'], 
    required: true 
  },
  targetId: { type: String, required: true }, // Dept Code, Batch Year, or Club Code
  pages: [{
    memoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Memory' },
    layoutType: { type: String, default: 'collage' }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publishedAt: { type: Date, default: null },
  isPublished: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('DigitalYearbook', digitalYearbookSchema);

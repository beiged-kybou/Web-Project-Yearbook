import mongoose from 'mongoose';

const yearbookPageSchema = new mongoose.Schema({
  releaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'YearbookRelease', required: true },
  pageNumber: { type: Number, required: true },
  ownerType: { 
    type: String, 
    required: true, 
    enum: ['department', 'club', 'individual', 'admin'] 
  },
  ownerRef: { type: String },
  assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String },
  layout: { type: mongoose.Schema.Types.Mixed, default: {} },
  content: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { 
    type: String, 
    required: true, 
    enum: ['draft', 'submitted', 'approved'],
    default: 'draft' 
  },
  submittedAt: { type: Date },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

yearbookPageSchema.index({ releaseId: 1, pageNumber: 1 }, { unique: true });

export default mongoose.model('YearbookPage', yearbookPageSchema);

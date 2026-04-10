import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema({
  studentId: { type: String, required: true, ref: 'Student' },
  reactionType: { type: String, default: 'love' }
}, { timestamps: { createdAt: 'created_at', updatedAt: false }, _id: false });

const commentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, ref: 'Student' },
  body: { type: String, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const participantSchema = new mongoose.Schema({
  studentId: { type: String, required: true, ref: 'Student' }
}, { _id: false });

const memorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String },
  createdBy: { type: String, ref: 'Student' }, // student_id
  albumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Album' },
  status: { 
    type: String, 
    required: true, 
    enum: ['draft', 'pending', 'approved', 'rejected'],
    default: 'pending'
  },
  moderatorNote: { type: String },
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  moderatedAt: { type: Date },
  participants: [participantSchema],
  reactions: [reactionSchema],
  comments: [commentSchema]
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

memorySchema.index({ created_at: -1 });

export default mongoose.model('Memory', memorySchema);

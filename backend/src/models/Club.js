import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  studentId: { type: String, required: true, ref: 'Student' } // uses custom string id
}, { timestamps: { createdAt: 'joinedAt', updatedAt: false }, _id: false });

const clubSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  members: [participantSchema]
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export default mongoose.model('Club', clubSchema);

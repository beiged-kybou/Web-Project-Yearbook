import mongoose from 'mongoose';

const albumSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    required: true, 
    enum: ['personal', 'group', 'batch', 'department'] 
  },
  createdBy: { type: String, ref: 'Student' } // student_id
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export default mongoose.model('Album', albumSchema);

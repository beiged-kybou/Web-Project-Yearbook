import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { 
    type: String, 
    unique: true, 
    match: [/^[A-Za-z0-9._%+-]+@iut-dhaka\.edu$/i, 'Please fill a valid IUT email address']
  },
  phone: { type: String },
  department: { type: String, ref: 'Department' },
  photoUrl: { type: String },
  bio: { type: String },
  motto: { type: String },
  graduationYear: { type: Number, required: true, ref: 'Yearbook' },
  passwordHash: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

studentSchema.index({ graduationYear: 1 });
studentSchema.index({ firstName: 1, lastName: 1 });

export default mongoose.model('Student', studentSchema);

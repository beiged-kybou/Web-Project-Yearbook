import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleSub: { type: String, unique: true, sparse: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    match: [/^[A-Za-z0-9._%+-]+@iut-dhaka\.edu$/i, 'Please fill a valid IUT email address']
  },
  passwordHash: { type: String },
  displayName: { type: String },
  avatarUrl: { type: String },
  role: { 
    type: String, 
    required: true, 
    enum: ['student', 'teacher', 'staff', 'admin'],
    default: 'student'
  },
  lastLogin: { type: Date },
  studentId: { type: String, ref: 'Student' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });



export default mongoose.model('User', userSchema);

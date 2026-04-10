import mongoose from 'mongoose';

const otpVerificationSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    match: [/^[A-Za-z0-9._%+-]+@iut-dhaka\.edu$/i, 'Please fill a valid IUT email address']
  },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export default mongoose.model('OtpVerification', otpVerificationSchema);

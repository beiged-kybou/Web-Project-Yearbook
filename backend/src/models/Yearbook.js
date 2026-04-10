import mongoose from 'mongoose';

const yearbookSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  theme: { type: String, default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export default mongoose.model('Yearbook', yearbookSchema);

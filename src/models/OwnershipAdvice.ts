import mongoose from 'mongoose';

const OwnershipAdviceSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  engine: { type: String, default: 'Unknown' },
  quirks: { type: String, required: true },
  maintenance: { type: String, required: true },
  last_updated: { type: Date, default: Date.now }
});

OwnershipAdviceSchema.index({ year: 1, make: 1, model: 1, engine: 1 }, { unique: true });

const OwnershipAdvice = mongoose.models.OwnershipAdvice || mongoose.model('OwnershipAdvice', OwnershipAdviceSchema);

export default OwnershipAdvice;

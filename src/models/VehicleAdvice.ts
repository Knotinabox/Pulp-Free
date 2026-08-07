import mongoose from 'mongoose';

const VehicleAdviceSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  engine: { type: String, default: 'Unknown' },
  score: { type: Number, required: true },
  defect: { type: String, required: true },
  advice: { type: String, required: true },
  has_deep_dive: { type: Boolean, default: false },
  deep_dive_maintenance: { type: String },
  deep_dive_recalls: { type: String },
  deep_dive_resale: { type: String },
  deep_dive_competitors: { type: String },
  last_updated: { type: Date, default: Date.now }
});

// Create a compound unique index for fast lookups
VehicleAdviceSchema.index({ year: 1, make: 1, model: 1, engine: 1 }, { unique: true });

// Prevent mongoose from compiling the model multiple times in serverless environments
const VehicleAdvice = mongoose.models.VehicleAdvice || mongoose.model('VehicleAdvice', VehicleAdviceSchema);

export default VehicleAdvice;

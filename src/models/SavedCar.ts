import mongoose, { Schema, Model } from 'mongoose';

export interface ISavedCar {
  userId: mongoose.Types.ObjectId;
  vin: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage: number;
  location: string;
  image: string;
  url: string;
  score?: number; // Pre-fetched pulp score
  createdAt: Date;
}

const SavedCarSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  vin: {
    type: String,
    required: true,
  },
  year: { type: Number, required: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  price: { type: Number, required: true },
  mileage: { type: Number, required: true },
  location: { type: String, required: true },
  image: { type: String, required: false },
  url: { type: String, required: false },
  score: { type: Number, required: false },
}, {
  timestamps: true,
});

// Ensure a user can only save a specific VIN once
SavedCarSchema.index({ userId: 1, vin: 1 }, { unique: true });

export const SavedCar: Model<ISavedCar> = mongoose.models.SavedCar || mongoose.model<ISavedCar>('SavedCar', SavedCarSchema);
export default SavedCar;

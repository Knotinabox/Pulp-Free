import mongoose, { Schema, Model } from 'mongoose';

export interface IFuelLog {
  vehicleId: mongoose.Types.ObjectId;
  odometer: number;
  fuelLiters: number;
  totalCost?: number;
  isFullTank: boolean;
  loggedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FuelLogSchema: Schema = new Schema({
  vehicleId: {
    type: Schema.Types.ObjectId,
    ref: 'SavedCar',
    required: true,
  },
  odometer: {
    type: Number,
    required: true,
  },
  fuelLiters: {
    type: Number,
    required: true,
  },
  totalCost: {
    type: Number,
    required: false,
  },
  isFullTank: {
    type: Boolean,
    default: true,
  },
  loggedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

export const FuelLog: Model<IFuelLog> = mongoose.models.FuelLog || mongoose.model<IFuelLog>('FuelLog', FuelLogSchema);
export default FuelLog;

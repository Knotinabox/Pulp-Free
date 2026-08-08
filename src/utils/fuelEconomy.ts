import { IFuelLog } from '@/models/FuelLog';

export interface FuelEconomyResult {
  distanceDriven: number;
  fuelEconomyL100km: number;
  costPerKm: number | null;
}

/**
 * Calculates fuel economy based on current and previous fuel logs.
 * Assumes odometer is in kilometers and fuel is in liters.
 * 
 * @param currentLog The most recent fuel log
 * @param previousLog The preceding fuel log
 * @returns Fuel economy calculations
 */
export function calculateFuelEconomy(currentLog: IFuelLog, previousLog: IFuelLog): FuelEconomyResult {
  const distanceDriven = currentLog.odometer - previousLog.odometer;

  if (distanceDriven <= 0) {
    return {
      distanceDriven: 0,
      fuelEconomyL100km: 0,
      costPerKm: 0,
    };
  }

  // L/100km = (Liters / distance) * 100
  const fuelEconomyL100km = (currentLog.fuelLiters / distanceDriven) * 100;

  // Cost per km
  let costPerKm = null;
  if (currentLog.totalCost) {
    costPerKm = currentLog.totalCost / distanceDriven;
  }

  return {
    distanceDriven,
    fuelEconomyL100km,
    costPerKm,
  };
}

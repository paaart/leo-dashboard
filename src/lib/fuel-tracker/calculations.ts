import type { FuelEntryCalculations } from "./types";

export function calculateFuelEntryValues(params: {
  currentOdometer: number;
  previousOdometer: number;
  fuelAmount: number;
  fuelLiters: number;
}): FuelEntryCalculations {
  const kmDriven = params.currentOdometer - params.previousOdometer;
  const warningFlag = kmDriven <= 0;

  return {
    previous_odometer_reading: params.previousOdometer,
    km_driven: kmDriven,
    approx_mileage: warningFlag ? null : kmDriven / params.fuelLiters,
    fuel_rate: params.fuelAmount / params.fuelLiters,
    cost_per_km: warningFlag ? null : params.fuelAmount / kmDriven,
    warning_flag: warningFlag,
    warning_reason: warningFlag
      ? "Current odometer reading is not greater than previous odometer reading"
      : null,
  };
}

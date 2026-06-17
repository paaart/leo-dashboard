import type { FuelEntryCalculations } from "./types";

export function calculateFuelEntryValues(params: {
  currentOdometer: number;
  previousOdometer: number;
  fuelAmount: number;
  fuelLiters: number;
  allowBaselineEqual?: boolean;
}): FuelEntryCalculations {
  const kmDriven = params.currentOdometer - params.previousOdometer;
  const warningFlag = params.allowBaselineEqual ? kmDriven < 0 : kmDriven <= 0;
  const hasDistance = kmDriven > 0;

  return {
    previous_odometer_reading: params.previousOdometer,
    km_driven: kmDriven,
    approx_mileage: hasDistance && !warningFlag ? kmDriven / params.fuelLiters : null,
    fuel_rate: params.fuelAmount / params.fuelLiters,
    cost_per_km: hasDistance && !warningFlag ? params.fuelAmount / kmDriven : null,
    warning_flag: warningFlag,
    warning_reason: warningFlag
      ? "Current odometer reading is not greater than previous odometer reading"
      : null,
  };
}

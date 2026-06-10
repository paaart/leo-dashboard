export type VehicleStatus = "active" | "inactive";

export type Vehicle = {
  id: string;
  vehicle_no: string;
  vehicle_type: string;
  assigned_driver: string | null;
  starting_odometer: number;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
};

export type FuelEntry = {
  id: string;
  vehicle_id: string;
  driver_name: string | null;
  driver_mobile: string | null;
  fuel_date: string;
  fuel_amount: number;
  fuel_liters: number;
  odometer_reading: number;
  previous_odometer_reading: number | null;
  km_driven: number | null;
  approx_mileage: number | null;
  fuel_rate: number | null;
  cost_per_km: number | null;
  bill_image_path: string | null;
  meter_image_path: string | null;
  remarks: string | null;
  warning_flag: boolean;
  warning_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateVehicleInput = {
  vehicle_no?: string;
  vehicleNo?: string;
  vehicle_type?: string;
  vehicleType?: string;
  assigned_driver?: string | null;
  assignedDriver?: string | null;
  starting_odometer?: number | string | null;
  startingOdometer?: number | string | null;
  status?: VehicleStatus;
};

export type CreateFuelEntryInput = {
  vehicle_id?: string;
  vehicleId?: string;
  fuel_date?: string;
  fuelDate?: string;
  fuel_amount?: number | string;
  fuelAmount?: number | string;
  fuel_liters?: number | string;
  fuelLiters?: number | string;
  odometer_reading?: number | string;
  odometerReading?: number | string;
  driver_name?: string | null;
  driverName?: string | null;
  driver_mobile?: string | null;
  driverMobile?: string | null;
  bill_image_path?: string | null;
  billImagePath?: string | null;
  meter_image_path?: string | null;
  meterImagePath?: string | null;
  remarks?: string | null;
};

export type FuelDashboardSummary = {
  vehicleId: string;
  vehicleNo: string;
  totalKm: number;
  totalFuelAmount: number;
  totalFuelLiters: number;
  averageMileage: number | null;
  averageCostPerKm: number | null;
  lastFuelDate: string | null;
  lastOdometerReading: number | null;
};

export type FuelDeviationStatus = "good" | "normal" | "low" | "none";

export type FuelAnalyticsSummary = {
  totalFuelSpend: number;
  totalFuelLiters: number;
  totalKmDriven: number;
  averageMileage: number | null;
  averageCostPerKm: number | null;
  warningEntries: number;
};

export type FuelAnalyticsVehicleRow = {
  vehicleId: string;
  vehicleNo: string;
  totalKm: number;
  totalLiters: number;
  totalFuelAmount: number;
  averageMileage: number | null;
  costPerKm: number | null;
  warningCount: number;
  lastFuelDate: string | null;
  lastOdometer: number | null;
  deviationStatus: FuelDeviationStatus;
};

export type FuelAnalyticsInsight = {
  vehicleId: string | null;
  vehicleNo: string | null;
  value: number | null;
};

export type FuelAnalyticsInsights = {
  bestMileageVehicle: FuelAnalyticsInsight;
  lowestMileageVehicle: FuelAnalyticsInsight;
  highestFuelSpendVehicle: FuelAnalyticsInsight;
  mostWarningEntriesVehicle: FuelAnalyticsInsight;
};

export type FuelAnalyticsMonthlyRow = {
  month: string;
  totalFuelAmount: number;
  totalLiters: number;
  totalKm: number;
  averageMileage: number | null;
  costPerKm: number | null;
};

export type FuelAnalyticsFilters = {
  vehicleId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export type FuelDashboardAnalytics = {
  summary: FuelAnalyticsSummary;
  vehicles: FuelAnalyticsVehicleRow[];
  insights: FuelAnalyticsInsights;
  monthlyBreakdown: FuelAnalyticsMonthlyRow[];
};

export type FuelEntryCalculations = {
  previous_odometer_reading: number;
  km_driven: number;
  approx_mileage: number | null;
  fuel_rate: number;
  cost_per_km: number | null;
  warning_flag: boolean;
  warning_reason: string | null;
};

export type CreateVehiclePayload = {
  vehicleNo: string;
  vehicleType: string;
  assignedDriver: string | null;
  startingOdometer: number;
  status: VehicleStatus;
};

export type CreateFuelEntryPayload = {
  vehicleId: string;
  fuelDate: string;
  fuelAmount: number;
  fuelLiters: number;
  odometerReading: number;
  driverName: string | null;
  driverMobile: string | null;
  billImagePath: string | null;
  meterImagePath: string | null;
  remarks: string | null;
};

export type FuelTab = "dashboard" | "vehicles" | "fuel-entries";

export type FuelApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

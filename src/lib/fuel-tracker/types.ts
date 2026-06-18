export type VehicleStatus = "active" | "inactive";

export type Vehicle = {
  id: string;
  vehicle_no: string;
  vehicle_type: string;
  company: string | null;
  starting_odometer: number;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
};

export type FuelEntry = {
  id: string;
  vehicle_id: string;
  company: string | null;
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
  company?: string | null;
  starting_odometer?: number | string | null;
  startingOdometer?: number | string | null;
  status?: VehicleStatus;
};

export type UpdateVehicleInput = CreateVehicleInput;

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

export type VehicleExpenseStatus = "paid" | "pending";

export type VehicleExpenseType =
  | "Repair"
  | "Part Purchase"
  | "Tax"
  | "Insurance"
  | "Service"
  | "Permit"
  | "Tyres"
  | "Battery"
  | "Other"
  | (string & {});

export type VehicleExpense = {
  id: string;
  expense_date: string;
  vehicle_id: string | null;
  expense_type: VehicleExpenseType;
  description: string | null;
  amount: number;
  vendor: string | null;
  invoice_reference: string | null;
  city: string | null;
  payment_mode: string | null;
  company: string | null;
  status: VehicleExpenseStatus;
  paid_at: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateVehicleExpenseInput = {
  expense_date?: string;
  expenseDate?: string;
  expense_scope?: "vehicle" | "general";
  expenseScope?: "vehicle" | "general";
  vehicle_id?: string | null;
  vehicleId?: string | null;
  expense_type?: string;
  expenseType?: string;
  description?: string | null;
  amount?: number | string;
  vendor?: string | null;
  invoice_reference?: string | null;
  invoiceReference?: string | null;
  city?: string | null;
  payment_mode?: string | null;
  paymentMode?: string | null;
  company?: string | null;
  status?: string;
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

export type FuelDeviationStatus = "good" | "low" | "none";

export type FuelAnalyticsSummary = {
  totalFuelSpend: number;
  totalOtherExpenses: number;
  totalVehicleOperatingCost: number;
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
  company: string | null;
  startingOdometer: number;
  status: VehicleStatus;
};

export type UpdateVehiclePayload = Partial<CreateVehiclePayload>;

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

export type CreateVehicleExpensePayload = {
  expenseDate: string;
  expenseScope: "vehicle" | "general";
  vehicleId: string | null;
  expenseType: string;
  description: string | null;
  amount: number;
  vendor: string | null;
  invoiceReference: string | null;
  city: string | null;
  paymentMode: string | null;
  company: string | null;
  status: VehicleExpenseStatus;
};

export type VehicleExpensePaymentItem = {
  id: string;
  payment_id: string;
  expense_id: string;
  expense_date: string;
  vehicle_id: string | null;
  vehicle_no: string | null;
  expense_type: VehicleExpenseType;
  description: string | null;
  amount: number;
  vendor: string | null;
  created_at: string;
};

export type VehicleExpensePayment = {
  id: string;
  payment_date: string;
  payment_mode: string | null;
  reference_number: string | null;
  remarks: string | null;
  total_amount: number;
  expense_count: number;
  created_at: string;
  updated_at: string;
  items: VehicleExpensePaymentItem[];
};

export type CreateVehicleExpensePaymentPayload = {
  paymentDate: string;
  paymentMode: string | null;
  referenceNumber: string | null;
  remarks: string | null;
  expenseIds: string[];
};

export type FuelTab =
  | "dashboard"
  | "vehicles"
  | "fuel-entries"
  | "other-expenses"
  | "paid-expenses";

export type FuelApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

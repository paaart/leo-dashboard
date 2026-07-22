export type VehicleStatus = "active" | "inactive";

export type VehicleRenewalType =
  | "national_permit"
  | "insurance"
  | "road_tax";

export type Vehicle = {
  id: string;
  vehicle_no: string;
  vehicle_type: string;
  company: string | null;
  starting_odometer: number;
  status: VehicleStatus;
  national_permit_renewal_date: string | null;
  national_permit_renewal_amount: number | null;
  national_permit_renewal_vendor: string | null;
  insurance_renewal_date: string | null;
  insurance_renewal_amount: number | null;
  insurance_renewal_vendor: string | null;
  road_tax_renewal_date: string | null;
  road_tax_renewal_amount: number | null;
  road_tax_renewal_vendor: string | null;
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
  national_permit_renewal_date?: string | null;
  nationalPermitRenewalDate?: string | null;
  national_permit_renewal_amount?: number | string | null;
  nationalPermitRenewalAmount?: number | string | null;
  national_permit_renewal_vendor?: string | null;
  nationalPermitRenewalVendor?: string | null;
  insurance_renewal_date?: string | null;
  insuranceRenewalDate?: string | null;
  insurance_renewal_amount?: number | string | null;
  insuranceRenewalAmount?: number | string | null;
  insurance_renewal_vendor?: string | null;
  insuranceRenewalVendor?: string | null;
  road_tax_renewal_date?: string | null;
  roadTaxRenewalDate?: string | null;
  road_tax_renewal_amount?: number | string | null;
  roadTaxRenewalAmount?: number | string | null;
  road_tax_renewal_vendor?: string | null;
  roadTaxRenewalVendor?: string | null;
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

export type UpdateFuelEntryInput = CreateFuelEntryInput;

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

export type UpdateVehicleExpenseInput = CreateVehicleExpenseInput;

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
  nationalPermitRenewalDate: string | null;
  nationalPermitRenewalAmount: number | null;
  nationalPermitRenewalVendor: string | null;
  insuranceRenewalDate: string | null;
  insuranceRenewalAmount: number | null;
  insuranceRenewalVendor: string | null;
  roadTaxRenewalDate: string | null;
  roadTaxRenewalAmount: number | null;
  roadTaxRenewalVendor: string | null;
};

export type UpdateVehiclePayload = Partial<CreateVehiclePayload>;

export type VehicleRenewalAlert = {
  vehicleId: string;
  vehicleNo: string;
  vehicleType: string;
  company: string | null;
  renewalType: VehicleRenewalType;
  renewalLabel: string;
  renewalDate: string;
  renewalAmount: number | null;
  renewalVendor: string | null;
  daysUntilRenewal: number;
  status: "overdue" | "due_soon" | "due_today";
};

export type DismissVehicleRenewalAlertPayload = {
  vehicleId: string;
  renewalType: VehicleRenewalType;
  renewalDate: string;
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

export type UpdateFuelEntryPayload = CreateFuelEntryPayload;

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

export type UpdateVehicleExpensePayload = CreateVehicleExpensePayload;

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

export type VehicleExpenseInvoiceStatus =
  | "unpaid"
  | "partially_paid"
  | "paid";

export type VehicleExpenseInvoiceItem = {
  id: string;
  invoice_id: string;
  vehicle_id: string | null;
  vehicle_no: string | null;
  vehicles: {
    id: string;
    vehicle_no: string;
    vehicle_type: string;
  }[];
  expense_type: string;
  description: string | null;
  amount: number;
  created_at: string;
};

export type VehicleExpenseInvoicePayment = {
  id: string;
  payment_batch_id: string;
  invoice_id: string;
  vendor_name: string;
  payment_date: string;
  amount: number;
  payment_mode: string | null;
  reference_number: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
};

export type VehicleExpenseInvoice = {
  id: string;
  vendor_name: string;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: VehicleExpenseInvoiceStatus;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items: VehicleExpenseInvoiceItem[];
  payments: VehicleExpenseInvoicePayment[];
};

export type VehicleExpenseInvoiceAnalytics = {
  invoiceCount: number;
  invoiceTotal: number;
  paidInvoiceCount: number;
  paidAmount: number;
  unpaidInvoiceCount: number;
  unpaidAmount: number;
  partiallyPaidInvoiceCount: number;
  partiallyPaidOutstanding: number;
  outstandingAmount: number;
  paymentBatchCount: number;
  paymentTotal: number;
  latestPaymentDate: string | null;
  averagePaymentAmount: number;
  thisMonthPaid: number;
  paymentsThisMonth: number;
};

export type VehicleExpensePaymentBatchAllocation = {
  id: string;
  payment_batch_id: string;
  invoice_id: string;
  invoice_vendor_name: string;
  invoice_number: string | null;
  invoice_date: string;
  invoice_status: VehicleExpenseInvoiceStatus;
  invoice_total_amount: number;
  invoice_paid_amount: number;
  invoice_balance_amount: number;
  allocated_amount: number;
  created_at: string;
};

export type VehicleExpensePaymentBatch = {
  id: string;
  vendor_name: string;
  payment_date: string;
  payment_mode: string | null;
  reference_number: string | null;
  remarks: string | null;
  total_amount: number;
  invoice_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  allocations: VehicleExpensePaymentBatchAllocation[];
};

export type CreateVehicleExpenseInvoicePayload = {
  vendorName: string;
  invoiceNumber: string | null;
  invoiceDate: string;
  dueDate: string | null;
  remarks: string | null;
  items: {
    vehicleId: string | null;
    vehicleIds?: string[];
    expenseType: string;
    description: string | null;
    amount: number;
  }[];
};

export type UpdateVehicleExpenseInvoicePayload =
  CreateVehicleExpenseInvoicePayload;

export type CreateVehicleExpenseInvoicePaymentPayload = {
  paymentDate: string;
  amount: number;
  paymentMode: string | null;
  referenceNumber: string | null;
  remarks: string | null;
};

export type CreateVehicleExpensePaymentBatchPayload = {
  vendorName: string;
  paymentDate: string;
  paymentMode: string | null;
  referenceNumber: string | null;
  remarks: string | null;
  allocations: {
    invoiceId: string;
    allocatedAmount: number;
  }[];
};

export type FuelTab =
  | "dashboard"
  | "vehicles"
  | "fuel-entries"
  | "vendor-invoices"
  | "vendor-payments";

export type FuelApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

import type {
  CreateFuelEntryInput,
  CreateVehicleExpenseInput,
  CreateVehicleInput,
  UpdateFuelEntryInput,
  UpdateVehicleInput,
  UpdateVehicleExpenseInput,
} from "./types";

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type ValidVehicleInput = {
  vehicle_no: string;
  vehicle_type: string;
  company: string | null;
  starting_odometer: number;
  status: "active" | "inactive";
  national_permit_renewal_date: string | null;
  national_permit_renewal_amount: number | null;
  national_permit_renewal_vendor: string | null;
  insurance_renewal_date: string | null;
  insurance_renewal_amount: number | null;
  insurance_renewal_vendor: string | null;
  road_tax_renewal_date: string | null;
  road_tax_renewal_amount: number | null;
  road_tax_renewal_vendor: string | null;
};

export type ValidVehicleUpdateInput = Partial<ValidVehicleInput>;

export type ValidFuelEntryInput = {
  vehicle_id: string;
  driver_name: string | null;
  driver_mobile: string | null;
  fuel_date: string;
  fuel_amount: number;
  fuel_liters: number;
  odometer_reading: number;
  bill_image_path: string | null;
  meter_image_path: string | null;
  remarks: string | null;
};

export type ValidVehicleExpenseInput = {
  expense_date: string;
  vehicle_id: string | null;
  expense_type: string;
  description: string | null;
  amount: number;
  vendor: string | null;
  invoice_reference: string | null;
  city: string | null;
  payment_mode: string | null;
  company: string | null;
  status: "paid" | "pending";
};

export function badRequest(message: string, status = 400) {
  return { ok: false as const, error: message, status };
}

export function isISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return NaN;
  return Number(value);
}

function optionalPositiveNumber(
  value: unknown,
  fieldName: string
): ValidationResult<number | null> {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return { ok: false, error: `${fieldName} must be > 0` };
  }

  return { ok: true, value: number };
}

function optionalDate(value: unknown, fieldName: string): ValidationResult<string | null> {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }

  if (!isISODate(value)) {
    return { ok: false, error: `${fieldName} must be YYYY-MM-DD` };
  }

  return { ok: true, value };
}

export function validateVehicleInput(
  input: CreateVehicleInput
): ValidationResult<ValidVehicleInput> {
  const vehicleNo = (input.vehicle_no ?? input.vehicleNo ?? "")
    .trim()
    .toUpperCase();
  const vehicleType = (input.vehicle_type ?? input.vehicleType ?? "").trim();
  const startingOdometer = toNumber(
    input.starting_odometer ?? input.startingOdometer ?? 0
  );
  const status = input.status ?? "active";
  const nationalPermitRenewalDate = optionalDate(
    input.national_permit_renewal_date ?? input.nationalPermitRenewalDate,
    "national_permit_renewal_date"
  );
  if (!nationalPermitRenewalDate.ok) return nationalPermitRenewalDate;
  const nationalPermitRenewalAmount = optionalPositiveNumber(
    input.national_permit_renewal_amount ?? input.nationalPermitRenewalAmount,
    "national_permit_renewal_amount"
  );
  if (!nationalPermitRenewalAmount.ok) return nationalPermitRenewalAmount;
  const insuranceRenewalDate = optionalDate(
    input.insurance_renewal_date ?? input.insuranceRenewalDate,
    "insurance_renewal_date"
  );
  if (!insuranceRenewalDate.ok) return insuranceRenewalDate;
  const insuranceRenewalAmount = optionalPositiveNumber(
    input.insurance_renewal_amount ?? input.insuranceRenewalAmount,
    "insurance_renewal_amount"
  );
  if (!insuranceRenewalAmount.ok) return insuranceRenewalAmount;
  const roadTaxRenewalDate = optionalDate(
    input.road_tax_renewal_date ?? input.roadTaxRenewalDate,
    "road_tax_renewal_date"
  );
  if (!roadTaxRenewalDate.ok) return roadTaxRenewalDate;
  const roadTaxRenewalAmount = optionalPositiveNumber(
    input.road_tax_renewal_amount ?? input.roadTaxRenewalAmount,
    "road_tax_renewal_amount"
  );
  if (!roadTaxRenewalAmount.ok) return roadTaxRenewalAmount;

  if (!vehicleNo) return { ok: false, error: "vehicle_no is required" };
  if (!vehicleType) return { ok: false, error: "vehicle_type is required" };
  if (!Number.isFinite(startingOdometer) || startingOdometer < 0) {
    return {
      ok: false,
      error: "starting_odometer must be a non-negative number",
    };
  }
  if (status !== "active" && status !== "inactive") {
    return { ok: false, error: "status must be active or inactive" };
  }

  return {
    ok: true,
    value: {
      vehicle_no: vehicleNo,
      vehicle_type: vehicleType,
      company: optionalText(input.company),
      starting_odometer: startingOdometer,
      status,
      national_permit_renewal_date: nationalPermitRenewalDate.value,
      national_permit_renewal_amount: nationalPermitRenewalAmount.value,
      national_permit_renewal_vendor: optionalText(
        input.national_permit_renewal_vendor ??
          input.nationalPermitRenewalVendor
      ),
      insurance_renewal_date: insuranceRenewalDate.value,
      insurance_renewal_amount: insuranceRenewalAmount.value,
      insurance_renewal_vendor: optionalText(
        input.insurance_renewal_vendor ?? input.insuranceRenewalVendor
      ),
      road_tax_renewal_date: roadTaxRenewalDate.value,
      road_tax_renewal_amount: roadTaxRenewalAmount.value,
      road_tax_renewal_vendor: optionalText(
        input.road_tax_renewal_vendor ?? input.roadTaxRenewalVendor
      ),
    },
  };
}

export function validateVehicleUpdateInput(
  input: UpdateVehicleInput
): ValidationResult<ValidVehicleUpdateInput> {
  const value: ValidVehicleUpdateInput = {};

  if ("vehicle_no" in input || "vehicleNo" in input) {
    const vehicleNo = (input.vehicle_no ?? input.vehicleNo ?? "")
      .trim()
      .toUpperCase();
    if (!vehicleNo) return { ok: false, error: "vehicle_no is required" };
    value.vehicle_no = vehicleNo;
  }

  if ("vehicle_type" in input || "vehicleType" in input) {
    const vehicleType = (input.vehicle_type ?? input.vehicleType ?? "").trim();
    if (!vehicleType) return { ok: false, error: "vehicle_type is required" };
    value.vehicle_type = vehicleType;
  }

  if ("company" in input) {
    value.company = optionalText(input.company);
  }

  if ("starting_odometer" in input || "startingOdometer" in input) {
    const startingOdometer = toNumber(
      input.starting_odometer ?? input.startingOdometer
    );
    if (!Number.isFinite(startingOdometer) || startingOdometer < 0) {
      return {
        ok: false,
        error: "starting_odometer must be a non-negative number",
      };
    }
    value.starting_odometer = startingOdometer;
  }

  if ("status" in input) {
    if (input.status !== "active" && input.status !== "inactive") {
      return { ok: false, error: "status must be active or inactive" };
    }
    value.status = input.status;
  }

  if (
    "national_permit_renewal_date" in input ||
    "nationalPermitRenewalDate" in input
  ) {
    const date = optionalDate(
      input.national_permit_renewal_date ?? input.nationalPermitRenewalDate,
      "national_permit_renewal_date"
    );
    if (!date.ok) return date;
    value.national_permit_renewal_date = date.value;
  }

  if (
    "national_permit_renewal_amount" in input ||
    "nationalPermitRenewalAmount" in input
  ) {
    const amount = optionalPositiveNumber(
      input.national_permit_renewal_amount ?? input.nationalPermitRenewalAmount,
      "national_permit_renewal_amount"
    );
    if (!amount.ok) return amount;
    value.national_permit_renewal_amount = amount.value;
  }

  if (
    "national_permit_renewal_vendor" in input ||
    "nationalPermitRenewalVendor" in input
  ) {
    value.national_permit_renewal_vendor = optionalText(
      input.national_permit_renewal_vendor ??
        input.nationalPermitRenewalVendor
    );
  }

  if ("insurance_renewal_date" in input || "insuranceRenewalDate" in input) {
    const date = optionalDate(
      input.insurance_renewal_date ?? input.insuranceRenewalDate,
      "insurance_renewal_date"
    );
    if (!date.ok) return date;
    value.insurance_renewal_date = date.value;
  }

  if ("insurance_renewal_amount" in input || "insuranceRenewalAmount" in input) {
    const amount = optionalPositiveNumber(
      input.insurance_renewal_amount ?? input.insuranceRenewalAmount,
      "insurance_renewal_amount"
    );
    if (!amount.ok) return amount;
    value.insurance_renewal_amount = amount.value;
  }

  if ("insurance_renewal_vendor" in input || "insuranceRenewalVendor" in input) {
    value.insurance_renewal_vendor = optionalText(
      input.insurance_renewal_vendor ?? input.insuranceRenewalVendor
    );
  }

  if ("road_tax_renewal_date" in input || "roadTaxRenewalDate" in input) {
    const date = optionalDate(
      input.road_tax_renewal_date ?? input.roadTaxRenewalDate,
      "road_tax_renewal_date"
    );
    if (!date.ok) return date;
    value.road_tax_renewal_date = date.value;
  }

  if ("road_tax_renewal_amount" in input || "roadTaxRenewalAmount" in input) {
    const amount = optionalPositiveNumber(
      input.road_tax_renewal_amount ?? input.roadTaxRenewalAmount,
      "road_tax_renewal_amount"
    );
    if (!amount.ok) return amount;
    value.road_tax_renewal_amount = amount.value;
  }

  if ("road_tax_renewal_vendor" in input || "roadTaxRenewalVendor" in input) {
    value.road_tax_renewal_vendor = optionalText(
      input.road_tax_renewal_vendor ?? input.roadTaxRenewalVendor
    );
  }

  if (Object.keys(value).length === 0) {
    return { ok: false, error: "At least one vehicle field is required" };
  }

  return { ok: true, value };
}

export function validateFuelEntryInput(
  input: CreateFuelEntryInput
): ValidationResult<ValidFuelEntryInput> {
  const vehicleId = (input.vehicle_id ?? input.vehicleId ?? "").trim();
  const fuelDate = input.fuel_date ?? input.fuelDate;
  const fuelAmount = toNumber(input.fuel_amount ?? input.fuelAmount);
  const fuelLiters = toNumber(input.fuel_liters ?? input.fuelLiters);
  const odometerReading = toNumber(
    input.odometer_reading ?? input.odometerReading
  );
  const driverName = optionalText(input.driver_name ?? input.driverName);
  const driverMobile = optionalText(input.driver_mobile ?? input.driverMobile);
  const billImagePath = optionalText(
    input.bill_image_path ?? input.billImagePath
  );
  const meterImagePath = optionalText(
    input.meter_image_path ?? input.meterImagePath
  );

  if (!vehicleId) return { ok: false, error: "vehicle_id is required" };
  if (!isISODate(fuelDate)) {
    return { ok: false, error: "fuel_date must be YYYY-MM-DD" };
  }
  if (!Number.isFinite(fuelAmount) || fuelAmount <= 0) {
    return { ok: false, error: "fuel_amount must be > 0" };
  }
  if (!Number.isFinite(fuelLiters) || fuelLiters <= 0) {
    return { ok: false, error: "fuel_liters must be > 0" };
  }
  if (!Number.isFinite(odometerReading) || odometerReading <= 0) {
    return { ok: false, error: "odometer_reading must be > 0" };
  }

  return {
    ok: true,
    value: {
      vehicle_id: vehicleId,
      driver_name: driverName,
      driver_mobile: driverMobile,
      fuel_date: fuelDate,
      fuel_amount: fuelAmount,
      fuel_liters: fuelLiters,
      odometer_reading: odometerReading,
      bill_image_path: billImagePath,
      meter_image_path: meterImagePath,
      remarks: optionalText(input.remarks),
    },
  };
}

export function validateFuelEntryUpdateInput(
  input: UpdateFuelEntryInput
): ValidationResult<ValidFuelEntryInput> {
  return validateFuelEntryInput(input);
}

export function validateVehicleExpenseInput(
  input: CreateVehicleExpenseInput
): ValidationResult<ValidVehicleExpenseInput> {
  const expenseDate = input.expense_date ?? input.expenseDate;
  const expenseScope =
    (input.expense_scope ?? input.expenseScope ?? "vehicle") === "general"
      ? "general"
      : "vehicle";
  const vehicleId =
    typeof (input.vehicle_id ?? input.vehicleId) === "string"
      ? (input.vehicle_id ?? input.vehicleId ?? "").trim()
      : "";
  const expenseType = (input.expense_type ?? input.expenseType ?? "").trim();
  const amount = toNumber(input.amount);
  const status = (input.status ?? "paid").trim().toLowerCase();

  if (!isISODate(expenseDate)) {
    return { ok: false, error: "expense_date must be YYYY-MM-DD" };
  }
  if (expenseScope === "vehicle" && !vehicleId) {
    return { ok: false, error: "vehicle_id is required" };
  }
  if (!expenseType) return { ok: false, error: "expense_type is required" };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "amount must be > 0" };
  }
  if (status !== "paid" && status !== "pending") {
    return { ok: false, error: "status must be paid or pending" };
  }

  return {
    ok: true,
    value: {
      expense_date: expenseDate,
      vehicle_id: expenseScope === "general" ? null : vehicleId,
      expense_type: expenseType,
      description: optionalText(input.description),
      amount,
      vendor: optionalText(input.vendor),
      invoice_reference: optionalText(
        input.invoice_reference ?? input.invoiceReference
      ),
      city: optionalText(input.city),
      payment_mode: optionalText(input.payment_mode ?? input.paymentMode),
      company: optionalText(input.company),
      status,
    },
  };
}

export function validateVehicleExpenseUpdateInput(
  input: UpdateVehicleExpenseInput
): ValidationResult<ValidVehicleExpenseInput> {
  return validateVehicleExpenseInput(input);
}

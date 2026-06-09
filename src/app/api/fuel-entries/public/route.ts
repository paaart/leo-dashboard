import { NextResponse } from "next/server";
import { createFuelEntry, validateFuelEntryInput } from "@/lib/fuel-tracker";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";

type PublicFuelEntryBody = {
  vehicleId?: string;
  fuelDate?: string;
  fuelAmount?: number | string;
  fuelLiters?: number | string;
  odometerReading?: number | string;
  billImagePath?: string | null;
  meterImagePath?: string | null;
  driverName?: string;
  driverMobile?: string;
  remarks?: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function optionalTrim(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getStatus(error: unknown): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return 500;
}

export async function POST(req: Request) {
  let body: PublicFuelEntryBody;

  try {
    body = (await req.json()) as PublicFuelEntryBody;
  } catch {
    return jsonError("Invalid JSON body");
  }

  const billImagePath = optionalTrim(body.billImagePath);
  const meterImagePath = optionalTrim(body.meterImagePath);
  const driverName = optionalTrim(body.driverName);
  const driverMobile = optionalTrim(body.driverMobile);

  if (!billImagePath) return jsonError("billImagePath is required");
  if (!meterImagePath) return jsonError("meterImagePath is required");
  if (!driverName) return jsonError("driverName is required");
  if (driverName.length < 2) {
    return jsonError("driverName must be at least 2 characters");
  }
  if (!driverMobile) return jsonError("driverMobile is required");
  if (!/^\d{10,}$/.test(driverMobile)) {
    return jsonError("driverMobile must contain at least 10 digits");
  }

  const validation = validateFuelEntryInput({
    vehicleId: body.vehicleId,
    fuelDate: body.fuelDate,
    fuelAmount: body.fuelAmount,
    fuelLiters: body.fuelLiters,
    odometerReading: body.odometerReading,
    driverName,
    driverMobile,
    billImagePath,
    meterImagePath,
    remarks: optionalTrim(body.remarks) || null,
  });

  if (!validation.ok) return jsonError(validation.error);

  try {
    const data = await createFuelEntry(validation.value);

    return NextResponse.json(
      {
        ok: true,
        data: {
          id: data.id,
          fuelDate: data.fuel_date,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(getErrorMessage(error), getStatus(error));
  }
}

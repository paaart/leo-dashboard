import { NextResponse } from "next/server";
import {
  REQUIRED_FUEL_IMAGES_ERROR,
  createFuelEntry,
  validateFuelEntryInput,
} from "@/lib/fuel-tracker";
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
  driverName?: string | null;
  driverMobile?: string | null;
  remarks?: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function requiredImagesError() {
  return NextResponse.json(
    { error: REQUIRED_FUEL_IMAGES_ERROR },
    { status: 400 }
  );
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

  if (!billImagePath || !meterImagePath) return requiredImagesError();
  if (driverMobile && !/^\d{10,}$/.test(driverMobile)) {
    return jsonError("driverMobile must contain at least 10 digits");
  }

  const validation = validateFuelEntryInput({
    vehicleId: body.vehicleId,
    fuelDate: body.fuelDate,
    fuelAmount: body.fuelAmount,
    fuelLiters: body.fuelLiters,
    odometerReading: body.odometerReading,
    driverName: driverName || null,
    driverMobile: driverMobile || null,
    billImagePath,
    meterImagePath,
    remarks: optionalTrim(body.remarks) || null,
  });

  if (!validation.ok) {
    if (validation.error === REQUIRED_FUEL_IMAGES_ERROR) {
      return requiredImagesError();
    }
    return jsonError(validation.error);
  }

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

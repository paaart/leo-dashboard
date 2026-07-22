import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  dismissVehicleRenewalAlert,
  isISODate,
  type DismissVehicleRenewalAlertPayload,
  type VehicleRenewalType,
} from "@/lib/fuel-tracker";

export const runtime = "nodejs";

const renewalTypes = new Set<VehicleRenewalType>([
  "national_permit",
  "insurance",
  "road_tax",
]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
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

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  let body: DismissVehicleRenewalAlertPayload;

  try {
    body = (await req.json()) as DismissVehicleRenewalAlertPayload;
  } catch {
    return jsonError("Invalid JSON body");
  }

  const vehicleId = typeof body.vehicleId === "string" ? body.vehicleId : "";
  const renewalType = body.renewalType;
  const renewalDate = body.renewalDate;

  if (!vehicleId.trim()) return jsonError("vehicleId is required");
  if (!renewalTypes.has(renewalType)) {
    return jsonError(
      "renewalType must be national_permit, insurance, or road_tax"
    );
  }
  if (!isISODate(renewalDate)) {
    return jsonError("renewalDate must be YYYY-MM-DD");
  }

  try {
    const data = await dismissVehicleRenewalAlert({
      vehicleId: vehicleId.trim(),
      renewalType,
      renewalDate,
      dismissedBy: auth.user.id,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return jsonError(getErrorMessage(error), getStatus(error));
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  updateVehicle,
  validateVehicleUpdateInput,
  type UpdateVehicleInput,
} from "@/lib/fuel-tracker";

export const runtime = "nodejs";

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

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) return jsonError("Vehicle id is required");

  let body: UpdateVehicleInput;

  try {
    body = (await req.json()) as UpdateVehicleInput;
  } catch {
    return jsonError("Invalid JSON body");
  }

  const validation = validateVehicleUpdateInput(body);
  if (!validation.ok) return jsonError(validation.error);

  try {
    const data = await updateVehicle(id, validation.value);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return jsonError(getErrorMessage(error), getStatus(error));
  }
}

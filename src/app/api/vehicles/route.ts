import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  createVehicle,
  listVehicles,
  validateVehicleInput,
  type CreateVehicleInput,
} from "@/lib/fuel";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function paginationFromUrl(url: URL) {
  return {
    limit: Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? 500), 1),
      2000
    ),
    offset: Math.max(Number(url.searchParams.get("offset") ?? 0), 0),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  try {
    const data = await listVehicles({
      ...paginationFromUrl(url),
      status,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return jsonError(getErrorMessage(error), 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  let body: CreateVehicleInput;

  try {
    body = (await req.json()) as CreateVehicleInput;
  } catch {
    return jsonError("Invalid JSON body");
  }

  const validation = validateVehicleInput(body);
  if (!validation.ok) return jsonError(validation.error);

  try {
    const data = await createVehicle(validation.value);
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message.includes("vehicles_vehicle_no_unique") ? 409 : 500;
    return jsonError(
      status === 409 ? "vehicle_no must be unique" : message,
      status
    );
  }
}

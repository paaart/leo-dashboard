import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  REQUIRED_FUEL_IMAGES_ERROR,
  createFuelEntry,
  listFuelEntries,
  validateFuelEntryInput,
  type CreateFuelEntryInput,
} from "@/lib/fuel-tracker";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function requiredImagesError() {
  return NextResponse.json(
    { error: REQUIRED_FUEL_IMAGES_ERROR },
    { status: 400 }
  );
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

  try {
    const data = await listFuelEntries({
      ...paginationFromUrl(url),
      vehicleId: url.searchParams.get("vehicle_id"),
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return jsonError(getErrorMessage(error), 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  let body: CreateFuelEntryInput;

  try {
    body = (await req.json()) as CreateFuelEntryInput;
  } catch {
    return jsonError("Invalid JSON body");
  }

  const validation = validateFuelEntryInput(body);
  if (!validation.ok) {
    if (validation.error === REQUIRED_FUEL_IMAGES_ERROR) {
      return requiredImagesError();
    }
    return jsonError(validation.error);
  }

  try {
    const data = await createFuelEntry(validation.value);
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    return jsonError(getErrorMessage(error), getStatus(error));
  }
}

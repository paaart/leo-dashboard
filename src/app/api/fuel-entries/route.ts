import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import {
  createFuelEntry,
  listFuelEntries,
  validateFuelEntryInput,
  type CreateFuelEntryInput,
} from "@/lib/fuel";

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

function paginationFromUrl(url: URL) {
  return {
    limit: Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? 500), 1),
      2000
    ),
    offset: Math.max(Number(url.searchParams.get("offset") ?? 0), 0),
  };
}

export async function GET(req: Request) {
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

export async function POST(req: Request) {
  let body: CreateFuelEntryInput;

  try {
    body = (await req.json()) as CreateFuelEntryInput;
  } catch {
    return jsonError("Invalid JSON body");
  }

  const validation = validateFuelEntryInput(body);
  if (!validation.ok) return jsonError(validation.error);

  try {
    const data = await createFuelEntry(validation.value);
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    return jsonError(getErrorMessage(error), getStatus(error));
  }
}

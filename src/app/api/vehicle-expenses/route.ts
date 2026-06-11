import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  createVehicleExpense,
  isISODate,
  listVehicleExpenses,
  validateVehicleExpenseInput,
  type CreateVehicleExpenseInput,
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

function paginationFromUrl(url: URL) {
  return {
    limit: Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? 500), 1),
      2000
    ),
    offset: Math.max(Number(url.searchParams.get("offset") ?? 0), 0),
  };
}

function validateOptionalDate(value: string | null, name: string) {
  if (!value || isISODate(value)) return null;
  return `${name} must be YYYY-MM-DD`;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const fromDate = url.searchParams.get("fromDate");
  const toDate = url.searchParams.get("toDate");
  const dateError =
    validateOptionalDate(fromDate, "fromDate") ??
    validateOptionalDate(toDate, "toDate");

  if (dateError) return jsonError(dateError);

  try {
    const data = await listVehicleExpenses({
      ...paginationFromUrl(url),
      vehicleId:
        url.searchParams.get("vehicleId") ?? url.searchParams.get("vehicle_id"),
      fromDate,
      toDate,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return jsonError(getErrorMessage(error), 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  let body: CreateVehicleExpenseInput;

  try {
    body = (await req.json()) as CreateVehicleExpenseInput;
  } catch {
    return jsonError("Invalid JSON body");
  }

  const validation = validateVehicleExpenseInput(body);
  if (!validation.ok) return jsonError(validation.error);

  try {
    const data = await createVehicleExpense(validation.value);
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    return jsonError(getErrorMessage(error), getStatus(error));
  }
}

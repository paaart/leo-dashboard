import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  createVehicleExpensePaymentBatch,
  isISODate,
  listVehicleExpensePaymentBatches,
  validateCreatePaymentBatchInput,
  type CreateVehicleExpensePaymentBatchInput,
} from "@/lib/vehicle-expense-invoices";

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

function optionalText(value: string | null): string | null {
  if (!value) return null;
  return value.trim() || null;
}

function validateOptionalDate(value: string | null, name: string) {
  if (!value || isISODate(value)) return null;
  return `${name} must be YYYY-MM-DD`;
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
  const fromDate = url.searchParams.get("fromDate");
  const toDate = url.searchParams.get("toDate");
  const dateError =
    validateOptionalDate(fromDate, "fromDate") ??
    validateOptionalDate(toDate, "toDate");

  if (dateError) return jsonError(dateError);

  try {
    const data = await listVehicleExpensePaymentBatches({
      ...paginationFromUrl(url),
      vendorName: optionalText(url.searchParams.get("vendorName")),
      fromDate,
      toDate,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return jsonError(getErrorMessage(error), getStatus(error));
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  let body: CreateVehicleExpensePaymentBatchInput;

  try {
    body = (await req.json()) as CreateVehicleExpensePaymentBatchInput;
  } catch {
    return jsonError("Invalid JSON body");
  }

  const validation = validateCreatePaymentBatchInput(body);
  if (!validation.ok) return jsonError(validation.error);

  try {
    const data = await createVehicleExpensePaymentBatch(
      validation.value,
      auth.user.id
    );
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    return jsonError(getErrorMessage(error), getStatus(error));
  }
}

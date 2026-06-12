import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  createVehicleExpensePayment,
  isISODate,
  listVehicleExpensePayments,
} from "@/lib/fuel-tracker";

export const runtime = "nodejs";

type CreatePaymentBody = {
  paymentDate?: unknown;
  paymentMode?: unknown;
  referenceNumber?: unknown;
  remarks?: unknown;
  expenseIds?: unknown;
};

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

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
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
    const data = await listVehicleExpensePayments({
      ...paginationFromUrl(url),
      fromDate,
      toDate,
      paymentMode: optionalText(url.searchParams.get("paymentMode")),
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return jsonError(getErrorMessage(error), 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  let body: CreatePaymentBody;

  try {
    body = (await req.json()) as CreatePaymentBody;
  } catch {
    return jsonError("Invalid JSON body");
  }

  const paymentDate =
    typeof body.paymentDate === "string" ? body.paymentDate : "";

  if (!isISODate(paymentDate)) {
    return jsonError("paymentDate must be YYYY-MM-DD");
  }

  if (
    !Array.isArray(body.expenseIds) ||
    body.expenseIds.length === 0 ||
    !body.expenseIds.every((id) => typeof id === "string" && id.trim())
  ) {
    return jsonError("Select at least one pending expense");
  }

  const expenseIds = [...new Set(body.expenseIds.map((id) => id.trim()))];

  try {
    const data = await createVehicleExpensePayment({
      paymentDate,
      paymentMode: optionalText(body.paymentMode),
      referenceNumber: optionalText(body.referenceNumber),
      remarks: optionalText(body.remarks),
      expenseIds,
    });

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    return jsonError(getErrorMessage(error), getStatus(error));
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  createVehicleExpenseInvoicePayment,
  validateCreatePaymentInput,
  type CreateVehicleExpenseInvoicePaymentInput,
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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) return jsonError("Vehicle expense invoice id is required");

  let body: CreateVehicleExpenseInvoicePaymentInput;

  try {
    body = (await req.json()) as CreateVehicleExpenseInvoicePaymentInput;
  } catch {
    return jsonError("Invalid JSON body");
  }

  const validation = validateCreatePaymentInput(body);
  if (!validation.ok) return jsonError(validation.error);

  try {
    const data = await createVehicleExpenseInvoicePayment(
      id,
      validation.value,
      auth.user.id
    );
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    return jsonError(getErrorMessage(error), getStatus(error));
  }
}

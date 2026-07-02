import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  deleteVehicleExpenseInvoice,
  getVehicleExpenseInvoice,
  updateVehicleExpenseInvoice,
  validateUpdateInvoiceInput,
  type UpdateVehicleExpenseInvoiceInput,
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

function hasField(input: object, snakeName: string, camelName: string) {
  return snakeName in input || camelName in input;
}

function fieldValue<T>(
  input: Record<string, unknown>,
  snakeName: string,
  camelName: string,
  fallback: T
) {
  if (snakeName in input) return input[snakeName];
  if (camelName in input) return input[camelName];
  return fallback;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) return jsonError("Vehicle expense invoice id is required");

  try {
    const data = await getVehicleExpenseInvoice(id);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return jsonError(getErrorMessage(error), getStatus(error));
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) return jsonError("Vehicle expense invoice id is required");

  let body: UpdateVehicleExpenseInvoiceInput;

  try {
    body = (await req.json()) as UpdateVehicleExpenseInvoiceInput;
  } catch {
    return jsonError("Invalid JSON body");
  }

  const existing = await getVehicleExpenseInvoice(id).catch((error) => error);
  if (existing instanceof Error) {
    return jsonError(getErrorMessage(existing), getStatus(existing));
  }

  const bodyRecord = body as Record<string, unknown>;
  const mergedBody: UpdateVehicleExpenseInvoiceInput = {
    vendorName: fieldValue(
      bodyRecord,
      "vendor_name",
      "vendorName",
      existing.vendor_name
    ),
    invoiceNumber: fieldValue(
      bodyRecord,
      "invoice_number",
      "invoiceNumber",
      existing.invoice_number
    ),
    invoiceDate: fieldValue(
      bodyRecord,
      "invoice_date",
      "invoiceDate",
      existing.invoice_date
    ),
    dueDate: fieldValue(bodyRecord, "due_date", "dueDate", existing.due_date),
    remarks: fieldValue(bodyRecord, "remarks", "remarks", existing.remarks),
  };

  if (hasField(bodyRecord, "items", "items")) {
    mergedBody.items = bodyRecord.items;
  }

  const validation = validateUpdateInvoiceInput(mergedBody);
  if (!validation.ok) return jsonError(validation.error);

  try {
    const data = await updateVehicleExpenseInvoice(id, validation.value);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return jsonError(getErrorMessage(error), getStatus(error));
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) return jsonError("Vehicle expense invoice id is required");

  try {
    await deleteVehicleExpenseInvoice(id);
    return NextResponse.json({ ok: true, data: { id } });
  } catch (error) {
    return jsonError(getErrorMessage(error), getStatus(error));
  }
}

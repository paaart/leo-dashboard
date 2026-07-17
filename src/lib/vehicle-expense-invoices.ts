import type { PoolClient } from "pg";
import { db } from "@/lib/db";

export type VehicleExpenseInvoiceStatus =
  | "unpaid"
  | "partially_paid"
  | "paid";

export type VehicleExpenseInvoiceItem = {
  id: string;
  invoice_id: string;
  vehicle_id: string | null;
  vehicle_no: string | null;
  vehicles: {
    id: string;
    vehicle_no: string;
    vehicle_type: string;
  }[];
  expense_type: string;
  description: string | null;
  amount: number;
  created_at: string;
};

export type VehicleExpenseInvoicePayment = {
  id: string;
  payment_batch_id: string;
  invoice_id: string;
  vendor_name: string;
  payment_date: string;
  amount: number;
  payment_mode: string | null;
  reference_number: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
};

export type VehicleExpenseInvoice = {
  id: string;
  vendor_name: string;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: VehicleExpenseInvoiceStatus;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items: VehicleExpenseInvoiceItem[];
  payments: VehicleExpenseInvoicePayment[];
};

export type VehicleExpensePaymentBatchAllocation = {
  id: string;
  payment_batch_id: string;
  invoice_id: string;
  invoice_vendor_name: string;
  invoice_number: string | null;
  invoice_date: string;
  invoice_status: VehicleExpenseInvoiceStatus;
  invoice_total_amount: number;
  invoice_paid_amount: number;
  invoice_balance_amount: number;
  allocated_amount: number;
  created_at: string;
};

export type VehicleExpensePaymentBatch = {
  id: string;
  vendor_name: string;
  payment_date: string;
  payment_mode: string | null;
  reference_number: string | null;
  remarks: string | null;
  total_amount: number;
  invoice_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  allocations: VehicleExpensePaymentBatchAllocation[];
};

export type VehicleExpenseInvoiceAnalytics = {
  invoiceCount: number;
  invoiceTotal: number;
  paidInvoiceCount: number;
  paidAmount: number;
  unpaidInvoiceCount: number;
  unpaidAmount: number;
  partiallyPaidInvoiceCount: number;
  partiallyPaidOutstanding: number;
  outstandingAmount: number;
  paymentBatchCount: number;
  paymentTotal: number;
  latestPaymentDate: string | null;
  averagePaymentAmount: number;
  thisMonthPaid: number;
  paymentsThisMonth: number;
};

export type VehicleExpenseInvoiceInputItem = {
  vehicleId?: unknown;
  vehicle_id?: unknown;
  vehicleIds?: unknown;
  vehicle_ids?: unknown;
  expenseType?: unknown;
  expense_type?: unknown;
  description?: unknown;
  amount?: unknown;
};

export type CreateVehicleExpenseInvoiceInput = {
  vendorName?: unknown;
  vendor_name?: unknown;
  invoiceNumber?: unknown;
  invoice_number?: unknown;
  invoiceDate?: unknown;
  invoice_date?: unknown;
  dueDate?: unknown;
  due_date?: unknown;
  remarks?: unknown;
  items?: unknown;
};

export type UpdateVehicleExpenseInvoiceInput =
  Partial<CreateVehicleExpenseInvoiceInput>;

export type CreateVehicleExpenseInvoicePaymentInput = {
  paymentDate?: unknown;
  payment_date?: unknown;
  amount?: unknown;
  paymentMode?: unknown;
  payment_mode?: unknown;
  referenceNumber?: unknown;
  reference_number?: unknown;
  remarks?: unknown;
};

export type CreateVehicleExpensePaymentBatchInput = {
  vendorName?: unknown;
  vendor_name?: unknown;
  paymentDate?: unknown;
  payment_date?: unknown;
  paymentMode?: unknown;
  payment_mode?: unknown;
  referenceNumber?: unknown;
  reference_number?: unknown;
  remarks?: unknown;
  allocations?: unknown;
};

export type VehicleExpensePaymentBatchAllocationInput = {
  invoiceId?: unknown;
  invoice_id?: unknown;
  allocatedAmount?: unknown;
  allocated_amount?: unknown;
};

export type ValidInvoiceItemInput = {
  vehicle_id: string | null;
  vehicle_ids: string[];
  expense_type: string;
  description: string | null;
  amount: number;
};

export type ValidInvoiceInput = {
  vendor_name: string;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  remarks: string | null;
  items?: ValidInvoiceItemInput[];
};

export type ValidInvoicePaymentInput = {
  payment_date: string;
  amount: number;
  payment_mode: string | null;
  reference_number: string | null;
  remarks: string | null;
};

export type ValidPaymentBatchAllocationInput = {
  invoice_id: string;
  allocated_amount: number;
};

export type ValidPaymentBatchInput = {
  vendor_name: string;
  payment_date: string;
  payment_mode: string | null;
  reference_number: string | null;
  remarks: string | null;
  allocations: ValidPaymentBatchAllocationInput[];
};

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function isISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function requiredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toAmount(value: unknown): number {
  if (value === null || value === undefined || value === "") return NaN;
  return Number(value);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const PAYMENT_STATUS_EPSILON = 0.01;

function deriveInvoiceStatus(
  totalAmount: number,
  paidAmount: number
): VehicleExpenseInvoiceStatus {
  const outstandingAmount = roundMoney(totalAmount - paidAmount);

  if (outstandingAmount <= PAYMENT_STATUS_EPSILON) return "paid";
  if (paidAmount > PAYMENT_STATUS_EPSILON) return "partially_paid";
  return "unpaid";
}

function quotePgIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function toDateOnly(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapItem(
  row: Record<string, unknown>,
  vehicles: VehicleExpenseInvoiceItem["vehicles"] = []
): VehicleExpenseInvoiceItem {
  return {
    id: String(row.id),
    invoice_id: String(row.invoice_id),
    vehicle_id: row.vehicle_id ? String(row.vehicle_id) : null,
    vehicle_no: row.vehicle_no ? String(row.vehicle_no) : null,
    vehicles,
    expense_type: String(row.expense_type),
    description: row.description ? String(row.description) : null,
    amount: Number(row.amount),
    created_at: toIso(row.created_at),
  };
}

function mapPayment(
  row: Record<string, unknown>
): VehicleExpenseInvoicePayment {
  return {
    id: String(row.id),
    payment_batch_id: String(row.payment_batch_id),
    invoice_id: String(row.invoice_id),
    vendor_name: String(row.vendor_name),
    payment_date: toDateOnly(row.payment_date),
    amount: Number(row.amount),
    payment_mode: row.payment_mode ? String(row.payment_mode) : null,
    reference_number: row.reference_number
      ? String(row.reference_number)
      : null,
    remarks: row.remarks ? String(row.remarks) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: toIso(row.created_at),
  };
}

function mapBatchAllocation(
  row: Record<string, unknown>
): VehicleExpensePaymentBatchAllocation {
  const invoiceTotalAmount = Number(row.invoice_total_amount);
  const invoicePaidAmount = Number(row.invoice_paid_amount ?? 0);
  const invoiceStatus = deriveInvoiceStatus(
    invoiceTotalAmount,
    invoicePaidAmount
  );

  return {
    id: String(row.id),
    payment_batch_id: String(row.payment_batch_id),
    invoice_id: String(row.invoice_id),
    invoice_vendor_name: String(row.invoice_vendor_name),
    invoice_number: row.invoice_number ? String(row.invoice_number) : null,
    invoice_date: toDateOnly(row.invoice_date),
    invoice_status: invoiceStatus,
    invoice_total_amount: invoiceTotalAmount,
    invoice_paid_amount: invoicePaidAmount,
    invoice_balance_amount: roundMoney(invoiceTotalAmount - invoicePaidAmount),
    allocated_amount: Number(row.allocated_amount),
    created_at: toIso(row.created_at),
  };
}

function mapPaymentBatch(
  row: Record<string, unknown>,
  allocations: VehicleExpensePaymentBatchAllocation[]
): VehicleExpensePaymentBatch {
  return {
    id: String(row.id),
    vendor_name: String(row.vendor_name),
    payment_date: toDateOnly(row.payment_date),
    payment_mode: row.payment_mode ? String(row.payment_mode) : null,
    reference_number: row.reference_number
      ? String(row.reference_number)
      : null,
    remarks: row.remarks ? String(row.remarks) : null,
    total_amount: Number(row.total_amount),
    invoice_count: Number(row.invoice_count ?? allocations.length),
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    allocations,
  };
}

function mapInvoice(
  row: Record<string, unknown>,
  items: VehicleExpenseInvoiceItem[],
  payments: VehicleExpenseInvoicePayment[]
): VehicleExpenseInvoice {
  const totalAmount = Number(row.total_amount);
  const paidAmount = Number(row.paid_amount ?? 0);
  const status = deriveInvoiceStatus(totalAmount, paidAmount);

  return {
    id: String(row.id),
    vendor_name: String(row.vendor_name),
    invoice_number: row.invoice_number ? String(row.invoice_number) : null,
    invoice_date: toDateOnly(row.invoice_date),
    due_date: row.due_date ? toDateOnly(row.due_date) : null,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    balance_amount: roundMoney(totalAmount - paidAmount),
    status,
    remarks: row.remarks ? String(row.remarks) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    items,
    payments,
  };
}

function validateItems(value: unknown): ValidationResult<ValidInvoiceItemInput[]> {
  if (!Array.isArray(value)) {
    return { ok: false, error: "items are required" };
  }

  if (value.length === 0) {
    return { ok: false, error: "At least one invoice item is required" };
  }

  const items: ValidInvoiceItemInput[] = [];

  for (const [index, rawItem] of value.entries()) {
    if (typeof rawItem !== "object" || rawItem === null) {
      return { ok: false, error: `items[${index}] must be an object` };
    }

    const item = rawItem as VehicleExpenseInvoiceInputItem;
    const vehicleIdsRaw = item.vehicle_ids ?? item.vehicleIds;
    const legacyVehicleRaw = item.vehicle_id ?? item.vehicleId;
    const vehicleIds = Array.isArray(vehicleIdsRaw)
      ? vehicleIdsRaw
          .filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
          .map((id) => id.trim())
      : typeof legacyVehicleRaw === "string" && legacyVehicleRaw.trim()
      ? [legacyVehicleRaw.trim()]
      : [];
    const dedupedVehicleIds = [...new Set(vehicleIds)];
    const expenseType = requiredText(item.expense_type ?? item.expenseType);
    const amount = toAmount(item.amount);

    if (!expenseType) {
      return { ok: false, error: `items[${index}].expenseType is required` };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: `items[${index}].amount must be > 0` };
    }

    items.push({
      vehicle_id: dedupedVehicleIds[0] ?? null,
      vehicle_ids: dedupedVehicleIds,
      expense_type: expenseType,
      description: optionalText(item.description),
      amount: roundMoney(amount),
    });
  }

  return { ok: true, value: items };
}

export function validateCreateInvoiceInput(
  input: CreateVehicleExpenseInvoiceInput
): ValidationResult<ValidInvoiceInput & { items: ValidInvoiceItemInput[] }> {
  const vendorName = requiredText(input.vendor_name ?? input.vendorName);
  const invoiceDate = input.invoice_date ?? input.invoiceDate;
  const dueDate = input.due_date ?? input.dueDate;

  if (!vendorName) return { ok: false, error: "vendorName is required" };
  if (!isISODate(invoiceDate)) {
    return { ok: false, error: "invoiceDate must be YYYY-MM-DD" };
  }
  if (dueDate !== null && dueDate !== undefined && dueDate !== "") {
    if (!isISODate(dueDate)) {
      return { ok: false, error: "dueDate must be YYYY-MM-DD" };
    }
  }

  const items = validateItems(input.items);
  if (!items.ok) return items;

  return {
    ok: true,
    value: {
      vendor_name: vendorName,
      invoice_number: optionalText(input.invoice_number ?? input.invoiceNumber),
      invoice_date: invoiceDate,
      due_date: isISODate(dueDate) ? dueDate : null,
      remarks: optionalText(input.remarks),
      items: items.value,
    },
  };
}

export function validateUpdateInvoiceInput(
  input: UpdateVehicleExpenseInvoiceInput
): ValidationResult<ValidInvoiceInput> {
  const vendorName = requiredText(input.vendor_name ?? input.vendorName);
  const invoiceDate = input.invoice_date ?? input.invoiceDate;
  const dueDate = input.due_date ?? input.dueDate;

  if (!vendorName) return { ok: false, error: "vendorName is required" };
  if (!isISODate(invoiceDate)) {
    return { ok: false, error: "invoiceDate must be YYYY-MM-DD" };
  }
  if (dueDate !== null && dueDate !== undefined && dueDate !== "") {
    if (!isISODate(dueDate)) {
      return { ok: false, error: "dueDate must be YYYY-MM-DD" };
    }
  }

  if ("items" in input && input.items !== undefined) {
    const items = validateItems(input.items);
    if (!items.ok) return items;

    return {
      ok: true,
      value: {
        vendor_name: vendorName,
        invoice_number: optionalText(
          input.invoice_number ?? input.invoiceNumber
        ),
        invoice_date: invoiceDate,
        due_date: isISODate(dueDate) ? dueDate : null,
        remarks: optionalText(input.remarks),
        items: items.value,
      },
    };
  }

  return {
    ok: true,
    value: {
      vendor_name: vendorName,
      invoice_number: optionalText(input.invoice_number ?? input.invoiceNumber),
      invoice_date: invoiceDate,
      due_date: isISODate(dueDate) ? dueDate : null,
      remarks: optionalText(input.remarks),
    },
  };
}

export function validateCreatePaymentInput(
  input: CreateVehicleExpenseInvoicePaymentInput
): ValidationResult<ValidInvoicePaymentInput> {
  const paymentDate = input.payment_date ?? input.paymentDate;
  const amount = toAmount(input.amount);

  if (!isISODate(paymentDate)) {
    return { ok: false, error: "paymentDate must be YYYY-MM-DD" };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "amount must be > 0" };
  }

  return {
    ok: true,
    value: {
      payment_date: paymentDate,
      amount: roundMoney(amount),
      payment_mode: optionalText(input.payment_mode ?? input.paymentMode),
      reference_number: optionalText(
        input.reference_number ?? input.referenceNumber
      ),
      remarks: optionalText(input.remarks),
    },
  };
}

export function validateCreatePaymentBatchInput(
  input: CreateVehicleExpensePaymentBatchInput
): ValidationResult<ValidPaymentBatchInput> {
  const vendorName = requiredText(input.vendor_name ?? input.vendorName);
  const paymentDate = input.payment_date ?? input.paymentDate;

  if (!vendorName) return { ok: false, error: "vendorName is required" };

  if (!isISODate(paymentDate)) {
    return { ok: false, error: "paymentDate must be YYYY-MM-DD" };
  }

  if (!Array.isArray(input.allocations) || input.allocations.length === 0) {
    return { ok: false, error: "At least one allocation is required" };
  }

  const seenInvoiceIds = new Set<string>();
  const allocations: ValidPaymentBatchAllocationInput[] = [];

  for (const [index, rawAllocation] of input.allocations.entries()) {
    if (typeof rawAllocation !== "object" || rawAllocation === null) {
      return { ok: false, error: `allocations[${index}] must be an object` };
    }

    const allocation = rawAllocation as VehicleExpensePaymentBatchAllocationInput;
    const invoiceId = requiredText(allocation.invoice_id ?? allocation.invoiceId);
    const allocatedAmount = toAmount(
      allocation.allocated_amount ?? allocation.allocatedAmount
    );

    if (!invoiceId) {
      return { ok: false, error: `allocations[${index}].invoiceId is required` };
    }

    if (seenInvoiceIds.has(invoiceId)) {
      return {
        ok: false,
        error:
          "This invoice is already included in this payment batch. If you want to split the payment across different dates, create another payment batch later.",
      };
    }

    if (!Number.isFinite(allocatedAmount) || allocatedAmount <= 0) {
      return {
        ok: false,
        error: `allocations[${index}].allocatedAmount must be > 0`,
      };
    }

    seenInvoiceIds.add(invoiceId);
    allocations.push({
      invoice_id: invoiceId,
      allocated_amount: roundMoney(allocatedAmount),
    });
  }

  return {
    ok: true,
    value: {
      vendor_name: vendorName,
      payment_date: paymentDate,
      payment_mode: optionalText(input.payment_mode ?? input.paymentMode),
      reference_number: optionalText(
        input.reference_number ?? input.referenceNumber
      ),
      remarks: optionalText(input.remarks),
      allocations,
    },
  };
}

async function fetchInvoicesByIds(
  ids: string[],
  client: PoolClient | typeof db = db
) {
  if (ids.length === 0) return [];

  const invoicesResult = await client.query(
    `
    select
      i.*,
      coalesce(sum(a.allocated_amount), 0) as paid_amount
    from public.vehicle_expense_invoices i
    left join public.vehicle_expense_payment_allocations a on a.invoice_id = i.id
    where i.id = any($1::uuid[])
    group by i.id
    order by i.invoice_date desc, i.created_at desc
    `,
    [ids]
  );

  const itemsResult = await client.query(
    `
    select ii.*, v.vehicle_no
    from public.vehicle_expense_invoice_items ii
    left join public.vehicles v on v.id = ii.vehicle_id
    where ii.invoice_id = any($1::uuid[])
    order by ii.created_at asc, ii.id asc
    `,
    [ids]
  );

  const itemIds = itemsResult.rows.map((row) => row.id);
  const itemVehiclesResult =
    itemIds.length > 0
      ? await client.query(
          `
          select
            iv.invoice_item_id,
            v.id,
            v.vehicle_no,
            v.vehicle_type
          from public.vehicle_expense_invoice_item_vehicles iv
          join public.vehicles v on v.id = iv.vehicle_id
          where iv.invoice_item_id = any($1::uuid[])
          order by v.vehicle_no asc
          `,
          [itemIds]
        )
      : { rows: [] };

  const paymentsResult = await client.query(
    `
    select
      a.id,
      a.payment_batch_id,
      a.invoice_id,
      a.allocated_amount as amount,
      a.created_at,
      b.vendor_name,
      b.payment_date,
      b.payment_mode,
      b.reference_number,
      b.remarks,
      b.created_by
    from public.vehicle_expense_payment_allocations a
    join public.vehicle_expense_payment_batches b on b.id = a.payment_batch_id
    where a.invoice_id = any($1::uuid[])
    order by b.payment_date asc, b.created_at asc
    `,
    [ids]
  );

  const itemsByInvoice = new Map<string, VehicleExpenseInvoiceItem[]>();
  const vehiclesByItem = new Map<
    string,
    VehicleExpenseInvoiceItem["vehicles"]
  >();
  for (const row of itemVehiclesResult.rows) {
    const invoiceItemId = String(row.invoice_item_id);
    const vehicles = vehiclesByItem.get(invoiceItemId) ?? [];
    vehicles.push({
      id: String(row.id),
      vehicle_no: String(row.vehicle_no),
      vehicle_type: String(row.vehicle_type),
    });
    vehiclesByItem.set(invoiceItemId, vehicles);
  }

  for (const row of itemsResult.rows) {
    const item = mapItem(row, vehiclesByItem.get(String(row.id)) ?? []);
    const items = itemsByInvoice.get(item.invoice_id) ?? [];
    items.push(item);
    itemsByInvoice.set(item.invoice_id, items);
  }

  const paymentsByInvoice = new Map<string, VehicleExpenseInvoicePayment[]>();
  for (const row of paymentsResult.rows) {
    const payment = mapPayment(row);
    const payments = paymentsByInvoice.get(payment.invoice_id) ?? [];
    payments.push(payment);
    paymentsByInvoice.set(payment.invoice_id, payments);
  }

  return invoicesResult.rows.map((row) =>
    mapInvoice(
      row,
      itemsByInvoice.get(String(row.id)) ?? [],
      paymentsByInvoice.get(String(row.id)) ?? []
    )
  );
}

async function getInvoiceOrThrow(invoiceId: string) {
  const invoices = await fetchInvoicesByIds([invoiceId]);
  const invoice = invoices[0];
  if (!invoice) {
    throw Object.assign(new Error("Vehicle expense invoice not found"), {
      status: 404,
    });
  }

  return invoice;
}

async function insertItems(
  client: PoolClient,
  invoiceId: string,
  items: ValidInvoiceItemInput[]
) {
  for (const item of items) {
    const result = await client.query<{ id: string }>(
      `
      insert into public.vehicle_expense_invoice_items (
        invoice_id,
        vehicle_id,
        expense_type,
        description,
        amount
      )
      values ($1::uuid, $2::uuid, $3, $4, $5::numeric(12,2))
      returning id
      `,
      [
        invoiceId,
        item.vehicle_id,
        item.expense_type,
        item.description,
        item.amount,
      ]
    );

    const invoiceItemId = result.rows[0].id;

    for (const vehicleId of item.vehicle_ids) {
      await client.query(
        `
        insert into public.vehicle_expense_invoice_item_vehicles (
          invoice_item_id,
          vehicle_id
        )
        values ($1::uuid, $2::uuid)
        on conflict (invoice_item_id, vehicle_id) do nothing
        `,
        [invoiceItemId, vehicleId]
      );
    }
  }
}

function itemTotal(items: ValidInvoiceItemInput[]) {
  return roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
}

export async function listVehicleExpenseInvoices(params: {
  status?: string | null;
  vendorName?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  limit: number;
  offset: number;
}): Promise<VehicleExpenseInvoice[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (params.status) {
    values.push(params.status);
    clauses.push(`invoice_status = $${values.length}`);
  }

  if (params.vendorName) {
    values.push(`%${params.vendorName}%`);
    clauses.push(`i.vendor_name ilike $${values.length}`);
  }

  if (params.fromDate) {
    values.push(params.fromDate);
    clauses.push(`i.invoice_date >= $${values.length}::date`);
  }

  if (params.toDate) {
    values.push(params.toDate);
    clauses.push(`i.invoice_date <= $${values.length}::date`);
  }

  values.push(params.limit);
  const limitParam = values.length;
  values.push(params.offset);
  const offsetParam = values.length;

  const result = await db.query(
    `
    with invoice_paid as (
      select
        i.id,
        i.vendor_name,
        i.invoice_date,
        i.created_at,
        coalesce(sum(a.allocated_amount), 0) as paid_amount,
        case
          when round((i.total_amount - coalesce(sum(a.allocated_amount), 0))::numeric, 2) <= $${limitParam + 2}::numeric then 'paid'
          when coalesce(sum(a.allocated_amount), 0) > $${limitParam + 2}::numeric then 'partially_paid'
          else 'unpaid'
        end as invoice_status
      from public.vehicle_expense_invoices i
      left join public.vehicle_expense_payment_allocations a on a.invoice_id = i.id
      group by i.id
    )
    select i.id
    from invoice_paid i
    ${clauses.length ? `where ${clauses.join(" and ")}` : ""}
    order by i.invoice_date desc, i.created_at desc
    limit $${limitParam} offset $${offsetParam}
    `,
    [...values, PAYMENT_STATUS_EPSILON]
  );

  return fetchInvoicesByIds(result.rows.map((row) => String(row.id)));
}

export async function getVehicleExpenseInvoiceAnalytics(): Promise<VehicleExpenseInvoiceAnalytics> {
  const result = await db.query(
    `
    with invoice_paid as (
      select
        i.id,
        i.total_amount,
        coalesce(sum(a.allocated_amount), 0) as paid_amount,
        case
          when round((i.total_amount - coalesce(sum(a.allocated_amount), 0))::numeric, 2) <= $1::numeric then 'paid'
          when coalesce(sum(a.allocated_amount), 0) > $1::numeric then 'partially_paid'
          else 'unpaid'
        end as status
      from public.vehicle_expense_invoices i
      left join public.vehicle_expense_payment_allocations a on a.invoice_id = i.id
      group by i.id
    ),
    invoice_summary as (
      select
        count(*)::int as invoice_count,
        coalesce(sum(total_amount), 0) as invoice_total,
        count(*) filter (where status = 'paid')::int as paid_invoice_count,
        coalesce(sum(paid_amount), 0) as paid_amount,
        count(*) filter (where status = 'unpaid')::int as unpaid_invoice_count,
        coalesce(sum(total_amount) filter (where status = 'unpaid'), 0) as unpaid_amount,
        count(*) filter (where status = 'partially_paid')::int as partially_paid_invoice_count,
        coalesce(
          sum(total_amount - paid_amount) filter (where status = 'partially_paid'),
          0
        ) as partially_paid_outstanding,
        coalesce(sum(total_amount - paid_amount), 0) as outstanding_amount
      from invoice_paid
    ),
    payment_summary as (
      select
        count(*)::int as payment_batch_count,
        coalesce(sum(total_amount), 0) as payment_total,
        max(payment_date) as latest_payment_date,
        coalesce(avg(total_amount), 0) as average_payment_amount,
        coalesce(
          sum(total_amount) filter (
            where payment_date >= date_trunc('month', current_date)::date
              and payment_date < (date_trunc('month', current_date) + interval '1 month')::date
          ),
          0
        ) as this_month_paid,
        count(*) filter (
          where payment_date >= date_trunc('month', current_date)::date
            and payment_date < (date_trunc('month', current_date) + interval '1 month')::date
        )::int as payments_this_month
      from public.vehicle_expense_payment_batches
    )
    select *
    from invoice_summary
    cross join payment_summary
    `,
    [PAYMENT_STATUS_EPSILON]
  );

  const row = result.rows[0] ?? {};

  return {
    invoiceCount: Number(row.invoice_count ?? 0),
    invoiceTotal: Number(row.invoice_total ?? 0),
    paidInvoiceCount: Number(row.paid_invoice_count ?? 0),
    paidAmount: Number(row.paid_amount ?? 0),
    unpaidInvoiceCount: Number(row.unpaid_invoice_count ?? 0),
    unpaidAmount: Number(row.unpaid_amount ?? 0),
    partiallyPaidInvoiceCount: Number(row.partially_paid_invoice_count ?? 0),
    partiallyPaidOutstanding: Number(row.partially_paid_outstanding ?? 0),
    outstandingAmount: Number(row.outstanding_amount ?? 0),
    paymentBatchCount: Number(row.payment_batch_count ?? 0),
    paymentTotal: Number(row.payment_total ?? 0),
    latestPaymentDate: row.latest_payment_date
      ? toDateOnly(row.latest_payment_date)
      : null,
    averagePaymentAmount: Number(row.average_payment_amount ?? 0),
    thisMonthPaid: Number(row.this_month_paid ?? 0),
    paymentsThisMonth: Number(row.payments_this_month ?? 0),
  };
}

export async function getVehicleExpenseInvoice(invoiceId: string) {
  return getInvoiceOrThrow(invoiceId);
}

export async function createVehicleExpenseInvoice(
  input: ValidInvoiceInput & { items: ValidInvoiceItemInput[] },
  createdBy: string | null
): Promise<VehicleExpenseInvoice> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const totalAmount = itemTotal(input.items);
    const invoiceResult = await client.query(
      `
      insert into public.vehicle_expense_invoices (
        vendor_name,
        invoice_number,
        invoice_date,
        due_date,
        total_amount,
        status,
        remarks,
        created_by
      )
      values ($1, $2, $3::date, $4::date, $5::numeric(12,2), 'unpaid', $6, $7::uuid)
      returning id
      `,
      [
        input.vendor_name,
        input.invoice_number,
        input.invoice_date,
        input.due_date,
        totalAmount,
        input.remarks,
        createdBy,
      ]
    );

    const invoiceId = String(invoiceResult.rows[0].id);
    await insertItems(client, invoiceId, input.items);
    await client.query("COMMIT");

    return getInvoiceOrThrow(invoiceId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function lockInvoiceForChange(client: PoolClient, invoiceId: string) {
  const existing = await client.query<{ id: string }>(
    `
    select id
    from public.vehicle_expense_invoices
    where id = $1::uuid
    for update
    `,
    [invoiceId]
  );

  if (!existing.rows[0]) {
    throw Object.assign(new Error("Vehicle expense invoice not found"), {
      status: 404,
    });
  }
}

async function getInvoiceAllocationState(
  client: PoolClient,
  invoiceId: string
) {
  const result = await client.query<{
    allocation_count: string | number;
    payment_batch_count: string | number;
  }>(
    `
    select
      count(a.id)::int as allocation_count,
      count(b.id)::int as payment_batch_count
    from public.vehicle_expense_payment_allocations a
    left join public.vehicle_expense_payment_batches b
      on b.id = a.payment_batch_id
    where a.invoice_id = $1::uuid
    `,
    [invoiceId]
  );
  const row = result.rows[0];

  return {
    allocationCount: Number(row?.allocation_count ?? 0),
    paymentBatchCount: Number(row?.payment_batch_count ?? 0),
  };
}

export async function updateVehicleExpenseInvoice(
  invoiceId: string,
  input: ValidInvoiceInput
): Promise<VehicleExpenseInvoice> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await lockInvoiceForChange(client, invoiceId);
    const allocationState = await getInvoiceAllocationState(client, invoiceId);
    const hasPayments = allocationState.allocationCount > 0;

    if (input.items && hasPayments) {
      throw Object.assign(
        new Error(
          "Invoice items cannot be changed because this invoice has already been allocated to a payment batch."
        ),
        { status: 400 }
      );
    }

    const totalAmount = input.items ? itemTotal(input.items) : null;

    await client.query(
      `
      update public.vehicle_expense_invoices
      set
        vendor_name = $2,
        invoice_number = $3,
        invoice_date = $4::date,
        due_date = $5::date,
        remarks = $6
        ${input.items ? ", total_amount = $7::numeric(12,2)" : ""}
      where id = $1::uuid
      `,
      input.items
        ? [
            invoiceId,
            input.vendor_name,
            input.invoice_number,
            input.invoice_date,
            input.due_date,
            input.remarks,
            totalAmount,
          ]
        : [
            invoiceId,
            input.vendor_name,
            input.invoice_number,
            input.invoice_date,
            input.due_date,
            input.remarks,
          ]
    );

    if (input.items) {
      await client.query(
        `
        delete from public.vehicle_expense_invoice_items
        where invoice_id = $1::uuid
        `,
        [invoiceId]
      );
      await insertItems(client, invoiceId, input.items);
    }

    await syncInvoiceStatuses(client, [invoiceId]);
    await client.query("COMMIT");

    return getInvoiceOrThrow(invoiceId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteVehicleExpenseInvoice(
  invoiceId: string
): Promise<void> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await lockInvoiceForChange(client, invoiceId);
    const allocationState = await getInvoiceAllocationState(client, invoiceId);

    if (allocationState.paymentBatchCount > 0) {
      throw Object.assign(
        new Error(
          "Invoice cannot be deleted because it has already been allocated to a payment batch."
        ),
        { status: 400 }
      );
    }

    if (allocationState.allocationCount > 0) {
      throw Object.assign(
        new Error(
          "Invoice cannot be deleted because allocation records still reference it."
        ),
        { status: 400 }
      );
    }

    await client.query(
      `delete from public.vehicle_expense_invoices where id = $1::uuid`,
      [invoiceId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createVehicleExpenseInvoicePayment(
  invoiceId: string,
  input: ValidInvoicePaymentInput,
  createdBy: string | null
): Promise<VehicleExpenseInvoice> {
  const invoice = await getInvoiceOrThrow(invoiceId);
  await createVehicleExpensePaymentBatch(
    {
      vendor_name: invoice.vendor_name,
      payment_date: input.payment_date,
      payment_mode: input.payment_mode,
      reference_number: input.reference_number,
      remarks: input.remarks,
      allocations: [
        {
          invoice_id: invoiceId,
          allocated_amount: input.amount,
        },
      ],
    },
    createdBy
  );

  return getInvoiceOrThrow(invoiceId);
}

export async function deleteVehicleExpenseInvoicePayment(
  invoiceId: string,
  paymentId: string
): Promise<VehicleExpenseInvoice> {
  const allocation = await db.query<{ payment_batch_id: string }>(
    `
    select payment_batch_id
    from public.vehicle_expense_payment_allocations
    where id = $1::uuid
      and invoice_id = $2::uuid
    `,
    [paymentId, invoiceId]
  );

  const paymentBatchId = allocation.rows[0]?.payment_batch_id;

  if (!paymentBatchId) {
    throw Object.assign(new Error("Vehicle expense invoice payment not found"), {
      status: 404,
    });
  }

  await deleteVehicleExpensePaymentBatch(paymentBatchId);

  return getInvoiceOrThrow(invoiceId);
}

async function fetchPaymentBatchesByIds(
  ids: string[],
  client: PoolClient | typeof db = db
) {
  if (ids.length === 0) return [];

  const batchesResult = await client.query(
    `
    select
      b.*,
      count(a.id)::int as invoice_count
    from public.vehicle_expense_payment_batches b
    left join public.vehicle_expense_payment_allocations a on a.payment_batch_id = b.id
    where b.id = any($1::uuid[])
    group by b.id
    order by b.payment_date desc, b.created_at desc
    `,
    [ids]
  );

  const allocationsResult = await client.query(
    `
    select
      a.*,
      i.vendor_name as invoice_vendor_name,
      i.invoice_number,
      i.invoice_date,
      i.status as invoice_status,
      i.total_amount as invoice_total_amount,
      coalesce(sum(all_paid.allocated_amount), 0) as invoice_paid_amount
    from public.vehicle_expense_payment_allocations a
    join public.vehicle_expense_invoices i on i.id = a.invoice_id
    left join public.vehicle_expense_payment_allocations all_paid
      on all_paid.invoice_id = i.id
    where a.payment_batch_id = any($1::uuid[])
    group by a.id, i.id
    order by i.invoice_date asc, i.created_at asc
    `,
    [ids]
  );

  const allocationsByBatchId = new Map<
    string,
    VehicleExpensePaymentBatchAllocation[]
  >();

  for (const row of allocationsResult.rows) {
    const allocation = mapBatchAllocation(row);
    const allocations =
      allocationsByBatchId.get(allocation.payment_batch_id) ?? [];
    allocations.push(allocation);
    allocationsByBatchId.set(allocation.payment_batch_id, allocations);
  }

  return batchesResult.rows.map((row) =>
    mapPaymentBatch(
      row,
      allocationsByBatchId.get(String(row.id)) ?? []
    )
  );
}

export async function listVehicleExpensePaymentBatches(params: {
  vendorName?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  limit: number;
  offset: number;
}): Promise<VehicleExpensePaymentBatch[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (params.vendorName) {
    values.push(`%${params.vendorName}%`);
    clauses.push(`vendor_name ilike $${values.length}`);
  }

  if (params.fromDate) {
    values.push(params.fromDate);
    clauses.push(`payment_date >= $${values.length}::date`);
  }

  if (params.toDate) {
    values.push(params.toDate);
    clauses.push(`payment_date <= $${values.length}::date`);
  }

  values.push(params.limit);
  const limitParam = values.length;
  values.push(params.offset);
  const offsetParam = values.length;

  const result = await db.query(
    `
    select id
    from public.vehicle_expense_payment_batches
    ${clauses.length ? `where ${clauses.join(" and ")}` : ""}
    order by payment_date desc, created_at desc
    limit $${limitParam} offset $${offsetParam}
    `,
    values
  );

  return fetchPaymentBatchesByIds(result.rows.map((row) => String(row.id)));
}

export async function getVehicleExpensePaymentBatch(paymentBatchId: string) {
  const batches = await fetchPaymentBatchesByIds([paymentBatchId]);
  const batch = batches[0];
  if (!batch) {
    throw Object.assign(new Error("Vehicle expense payment batch not found"), {
      status: 404,
    });
  }

  return batch;
}

async function syncInvoiceStatuses(client: PoolClient, invoiceIds: string[]) {
  const uniqueInvoiceIds = [...new Set(invoiceIds)];
  if (uniqueInvoiceIds.length === 0) return;

  await client.query(
    `
    with invoice_paid as (
      select
        i.id,
        i.total_amount,
        coalesce(sum(a.allocated_amount), 0) as paid_amount
      from public.vehicle_expense_invoices i
      left join public.vehicle_expense_payment_allocations a on a.invoice_id = i.id
      where i.id = any($1::uuid[])
      group by i.id
    )
    update public.vehicle_expense_invoices i
    set status = case
        when round((invoice_paid.total_amount - invoice_paid.paid_amount)::numeric, 2) <= $2::numeric then 'paid'
        when invoice_paid.paid_amount > $2::numeric then 'partially_paid'
        else 'unpaid'
      end,
      updated_at = now()
    from invoice_paid
    where i.id = invoice_paid.id
    `,
    [uniqueInvoiceIds, PAYMENT_STATUS_EPSILON]
  );
}

async function ensurePaymentAllocationCrossBatchSupport(client: PoolClient) {
  const invoiceOnlyConstraints = await client.query<{ conname: string }>(
    `
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join pg_attribute a
      on a.attrelid = t.oid
     and a.attnum = c.conkey[1]
    where n.nspname = 'public'
      and t.relname = 'vehicle_expense_payment_allocations'
      and c.contype = 'u'
      and array_length(c.conkey, 1) = 1
      and a.attname = 'invoice_id'
    `
  );

  for (const row of invoiceOnlyConstraints.rows) {
    await client.query(
      `alter table public.vehicle_expense_payment_allocations drop constraint if exists ${quotePgIdentifier(
        row.conname
      )}`
    );
  }

  await client.query(`
    create unique index if not exists vehicle_expense_payment_allocations_batch_invoice_uidx
    on public.vehicle_expense_payment_allocations (payment_batch_id, invoice_id)
  `);
}

export async function createVehicleExpensePaymentBatch(
  input: ValidPaymentBatchInput,
  createdBy: string | null
): Promise<VehicleExpensePaymentBatch> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await ensurePaymentAllocationCrossBatchSupport(client);

    const invoiceIds = input.allocations.map((allocation) => allocation.invoice_id);
    const duplicateInvoiceIds = invoiceIds.filter(
      (invoiceId, index) => invoiceIds.indexOf(invoiceId) !== index
    );

    if (duplicateInvoiceIds.length > 0) {
      throw Object.assign(
        new Error(
          "This invoice is already included in this payment batch. If you want to split the payment across different dates, create another payment batch later."
        ),
        { status: 400 }
      );
    }

    const lockedInvoices = await client.query(
      `
      select id
      from public.vehicle_expense_invoices
      where id = any($1::uuid[])
      for update
      `,
      [invoiceIds]
    );

    if (lockedInvoices.rows.length !== input.allocations.length) {
      throw Object.assign(new Error("One or more invoices were not found"), {
        status: 400,
      });
    }

    const invoices = await client.query<{
      id: string;
      invoice_number: string | null;
      vendor_name: string;
      total_amount: string | number;
      paid_amount: string | number;
    }>(
      `
      select
        i.id,
        i.invoice_number,
        i.vendor_name,
        i.total_amount,
        coalesce(sum(a.allocated_amount), 0) as paid_amount
      from public.vehicle_expense_invoices i
      left join public.vehicle_expense_payment_allocations a on a.invoice_id = i.id
      where i.id = any($1::uuid[])
      group by i.id
      `,
      [invoiceIds]
    );

    const invoicesById = new Map(invoices.rows.map((row) => [row.id, row]));

    for (const [index, allocation] of input.allocations.entries()) {
      const invoice = invoicesById.get(allocation.invoice_id);
      const rowLabel = `allocation ${index + 1}`;

      if (
        !Number.isFinite(allocation.allocated_amount) ||
        allocation.allocated_amount <= 0
      ) {
        throw Object.assign(
          new Error(`Allocated amount for ${rowLabel} must be greater than zero`),
          { status: 400 }
        );
      }

      if (!invoice) {
        throw Object.assign(
          new Error(`Invoice was not found for ${rowLabel}`),
          { status: 400 }
        );
      }

      if (invoice.vendor_name !== input.vendor_name) {
        throw Object.assign(
          new Error(
            `Invoice ${
              invoice.invoice_number ?? allocation.invoice_id
            } for ${rowLabel} does not belong to vendor ${input.vendor_name}`
          ),
          { status: 400 }
        );
      }

      const outstanding = roundMoney(
        Number(invoice.total_amount) - Number(invoice.paid_amount)
      );

      if (allocation.allocated_amount > outstanding) {
        throw Object.assign(
          new Error(
            `Allocated amount for invoice ${
              invoice.invoice_number ?? allocation.invoice_id
            } at ${rowLabel} cannot exceed outstanding balance of ${outstanding}`
          ),
          { status: 400 }
        );
      }
    }

    const totalAmount = roundMoney(
      input.allocations.reduce(
        (sum, allocation) => sum + allocation.allocated_amount,
        0
      )
    );

    const batchResult = await client.query(
      `
      insert into public.vehicle_expense_payment_batches (
        vendor_name,
        payment_date,
        payment_mode,
        reference_number,
        remarks,
        total_amount,
        created_by
      )
      values ($1, $2::date, $3, $4, $5, $6::numeric(12,2), $7::uuid)
      returning id
      `,
      [
        input.vendor_name,
        input.payment_date,
        input.payment_mode,
        input.reference_number,
        input.remarks,
        totalAmount,
        createdBy,
      ]
    );

    const batchId = String(batchResult.rows[0].id);

    for (const allocation of input.allocations) {
      await client.query(
        `
        insert into public.vehicle_expense_payment_allocations (
          payment_batch_id,
          invoice_id,
          allocated_amount
        )
        values ($1::uuid, $2::uuid, $3::numeric(12,2))
        `,
        [batchId, allocation.invoice_id, allocation.allocated_amount]
      );
    }

    await syncInvoiceStatuses(client, invoiceIds);

    await client.query("COMMIT");

    return getVehicleExpensePaymentBatch(batchId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteVehicleExpensePaymentBatch(
  paymentBatchId: string
): Promise<void> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `
      select id
      from public.vehicle_expense_payment_batches
      where id = $1::uuid
      for update
      `,
      [paymentBatchId]
    );

    if (!existing.rows[0]) {
      throw Object.assign(new Error("Vehicle expense payment batch not found"), {
        status: 404,
      });
    }

    const allocations = await client.query<{ invoice_id: string }>(
      `
      select invoice_id
      from public.vehicle_expense_payment_allocations
      where payment_batch_id = $1::uuid
      `,
      [paymentBatchId]
    );
    const affectedInvoiceIds = [
      ...new Set(allocations.rows.map((row) => String(row.invoice_id))),
    ];

    await client.query(
      `
      delete from public.vehicle_expense_payment_allocations
      where payment_batch_id = $1::uuid
      `,
      [paymentBatchId]
    );

    await client.query(
      `
      delete from public.vehicle_expense_payment_batches
      where id = $1::uuid
      `,
      [paymentBatchId]
    );

    await syncInvoiceStatuses(client, affectedInvoiceIds);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

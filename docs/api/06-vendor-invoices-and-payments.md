# API — Vendor Invoices & Payments

> Status: Current (active money system for the Vehicle Tracker). Verified 2026-07-21.
> Routes: `src/app/api/vehicle-expense-invoices/**`,
> `src/app/api/vehicle-expense-payment-batches/**`. Logic:
> `src/lib/vehicle-expense-invoices.ts`. All `requireAuth`, `runtime = "nodejs"`.
> Schema + triggers: [database/01](../database/01-schema-overview.md).
> Frontend: [frontend/04](../frontend/04-vehicle-tracker.md).

This is how the company records what it owes vendors for vehicle/general expenses and how
it pays them. It replaced the legacy "Other Expenses / Paid Expenses" system
([api/07](07-legacy-vehicle-expenses.md)).

---

## The model

```
vehicle_expense_invoices          one invoice (a vendor bill)
  └── vehicle_expense_invoice_items          line items (amount must sum to invoice total)
        └── vehicle_expense_invoice_item_vehicles   optional: split an item across vehicles

vehicle_expense_payment_batches   one payment you made to a vendor
  └── vehicle_expense_payment_allocations    splits that payment across one or more invoices
```

Key idea: **a payment is not tied to a single invoice.** One payment batch is allocated
across invoices; one invoice can receive allocations from many batches. An invoice's
**paid total = sum of its allocations**, and its **status is derived** from that
(`unpaid` / `partially_paid` / `paid`).

**The database enforces the arithmetic** via deferred constraint triggers (see
[DECISIONS.md](../DECISIONS.md) §4): item sum = invoice total; batch total = sum of its
allocations; allocations to an invoice can't exceed the invoice total; `status` is
re-synced on every change. So these routes can trust the DB to reject bad money states —
a violation surfaces as a 500 with the trigger's message.

---

## Invoices

### GET `/api/vehicle-expense-invoices`
List invoices. Query: `?status` (`unpaid`|`partially_paid`|`paid`, else 400),
`?vendorName`, `?fromDate`, `?toDate` (ISO, else 400), `?limit`/`?offset`.
→ `{ ok, data }` via `listVehicleExpenseInvoices`.

### POST `/api/vehicle-expense-invoices`
Create an invoice with its items (`validateCreateInvoiceInput` →
`createVehicleExpenseInvoice`). **201** on success. The item amounts must sum to the
invoice `total_amount` or the DB trigger rejects it.

### GET `/api/vehicle-expense-invoices/[id]`
Full invoice with items, vehicle links, and allocations (`getVehicleExpenseInvoice`).

### PATCH `/api/vehicle-expense-invoices/[id]`
Update an invoice (accepts both snake_case and camelCase field names —
`validateUpdateInvoiceInput` → `updateVehicleExpenseInvoice`).

### DELETE `/api/vehicle-expense-invoices/[id]`
Delete the invoice (cascades to items; `deleteVehicleExpenseInvoice`).
→ `{ ok, data: { id } }`.

### GET `/api/vehicle-expense-invoices/analytics`
Vendor-invoice summary dashboard (`getVehicleExpenseInvoiceAnalytics`): counts, totals,
paid/unpaid/partially-paid breakdowns, outstanding total.

**Touches:** `vehicle_expense_invoices`, `..._invoice_items`, `..._invoice_item_vehicles`,
`..._payment_allocations`.

---

## Invoice payments (single-invoice convenience)

### POST `/api/vehicle-expense-invoices/[id]/payments`
Record a payment against **one** invoice (`validateCreatePaymentInput` →
`createVehicleExpenseInvoicePayment(id, value, auth.user.id)` — `created_by` comes from
the session, not the body). **201** on success.

### DELETE `/api/vehicle-expense-invoices/[id]/payments/[paymentId]`
Remove that payment (`deleteVehicleExpenseInvoicePayment`). Invoice status re-syncs via
trigger.

> Under the hood these still flow through the batch/allocation model — the invoice paid
> total is always `sum(allocations)`.

---

## Payment batches (vendor-level payments)

### GET `/api/vehicle-expense-payment-batches`
List batches. Query: `?vendorName`, `?fromDate`, `?toDate` (ISO, else 400),
`?limit`/`?offset`. → `{ ok, data }`.

### POST `/api/vehicle-expense-payment-batches`
Create a batch and its allocations across invoices (`validateCreatePaymentBatchInput` →
`createVehicleExpensePaymentBatch`). **201**. Batch total must equal the sum of
allocations (DB trigger); over-allocating an invoice is rejected.

### GET `/api/vehicle-expense-payment-batches/[id]`
Batch detail with its allocations (`getVehicleExpensePaymentBatch`).

### DELETE `/api/vehicle-expense-payment-batches/[id]`
Delete the batch (cascades allocations; affected invoices re-sync status).
→ `{ ok, data: { id } }`.

**Touches:** `vehicle_expense_payment_batches`, `..._payment_allocations`,
`vehicle_expense_invoices` (status re-sync via trigger).

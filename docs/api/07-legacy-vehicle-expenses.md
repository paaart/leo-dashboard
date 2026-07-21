# API — Legacy Vehicle Expenses

> Status: **LEGACY — retained but hidden.** Verified 2026-07-21.
> Routes: `src/app/api/vehicle-expenses/**`, `src/app/api/vehicle-expense-payments/route.ts`.
> Logic: `src/lib/fuel-tracker/` (the `*VehicleExpense*` functions). All `requireAuth`.

This is the **old** "Other Expenses / Paid Expenses" system. It has been superseded by
vendor invoices ([api/06](06-vendor-invoices-and-payments.md)). The tabs are hidden from
navigation and its data was migrated into the vendor-invoice tables by
`202607010001_migrate_legacy_vehicle_expenses_to_vendor_invoices.sql`. The routes and
tables are kept intact for a future cleanup — see [DECISIONS.md](../DECISIONS.md) §8.

**Do not build new features on these routes.** They're documented so you recognise them
and don't confuse them with vendor invoices.

---

## Why it still matters

- The tables (`vehicle_expenses`, `vehicle_expense_payments`,
  `vehicle_expense_payment_items`) still exist and these routes still read/write them.
- **The fuel-dashboard analytics expense figures still read `vehicle_expenses`**
  (see [api/05](05-fuel-dashboard-analytics.md)) — so this table isn't fully dead yet.
- Two overlapping money systems is a known risk ([PROJECT_STATE.md](../PROJECT_STATE.md)).

---

## Expenses

### GET `/api/vehicle-expenses`
List legacy expenses. Query: `?vehicleId`/`?vehicle_id`, `?fromDate`, `?toDate` (ISO),
`?limit`/`?offset`. → `{ ok, data }` via `listVehicleExpenses`.

### POST `/api/vehicle-expenses`
Create an expense (`validateVehicleExpenseInput` → `createVehicleExpense`). **201**.
`vehicle_id` is optional (general expenses allowed since
`20260613010000_allow_general_vehicle_expenses.sql`).

### PATCH / DELETE `/api/vehicle-expenses/[id]`
Update (`validateVehicleExpenseUpdateInput` → `updateVehicleExpense`) or delete
(`deleteVehicleExpense` → `{ ok, data: { id } }`).

**Touches:** `vehicle_expenses`.

---

## Payments

### GET `/api/vehicle-expense-payments`
List legacy payment headers. Query: `?fromDate`, `?toDate` (ISO), `?paymentMode`,
`?limit`/`?offset`.

### POST `/api/vehicle-expense-payments`
Create a payment header + items across expenses. Body:
`{ paymentDate, paymentMode?, referenceNumber?, remarks?, expenseIds[] }` →
`createVehicleExpensePayment`. **201**.

The legacy model is **one payment per expense** (`vehicle_expense_payment_items.expense_id`
is unique) — the exact limitation the vendor-invoice batch/allocation model was built to
remove.

**Touches:** `vehicle_expense_payments`, `vehicle_expense_payment_items`,
`vehicle_expenses` (status).

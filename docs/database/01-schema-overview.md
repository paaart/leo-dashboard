# Database Schema Overview

> Status: Current. Verified 2026-07-21.
> Source of truth: for tables marked **[migration]**, the SQL in `supabase/migrations/`.
> For tables marked **[supabase-only]**, the shape here is read from the application
> code that queries them — they were created directly in Supabase and are **not** in
> version control (see [02-migrations-and-drift.md](02-migrations-and-drift.md)).

All tables are in the `public` schema. `id` is `uuid default gen_random_uuid()` unless
noted. Most tables have `created_at`/`updated_at` timestamptz with an `updated_at`
trigger.

---

## Auth / users

### `profiles` **[migration]**
The app-level user, bridging Supabase `auth.users` to a username + role + status.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `auth_user_id` | uuid | unique, FK → `auth.users(id)` on delete cascade |
| `email` | text | unique, not blank |
| `username` | text | unique (lowercased), `^[A-Za-z0-9_-]+$` |
| `full_name` | text | nullable |
| `phone` | text | nullable |
| `role` | text | `user` \| `admin` (default `user`) |
| `status` | text | `pending` \| `active` \| `inactive` \| `rejected` (default `active`) |

Login requires `status = 'active'`. Signup creates `status = 'pending'`.

---

## Transport calculators

### `transport_quotes` **[supabase-only]**
Domestic household-goods quotes. Columns (from `src/lib/api.ts`): `source`,
`destination`, `packaging`, `transportation`.

### `vehicle_quotes` **[supabase-only]**
Domestic vehicle-transport quotes. Columns: `source`, `destination`, `size`,
`carrier_cost`, `leo_cost`.

### `transport_distances` **[supabase-only]**
Source→destination distances. Columns: `source`, `destination`, `distance`.

### `international_quotes` **[supabase-only]**
Saved international shipping quotes (written by `/api/international/save`). Columns:
`customer_name`, `origin_city`, `origin_port`, `destination_city`,
`destination_country`, `destination_port`, `mode`, `volume_cbm`, `packing_charges`,
`handling_charges`, `origin_charges_custom`, `ocean_freight`, `dthc`,
`destination_charges`, `calculate_gst_val`, plus timestamps.

---

## Loans & Advances **[supabase-only]**

### `employees`
`id` uuid, `name`, `employee_code`, `display` (bool — soft hide), `created_at`, and
company/location association (`company_id`, `location_id` referenced by
`ManageEmployees`).

### `employee_loans`
The loan ledger. `id`, `employee_id` (FK → employees), `amount` (numeric —
**negative for repayments**), `type` (`loan` \| `advance` \| `repayment`), `remarks`,
`payment_date`, `created_at`.

### `companies`, `locations`
Master lists used for employee association (and `locations` is reused by warehouse pod
client-id generation). `locations.name` drives the warehouse location code.

**RPC:** `get_outstanding_loans()` — returns outstanding balance per employee. Called
from the browser (`supabase.rpc`).

---

## Fuel & vehicles

### `vehicles` **[migration]**
| Column | Type | Notes |
|---|---|---|
| `vehicle_no` | text | unique, not blank |
| `vehicle_type` | text | not blank |
| `company` | text | nullable |
| `starting_odometer` | numeric(12,2) | ≥ 0, default 0 |
| `status` | text | `active` \| `inactive` |

### `fuel_entries` **[migration]**
One fuel refill. FK `vehicle_id` → `vehicles` (on delete restrict).

Key columns: `fuel_date`, `fuel_amount` (>0), `fuel_liters` (>0), `odometer_reading`
(>0), `previous_odometer_reading`, `km_driven`, `approx_mileage`, `fuel_rate`,
`cost_per_km`, `bill_image_path`, `meter_image_path`, `remarks`, `driver_name`,
`driver_mobile` (both now optional), `company` (snapshot), and a soft
`warning_flag`/`warning_reason` pair for abnormality hints. `km_driven` may be negative
only when `warning_flag = true`.

---

## Vehicle expenses — LEGACY (retained, hidden) **[migration]**

Superseded by the vendor-invoice system below. See
[api/07-legacy-vehicle-expenses.md](../api/07-legacy-vehicle-expenses.md).

### `vehicle_expenses`
`expense_date`, `vehicle_id` (nullable — general expenses allowed), `expense_type`,
`description`, `amount` (>0), `vendor`, `invoice_reference`, `city`, `payment_mode`,
`company`, `status` (`pending` \| `paid`), `paid_at`, `payment_id`.

### `vehicle_expense_payments` / `vehicle_expense_payment_items`
A payment header and its per-expense items. `payment_items.expense_id` is unique (one
payment per expense — the constraint the newer system removes).

---

## Vendor invoices — ACTIVE **[migration]**

The current money system for the Vehicle Tracker. Invariants enforced by **database
triggers** (see [DECISIONS.md](../DECISIONS.md) §4). See
[api/06-vendor-invoices-and-payments.md](../api/06-vendor-invoices-and-payments.md).

### `vehicle_expense_invoices`
`vendor_name` (not blank), `invoice_number`, `invoice_date`, `due_date`,
`total_amount` (numeric(14,2), >0), `status` (`unpaid` \| `partially_paid` \| `paid` —
**derived by trigger**), `remarks`, `created_by`.

### `vehicle_expense_invoice_items`
FK `invoice_id` (cascade). `vehicle_id` (nullable → general item), `expense_type`,
`description`, `amount` (>0). **Trigger:** sum of item amounts must equal the invoice
`total_amount`.

### `vehicle_expense_invoice_item_vehicles`
Many-to-many link: one invoice item can be split across multiple vehicles.
`(invoice_item_id, vehicle_id)` unique.

### `vehicle_expense_payment_batches`
A single vendor payment. `vendor_name`, `payment_date`, `payment_mode`,
`reference_number`, `remarks`, `total_amount` (numeric(14,2), >0). **Trigger:** total
must equal the sum of its allocations.

### `vehicle_expense_payment_allocations`
Splits one payment batch across invoices. FK `payment_batch_id` (cascade), `invoice_id`
(restrict), `allocated_amount` (>0). `(payment_batch_id, invoice_id)` unique.
**Trigger:** total allocated to an invoice can't exceed its total; invoice status is
re-synced on change.

### `vehicle_expense_invoice_payments` (older, single-invoice payments)
Present from `202606300001`; the batch/allocation model in `202606300002` supersedes it
for new payments and redefines `vehicle_expense_invoice_paid_total()` to read from
allocations.

**Helper functions / triggers of note:** `vehicle_expense_invoice_item_total`,
`vehicle_expense_invoice_paid_total`, `sync_vehicle_expense_invoice_status`, and a set
of deferred constraint triggers that validate totals and keep `status` correct.

---

## Warehouse **[supabase-only, except alert dismissals]**

The warehouse core tables are **not** in the migrations folder — they were built in
Supabase. Shapes below are read from `src/lib/warehouse/types.ts` and the SQL in
`src/app/api/warehouse/pods/create/route.ts`. See
[api/08](../api/08-warehouse-pods-and-cycles.md) / [api/09](../api/09-warehouse-transactions.md).

Custom Postgres **enum types** exist for warehouse: `warehouse_billing_interval`
(`monthly`/`quarterly`/`half_yearly`/`yearly`), `warehouse_insurance_provider`
(`none`/`leo`), `warehouse_pod_status` (`active`/`closed`), `warehouse_tx_type`
(`charge`/`payment`/`adjustment`).

### `warehouse_pods`
The current config for one storage client. Key columns: `client_id` (human id, format
`LOC-DDMMYY-NAME-SEQ`), `name`, `email`, `contact`, `company_id`, `location_id`,
`start_date`, `billing_start_date`, `duration_months`, `billing_interval`, `rate`,
`mode_of_payment`, `old_outstanding`, `insurance_provider`, `insurance_value`,
`insurance_idv`, `last_charge_date`, `next_charge_date`, `next_payment_date`, `status`.

### `warehouse_pod_cycles`
Immutable billing periods (each renewal = a new cycle). Snapshots config at cycle start:
`pod_id`, `cycle_start`, `cycle_end`, `status` (`active`/`closed`), `duration_months`,
`rate_at_start`, `billing_interval_at_start`, `insurance_provider_at_start`,
`insurance_value_at_start`, `insurance_idv_at_start`.

### `warehouse_pod_transactions`
The ledger — **single source of truth for balances**. `pod_id`, `cycle_id`, `type`
(`charge`/`payment`/`adjustment`), `amount` (charges positive, payments negative),
`gst_rate` (18 on auto charges, 0 on payments/opening), `tx_date`, `tx_month`
(month bucket, used to dedupe accrual), `title`, `note`.

### `warehouse_client_id_seq`
Per-`(location_id, start_date)` sequence backing the `client_id` generator.

### `warehouse_payment_alert_dismissals` **[migration]**
Persists dismissed payment alerts. `pod_id`, `next_payment_date`, `dismissed_by`,
`dismissed_at`. `(pod_id, next_payment_date)` unique — dismissing one alert doesn't
suppress the next cycle's.

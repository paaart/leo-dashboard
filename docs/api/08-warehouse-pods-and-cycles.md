# API — Warehouse Pods & Cycles

> Status: Current. Verified 2026-07-21.
> Routes: `src/app/api/warehouse/pods/**` (except transactions + accrual). All
> **admin-only** (`requireAdmin`) and use the **raw `pg` Pool** (`src/lib/db.ts`) with
> `BEGIN/COMMIT`. Concepts: [database/01](../database/01-schema-overview.md) (warehouse).
> Frontend: [frontend/05](../frontend/05-warehouse.md).

A **pod** is one storage client's agreement (current config). A **cycle** is an immutable
billing period; every renewal creates a new cycle. Money lives in the transaction ledger
([api/09](09-warehouse-transactions.md)); balances are derived from it.

---

## GET `/api/warehouse/pods`
List pods with computed balances. Query: `?status` (default `active`), `?limit`
(default 500), `?offset`.

Balances are computed in SQL from the ledger via the shared
`WAREHOUSE_ACTIVE_POD_BALANCE_CTES` (in `src/lib/warehouse/podBalanceSql.ts`). Each row
includes `total_charged`, `total_paid`, `total_due` (all GST-inclusive), a
`payment_ratio`, and a **severity band**:

```
payment_ratio >= 0.7 → "green"
payment_ratio >= 0.3 → "yellow"
otherwise            → "red"
```

Plus config fields, `company_name`/`location_name` (joined), `next_charge_date`,
`next_payment_date`, and last charge/payment dates.

**Touches:** `warehouse_pods`, `warehouse_pod_transactions`, `companies`, `locations`.

---

## POST `/api/warehouse/pods/create`
Create a pod. This is the heaviest route in the module — one transaction that:

1. Derives a human `client_id`: `LOC-DDMMYY-NAME-SEQ` (location code from `locations`,
   date from `start_date`, 3-letter name code, per-`(location, start_date)` sequence from
   `warehouse_client_id_seq`).
2. Inserts the pod (`warehouse_pods`) and its first **active cycle**
   (`warehouse_pod_cycles`, snapshotting rate/interval/insurance).
3. Optionally seeds an **opening outstanding/advance** transaction (`old_outstanding`,
   idempotent by title).
4. Optionally seeds a one-time **Leo insurance** charge.
5. **Back-accrues** interval charges from `billing_start_date` up to today (GST 18%),
   anchored on the billing-start day-of-month, deduped by `tx_month`.
6. Computes and stores the correct `next_charge_date` (next anchor day after today).

**Body (key fields):** `name`, `contact`, `location_id`, `start_date`,
`billing_start_date` (both `YYYY-MM-DD`), `duration_months` (≥1), `billing_interval`
(`monthly`/`quarterly`/`half_yearly`/`yearly`), `rate` (>0), `insurance_provider`
(`none`/`leo`) + `insurance_value`/`insurance_idv` when `leo`, optional `email`,
`company_id`, `mode_of_payment`, `old_outstanding`.

**Success:** `{ ok: true, data: { id, client_id } }`. Validation failures → 400; anything
inside the transaction fails → `ROLLBACK` + 500.

---

## PATCH `/api/warehouse/pods/update-client`
Edit contact fields only: `{ podId, name, contact, email? }`. Does not touch billing
config. → `{ ok, data }` with the updated row.

## DELETE `/api/warehouse/pods/delete` (`?podId`)
**Hard delete** — removes the pod's transactions, then its cycles, then the pod, in one
transaction. 404 if the pod doesn't exist. This is destructive and irreversible; there's
no soft-delete.

## GET `/api/warehouse/pods/closed`
Paginated list of `closed` pods. Query: `?page` (default 1), `?pageSize` (default 50,
max 200), `?search` (ilike over name / client_id / contact / email / company / location).

---

## Cycles

### GET `/api/warehouse/pods/cycles` (`?podId`)
All cycles for a pod, newest first, with their snapshotted config
(`rate_at_start`, `billing_interval_at_start`, insurance-at-start, `cycle_start/end`,
`status`). → `{ ok, data: { rows } }`.

### POST `/api/warehouse/pods/cycles/close`
Body `{ podId }`. Finds the pod's active cycle and marks it `closed` (and updates the
pod). 404 if no active cycle. Closing a cycle is part of the renewal/close-out flow.

### POST `/api/warehouse/pods/cycles/renew`
Body `{ podId, newRate, newDurationMonths, newInsuranceProvider?, newInsuranceValue?,
newInsuranceIdv? }`. In one transaction: closes the current active cycle, opens a **new**
active cycle with the new terms (carrying the outstanding balance forward as an opening
transaction), and updates the pod's config + `next_charge_date`. This is how a storage
agreement is extended — the old cycle stays immutable as history.

---

## POST `/api/warehouse/pods/rate-change`
Apply a mid-cycle rate change. Body `{ podId, oldRate, newRate, effectiveDate,
addExtraChargeNow?, extraDays?, gstRate?, note? }`. Optionally inserts a one-off
pro-rata adjustment charge *now*, then updates the pod's recurring `rate` — atomically.
Distinct from renew: rate-change stays within the current cycle.

**All cycle/rate routes touch:** `warehouse_pods`, `warehouse_pod_cycles`,
`warehouse_pod_transactions`.

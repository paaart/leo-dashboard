# API — Warehouse Transactions (the ledger)

> Status: Current. Verified 2026-07-21.
> Routes: `src/app/api/warehouse/pods/transactions/**`. All **admin-only**, raw `pg` Pool.
> Table: `warehouse_pod_transactions`. Frontend: [frontend/05](../frontend/05-warehouse.md).

`warehouse_pod_transactions` is the **single source of truth** for every pod's balance
([DECISIONS.md](../DECISIONS.md) §3). There is no stored balance — outstanding is always
`sum(charges + adjustments) − sum(payments)`, GST-inclusive. Every transaction belongs to
a pod **and** a cycle.

Three transaction types:

| Type | Sign of `amount` | GST | Meaning |
|---|---|---|---|
| `charge` | positive | yes (`gst_rate`, default 18) | storage/insurance/service the client owes |
| `payment` | negative (stored) | 0 | money received |
| `adjustment` | ± | optional | manual correction / waiver |

---

## GET `/api/warehouse/pods/transactions`
List a cycle's transactions. Query: **`?cycleId`** or **`?podId`** (at least one; with
only `podId` it resolves the pod's active cycle, 404 if none).

**Touches:** `warehouse_pod_cycles` (resolve), `warehouse_pod_transactions` (read).

---

## POST `/api/warehouse/pods/transactions/add`
Add a **charge or adjustment**. Body:
`{ podId, type: "charge"|"adjustment", amount (positive from UI), gstRate? (default 18),
txDate (YYYY-MM-DD), title, note? }`. Inserts into the pod's active cycle. `type` other
than charge/adjustment → 400.

## POST `/api/warehouse/pods/transactions/payment`
Record a **payment**. Body: `{ podId, cycleId?, amount (positive from UI), txDate, title?,
note? }`. Stored as a credit (negative), `gst_rate = 0`. Resolves the active cycle when
`cycleId` is omitted.

## PATCH `/api/warehouse/pods/transactions/update`
Edit a transaction. Body: `{ id, amount (signed), gst_rate, title, note?, tx_date,
last_known_created_at, last_known_updated_at? }`.

**Optimistic concurrency:** the update only applies if the row's current
`created_at`/`updated_at` match the `last_known_*` values sent — otherwise **409**
(someone else edited it first). This protects the ledger from silent clobbering.

## DELETE `/api/warehouse/pods/transactions/delete` (`?id`)
Delete one transaction by id. 404 if not found. → `{ ok, data: { id } }`.

---

## Notes

- `amount` is sent **positive** from the UI for both charges and payments; the payment
  route flips the sign on the way in. Read code that consumes these rows with the sign
  convention in mind (payments are negative in the table).
- `tx_month` (month bucket) is used by the accrual logic to prevent duplicate monthly
  charges — see [api/10](10-warehouse-billing-payments-alerts.md).
- Manual charges/payments here are separate from the automatic monthly accrual; both
  land in the same ledger.

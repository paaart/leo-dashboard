# API — Warehouse Billing, Payments & Alerts

> Status: Current. Verified 2026-07-26.
> Routes: `warehouse/pods/accrue`, `warehouse/pods/accrue-due`, `warehouse/pods/payments`,
> `warehouse/payments/export`, `warehouse/dashboard-summary`, `warehouse/payment-alerts`,
> `warehouse/payment-alerts/dismiss`. All **admin-only**, raw `pg` Pool.

The automated billing engine plus the read-side dashboards and alerts.

---

## Charge accrual (the billing engine)

### GET/POST `/api/warehouse/pods/accrue-due` (`?batchSize`) — bulk accrual
Finds active pods whose `next_charge_date <= current_date` (oldest first, limited to
`batchSize`, default 200, max 2000), accrues every missing interval charge in one
set-based transaction, and advances `next_charge_date`/`next_payment_date`. Returns:

```json
{ "ok": true, "data": { "requested": N, "chargesInserted": N,
  "podsUpdated": N, "message": "..." } }
```

The Vercel cron calls `GET` Mon/Wed/Fri 02:00 UTC (`vercel.json`, batch 2000) and is
authorized by `CRON_SECRET`. The Warehouse dashboard calls authenticated `POST` before
loading its table and summary cards. Accrual is **idempotent**: the partial unique index
on `(cycle_id, tx_month)` for `Auto charge` rows prevents duplicate monthly charges.

`FOR UPDATE SKIP LOCKED` prevents concurrent cron/dashboard requests from processing
the same POD while allowing another request to continue with other due PODs.

### POST `/api/warehouse/pods/accrue` (`?podId`) — single pod, manual
Accrues one pod on demand through the shared accrual implementation. Without `podId` it
returns 400. Use this to force a specific pod up to date.

**Both touch:** `warehouse_pods`, `warehouse_pod_cycles`, `warehouse_pod_transactions`.

---

## Payments views

### GET `/api/warehouse/pods/payments`
Paginated list of payment transactions across pods. Query: `?page` (1), `?pageSize`
(50, max 200), `?search`, `?fromDate`/`?toDate` (ISO), `?locationName`, `?modeOfPayment`.

### GET `/api/warehouse/payments/export` (`?startDate`, `?endDate`)
Exports payments in a date range as **CSV** (built by hand, not xlsx). Both dates are
required `YYYY-MM-DD`; `startDate > endDate` → 400. Returns a `text/csv` download.

**Touches:** `warehouse_pod_transactions` (payments), joined to pods/locations.

---

## Dashboard summary

### GET `/api/warehouse/dashboard-summary`
The warehouse dashboard cards, computed in one SQL round-trip using the shared balance
CTEs: `active_pods`, `closed_pods`, `total_outstanding`, `monthly_charges`
(sum of active pod rates), `payments_received`, `overdue_pending`.

The SQL lives in `src/lib/warehouse/summary.ts`
(`getWarehouseDashboardSummary`), shared with the server-rendered Home page — the
route is a thin auth + JSON wrapper around it.

**Touches:** `warehouse_pods`, `warehouse_pod_transactions`.

---

## Payment alerts

### GET `/api/warehouse/payment-alerts`
Active pods with an upcoming/current `next_payment_date` (`>= current_date`, within
the next 5 days) and their outstanding `total_due`, **excluding** any that have been
dismissed for that specific `next_payment_date` (left-joined against
`warehouse_payment_alert_dismissals`). SQL lives in `src/lib/warehouse/summary.ts`
(`listWarehousePaymentAlerts`), shared with the Home page.

### POST `/api/warehouse/payment-alerts/dismiss`
Body `{ podId, nextPaymentDate (YYYY-MM-DD) }`. Records a dismissal so that alert stops
showing. Because the unique key is `(pod_id, next_payment_date)`, dismissing this cycle's
alert does **not** suppress the next cycle's — a new payment date produces a fresh alert.

**Touches:** `warehouse_pods`, `warehouse_pod_transactions`,
`warehouse_payment_alert_dismissals`.

# API — Warehouse Billing, Payments & Alerts

> Status: Current. Verified 2026-07-21.
> Routes: `warehouse/pods/accrue`, `warehouse/pods/accrue-due`, `warehouse/pods/payments`,
> `warehouse/payments/export`, `warehouse/dashboard-summary`, `warehouse/payment-alerts`,
> `warehouse/payment-alerts/dismiss`. All **admin-only**, raw `pg` Pool.

The automated billing engine plus the read-side dashboards and alerts.

---

## Charge accrual (the billing engine)

### GET `/api/warehouse/pods/accrue-due` (`?batchSize`) — **the cron target**
Finds active pods whose `next_charge_date <= current_date` (oldest first, limited to
`batchSize`, default 50, max 200), accrues each pod's due charges, and advances its
`next_charge_date`. Returns a summary:

```json
{ "ok": true, "data": { "requested": N, "successCount": N, "failureCount": N,
  "failures": [{ "podId": "...", "error": "..." }], "message": "..." } }
```

**This is what the Vercel cron calls** — Mon/Wed/Fri 02:00 UTC (`vercel.json`,
`?batchSize=50`). It's a `GET` because Vercel cron issues GETs. Accrual is **idempotent**
(charges are deduped by `tx_month` per cycle), so re-running never double-charges.

> Charges appear because the cron ran. If they're missing, check the cron — don't add
> accrue-on-page-load (see [DECISIONS.md](../DECISIONS.md) §9).

### POST `/api/warehouse/pods/accrue` (`?podId`) — single pod, manual
Accrues one pod on demand. **Global accrual is deliberately disabled here** — without a
`podId` it returns 400. Use this to force a specific pod up to date.

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

**Touches:** `warehouse_pods`, `warehouse_pod_transactions`.

---

## Payment alerts

### GET `/api/warehouse/payment-alerts`
Active pods with an upcoming/current `next_payment_date` (`>= current_date`) and their
outstanding `total_due`, **excluding** any that have been dismissed for that specific
`next_payment_date` (left-joined against `warehouse_payment_alert_dismissals`).

### POST `/api/warehouse/payment-alerts/dismiss`
Body `{ podId, nextPaymentDate (YYYY-MM-DD) }`. Records a dismissal so that alert stops
showing. Because the unique key is `(pod_id, next_payment_date)`, dismissing this cycle's
alert does **not** suppress the next cycle's — a new payment date produces a fresh alert.

**Touches:** `warehouse_pods`, `warehouse_pod_transactions`,
`warehouse_payment_alert_dismissals`.

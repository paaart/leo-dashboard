# Frontend — Warehouse

> Status: Current. Verified 2026-07-21.
> Components: `src/components/Warehouse/` (+ `Ledger/`). Client lib: `src/lib/warehouse/`.
> Access: **admin only**. Data: `/api/warehouse/**` ([api/08](../api/08-warehouse-pods-and-cycles.md),
> [09](../api/09-warehouse-transactions.md), [10](../api/10-warehouse-billing-payments-alerts.md)).

The warehouse UI. Six shell sub-sections plus a standalone printable statement page. This
is the most feature-dense module; balances shown here are all server-computed from the
ledger.

---

## Sub-sections (from `DashboardShell`)

| Section | Component | Purpose |
|---|---|---|
| `add` | `WarehouseAddClient.tsx` | create a pod (client + billing config) |
| `active` | `WarehouseActivePods.tsx` | active pods with balances + severity bands |
| `renewals` | `Ledger/WarehouseRenewals.tsx` | pods due for renewal, renew flow |
| `payments` | `WarehousePayments.tsx` | payments list, filters, CSV export |
| `closed` | `WarehouseClosedPods.tsx` | closed pods (paginated search) |
| `payment-alerts` | `WarehousePaymentAlerts.tsx` | upcoming payment-due alerts + dismiss |

Supporting top-level components: `WarehouseSummaryCards.tsx` (dashboard cards from
`/api/warehouse/dashboard-summary`), `PodDetailsModal.tsx`, `EditPodModal.tsx`.

## The Ledger subfolder (`Warehouse/Ledger/`)

The detailed per-pod ledger view and its actions:

| Component | Role |
|---|---|
| `WarehousePodLedger.tsx` | the full ledger table for one pod's cycle |
| `WarehouseCurrentLedgerTable.tsx` / `WarehouseCycleHistory.tsx` | current vs historical cycles |
| `WarehouseLedgerSummaryCard.tsx` / `WarehouseLedgerTotals.tsx` | balance summaries |
| `WarehouseTxModal.tsx` | add/edit a transaction (charge / payment / adjustment) |
| `WarehouseRateChangeModal.tsx` | mid-cycle rate change |
| `WarehouseRenewModal.tsx` / `WarehouseRenewals.tsx` | renew a pod (new cycle) |
| `CloseCycleConfirmModal.tsx` | close the active cycle |
| `EditClientModal.tsx` | edit contact fields |

---

## Data flow

Warehouse components fetch through the **client-side warehouse lib**, not raw `fetch`
scattered in components:

- `src/lib/warehouse/api.ts` — `fetchJson<T>()` wrapper + `handleApiAuthFailure` (redirects
  on 401/403).
- `src/lib/warehouse/pods.ts` — `fetchPodCycles(...)` and other pod calls.
- `src/lib/warehouse/ledger.ts` — `fetchCycleTransactions(...)` and transaction actions.
- `src/lib/warehouse/ledgerMath.ts` — **display/format helpers**: `fmtINR`, `fmtDate`,
  `toLedgerVMRows`, `computeLedgerTotals` (view-model shaping, not money truth).

A few components (`WarehouseAddClient`, `EditPodModal`, `PodDetailsModal`) also call
Supabase **directly** with the browser client — typically to load `companies` /
`locations` dropdown options.

> `src/lib/warehouse/` mixes three concerns: client fetch wrappers (above), **server-side
> SQL** used by the routes (`podBalanceSql.ts`, `queries.ts`, `billing.ts`, `renew.ts`),
> and shared formatting (`ledgerMath.ts`, `types.ts`). Check whether a file runs on the
> client or server before importing it — the server ones assume the `pg` Pool context.

---

## Standalone statement page (`/warehouse/statement`)

`src/app/warehouse/statement/page.tsx` is a **real route** (outside the shell) that
renders a printable client statement: pod details, cycle transactions
(`fetchPodCycles` + `fetchCycleTransactions`), computed totals (`computeLedgerTotals`),
and footnotes. Used to hand a client their billing statement.

---

## Notes

- Severity bands (green/yellow/red) come from the server `payment_ratio`
  ([api/08](../api/08-warehouse-pods-and-cycles.md)); the UI just colours by band.
- Editing a transaction sends optimistic-concurrency fields; a 409 means someone edited
  it first — surface that, don't silently retry.
- Deleting a pod is a hard delete on the server — confirm destructively in the UI.

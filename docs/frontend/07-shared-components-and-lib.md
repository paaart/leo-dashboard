# Frontend — Shared Components & Lib

> Status: Current. Verified 2026-07-21.
> The reusable pieces every module leans on: UI primitives, chrome, and shared helpers.

There is **no** generic `components/ui/` design-system folder. Shared UI lives in one
file, plus a couple of standalone widgets.

---

## Shared UI primitives — `src/components/shared/DashboardUI.tsx`

Compose these instead of re-styling headers/cards. All are theme-aware (light/dark).

| Export | Use |
|---|---|
| `PageHeader` | page title block: `eyebrow`, `title`, `subtitle`, optional `action` |
| `SectionCard` | a titled/bordered content card (`title`, `description`, `action`, `children`) |
| `MetricCard` | a KPI tile: `label`, `value`, `hint`, `icon` |
| `LoadingState` | centered spinner + label |
| `EmptyState` | dashed-border empty placeholder (`title`, `description`) |

If you need a card, header, metric tile, or loading/empty state, reach for these first.

---

## Chrome

| Component | Role |
|---|---|
| `src/components/Header.tsx` | top bar: mobile menu toggle, current user |
| `src/components/Sidebar.tsx` | module nav + accordion sub-sections; hides admin links for non-admins |
| `src/components/Dashboard/DashboardShell.tsx` | the shell that renders modules ([architecture/04](../architecture/04-dashboard-shell-and-routing.md)) |
| `src/components/Dashboard/DashboardAuthProvider.tsx` | `useDashboardAuth()` context ([architecture/02](../architecture/02-auth-and-access-control.md)) |

---

## Standalone shared widgets

- **`src/lib/EmployeeSearchSelect.tsx`** — searchable employee picker. Used by the Loans
  module; takes `{ employees, value, onChange }`.

---

## Shared lib helpers

| File | Exports / purpose |
|---|---|
| `src/lib/api.ts` | browser data helpers for Domestic (`getHHGQuoteMap`, `getVehicleQuotesDict`, `getDistance`) and International (`saveInternationalQuote`, `fetchInternationalQuote`); normalises the older international response shapes |
| `src/lib/errors.ts` | `getErrorMessage(err)` — safe message extraction (used by most API routes) |
| `src/lib/utils.ts` | misc helpers, incl. `displayTransactionTitle` (warehouse ledger display) |
| `src/lib/warehouse/ledgerMath.ts` | `fmtINR`, `fmtDate`, `toLedgerVMRows`, `computeLedgerTotals` — warehouse display formatting |
| `src/lib/warehouse/api.ts` | `fetchJson<T>()` + `handleApiAuthFailure` — client fetch wrapper with 401/403 redirect |

---

## Client vs server code in `src/lib/`

`src/lib/` holds **both** browser code and server-only code — check before importing:

- **Server-only** (assume Node + `pg`/service-role context): `db.ts`, `auth.ts`,
  `supabase/admin.ts`, `supabase/route.ts`, `vehicle-expense-invoices.ts`, and the
  server SQL files in `warehouse/` (`podBalanceSql.ts`, `queries.ts`, `billing.ts`,
  `renew.ts`) and `fuel-tracker/queries.ts`. Importing these into a client component will
  break (or leak server config).
- **Browser-safe:** `supabaseClient.ts`, `api.ts`, `errors.ts`, `utils.ts`,
  `EmployeeSearchSelect.tsx`, `auth-routes.ts`, the warehouse client wrappers/formatters,
  and the shared `types.ts` files.

When in doubt, follow how an existing component imports it.

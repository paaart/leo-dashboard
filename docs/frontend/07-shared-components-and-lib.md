# Frontend — Shared Components & Lib

> Status: Current. Verified 2026-07-26.
> The reusable pieces every module leans on: UI primitives, chrome, and shared helpers.

There is **no** generic `components/ui/` design-system folder. Shared UI lives in two
files — `DashboardUI.tsx` (primitives) and `ui.ts` (class constants) — plus a couple
of standalone widgets. The tokens themselves are in `src/app/globals.css`.

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

## Design-system class constants — `src/components/shared/ui.ts`

Canonical className strings built on the semantic tokens in `src/app/globals.css`
(tokens flip with the OS color scheme — never add `dark:` variants or raw palette
classes alongside them):

| Group | Exports |
|---|---|
| Buttons | `buttonPrimary`, `buttonSecondary`, `buttonGhost`, `buttonDanger`, `buttonDangerSoft`, `iconButton` |
| Form fields | `inputField`, `selectField`, `fieldLabel`, `fieldHint`, `fieldError` |
| Surfaces | `card`, `cardPadded` |
| Modals | `modalOverlay`, `modalOverlayScroll`, `modalPanel`, `modalHeader`, `modalTitle`, `modalBody`, `modalFooter` |
| Tables | `tableWrapper`, `tableBase`, `tableHead`, `tableHeadCell`, `tableRow`, `tableCell`, `tableCellMuted` |
| Badges/alerts | `badgeClass(tone)` (`neutral`/`accent`/`success`/`warning`/`danger`), `alertDanger`, `alertWarning`, `alertSuccess`, `alertInfo` |

Compose extras onto them (`` `${buttonPrimary} w-full` ``). Modal panels should carry
`max-h-[90vh]` with a scrolling body; tables keep `min-w-*` so the `tableWrapper`
scrolls horizontally on phones instead of crushing columns.

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
| `src/lib/clientCache.ts` | `getCached`/`setCached` — tab-lifetime stale-while-revalidate cache for client KPI fetches (warehouse summary cards, fuel analytics): render the cached value instantly, refresh in the background |
| `src/lib/errors.ts` | `getErrorMessage(err)` — safe message extraction (used by most API routes) |
| `src/lib/utils.ts` | misc helpers, incl. `displayTransactionTitle` (warehouse ledger display) |
| `src/lib/warehouse/ledgerMath.ts` | `fmtINR`, `fmtDate`, `toLedgerVMRows`, `computeLedgerTotals` — warehouse display formatting |
| `src/lib/warehouse/api.ts` | `fetchJson<T>()` + `handleApiAuthFailure` — client fetch wrapper with 401/403 redirect |

---

## Client vs server code in `src/lib/`

`src/lib/` holds **both** browser code and server-only code — check before importing:

- **Server-only** (assume Node + `pg`/service-role context): `db.ts`, `auth.ts`,
  `supabase/admin.ts`, `supabase/route.ts`, `supabase/server.ts`,
  `vehicle-expense-invoices.ts`, the server SQL files in `warehouse/`
  (`podBalanceSql.ts`, `summary.ts`), and `fuel-tracker/queries.ts`. Importing these
  into a client component will break (or leak server config).
- **Browser-safe:** `supabaseClient.ts`, `api.ts`, `errors.ts`, `utils.ts`,
  `EmployeeSearchSelect.tsx`, `auth-routes.ts`, the warehouse client-side files
  (`warehouse/api.ts`, `pods.ts`, `ledger.ts`, `queries.ts`, `renew.ts`, `billing.ts`,
  `ledgerMath.ts`), and the shared `types.ts` files.

When in doubt, follow how an existing component imports it.

# Frontend Overview

> Status: Current. Verified 2026-07-26.
> Scope: how the UI is organised, conventions, and the module→component map. Per-module
> detail is in `frontend/01`–`frontend/08`.

The frontend is a client-rendered dashboard. Read
[architecture/04](../architecture/04-dashboard-shell-and-routing.md) first — it explains
the single-shell model that everything here plugs into.

---

## 1. Mental model

- One **shell** (`DashboardShell`) renders the whole authenticated app and swaps
  "sections" in state. Modules are self-contained client components that fetch their
  own data, and the shell loads each one lazily via `next/dynamic` so a page only
  downloads the module it renders.
- **Home is the exception:** `/dashboard/home` is a server component
  (`app/dashboard/[module]/page.tsx` → `components/Dashboard/HomeContent.tsx`) that
  queries the DB during the request — its KPIs/alerts arrive in the HTML, no client
  fetches. Its data helpers live in `lib/warehouse/summary.ts` (shared with the API
  routes) and `getServerComponentAppUser()` in `lib/auth.ts` provides auth in RSCs.
- **Role-aware:** admins see Warehouse, Loans, and User Management; regular users don't
  (hidden in `Sidebar`, blocked in the shell — the real guard is server-side).
- **Mobile matters:** drivers, warehouse staff, and managers use phones. Forms stay
  simple; the driver fuel flow is a dedicated public mobile page. Hard rules: every
  `<table>` keeps its natural width (`min-w-*`) inside an `overflow-x-auto` wrapper so
  the container scrolls instead of crushing columns at 375px; modal panels cap at
  `max-h-[90vh]` with a scrolling body; grids start at one column and expand at
  `sm:`/`md:`; toolbars stack (`flex-col … sm:flex-row`).
- **Light + dark throughout:** styling uses semantic design tokens defined in
  `src/app/globals.css` (`bg-surface`, `border-edge`, `text-fg`, `text-fg-muted`,
  accent/success/warning/danger tones) that flip automatically with the OS color
  scheme — components should NOT hand-write `dark:` variants or raw palette classes.
  Reusable class constants (buttons, inputs, modals, tables, badges, alerts) live in
  `src/components/shared/ui.ts`; use those for new UI.

---

## 2. Folder layout

```
src/components/
  Dashboard/            DashboardShell, DashboardAuthProvider,
                        HomeContent (server component — frontend/08)   (the frame)
  Header.tsx  Sidebar.tsx                                              (chrome)
  shared/DashboardUI.tsx   shared UI primitives      (see frontend/07)
  shared/ui.ts             design-system class constants (see frontend/07)

  DomesticCalculator/       frontend/01
  InternationalCalculator/  frontend/02  (Calculator/, History/, PdfDocument, helpers)
  LoansAndAdvances/         frontend/03
  FuelTracker/              frontend/04  (Vehicle Tracker: tabs, tables, modals, Public/)
  Warehouse/                frontend/05  (+ Ledger/ subfolder)
  UserManagement/           frontend/06

src/lib/
  api.ts                     domestic + international browser data helpers
  EmployeeSearchSelect.tsx   shared employee picker (used by Loans)
  fuel-tracker/  warehouse/  vehicle-expense-invoices.ts   (mostly server-side logic)
```

Components are grouped by **business module**, not by UI type. There is no generic
`components/ui/` design-system folder — shared primitives live in
`shared/DashboardUI.tsx` and the class constants in `shared/ui.ts`
(see [frontend/07](07-shared-components-and-lib.md)).

---

## 3. How modules get their data — two styles

This mirrors the [data-access patterns](../architecture/03-data-access-patterns.md):

| Module | Data style |
|---|---|
| Home | **server component** — DB queried during the request; zero client fetches ([frontend/08](08-home.md)) |
| Domestic Calculator | **browser → Supabase** directly (`src/lib/api.ts`) |
| International Calculator | reads/writes via `/api/international/*` (helpers in `src/lib/api.ts`) |
| Loans & Advances | **browser → Supabase** directly (`supabaseClient`, RPCs) |
| Vehicle Tracker | `fetch("/api/...")` to the fuel/vehicle/vendor-invoice routes |
| Warehouse | mostly `fetch("/api/warehouse/...")`; a few modals use Supabase directly |
| User Management | `fetch("/api/admin/users")` |

When a module fetches its own routes, it handles loading/error/empty states locally
(usually with the shared `LoadingState` / `EmptyState`).

---

## 4. Section → component map (what the shell renders)

From `DashboardShell.renderContent()`:

All module components are lazy (`next/dynamic`) — see
[architecture/04](../architecture/04-dashboard-shell-and-routing.md) §3.

| Section (`main` / `sub`) | Component |
|---|---|
| `home` | the page's server-rendered `HomeContent`, passed through as `children` |
| `domestic` | `DomesticCalculator` |
| `international` / `calculator` | `InternationalShipping` |
| `international` / `history` | `HistoryList` |
| `fuel` | `FuelTrackerPage` (its own internal tabs) |
| `loans` / `create` | `LoanEntryForm` |
| `loans` / `view` | `OutstandingLoansList` |
| `loans` / `employees` | `ManageEmployees` |
| `warehouse` / `add` | `WarehouseAddClient` |
| `warehouse` / `active` | `WarehouseActivePods` |
| `warehouse` / `renewals` | `WarehouseRenewals` |
| `warehouse` / `payments` | `WarehousePayments` |
| `warehouse` / `closed` | `WarehouseClosedPods` |
| `warehouse` / `payment-alerts` | `WarehousePaymentAlerts` |
| `users` | `UserManagement` |

Note the Vehicle Tracker (`fuel`) uses its **own** tab bar inside one component rather
than the shell's `sub` mechanism — see [frontend/04](04-vehicle-tracker.md).

---

## 5. Conventions for new frontend work

- Compose the shared primitives (`PageHeader`, `SectionCard`, `MetricCard`,
  `LoadingState`, `EmptyState`) instead of re-styling headers/cards.
- Use `react-hot-toast` for success/error feedback (the `Toaster` is mounted in the root
  layout).
- Keep money/derived numbers coming from the server; don't recompute balances client-side.
- New screen inside an existing module → add a `sub` section (or a tab, for the Vehicle
  Tracker). New module → follow the checklist in
  [architecture/04](../architecture/04-dashboard-shell-and-routing.md) §7.

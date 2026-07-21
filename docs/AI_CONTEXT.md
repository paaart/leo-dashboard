# Leo Dashboard — AI Context

> The brain. Read this before touching code, whichever AI tool or human you are.
> Last full audit: 2026-07-21 (docs created from scratch — statuses below verified
> against code on that date).

Next.js 15 (App Router) full-stack app for **Leo Packers and Movers** — an internal
operations dashboard that started as a transport-quote calculator and is growing into
a lightweight logistics ERP. Frontend (React 19 + Tailwind 4) and backend (Next.js
Route Handlers under `src/app/api/`) live in **one repo**. Data + auth + file storage
are Supabase (PostgreSQL + Auth + Storage). Deployment is Vercel.

There is no separate backend service. "Backend" here means the Route Handlers in
`src/app/api/**/route.ts`.

---

## The documentation contract

**`docs/` describes the current reality of this repo — nothing else.** No changelogs,
no history sections, no "phase 2C did X" tracking. Git history is the changelog. When
behavior changes, update the affected doc in the same change; when work finishes,
delete its tracking entry rather than marking it done.

**Status ownership:** what works / what's broken / what's risky lives in
[PROJECT_STATE.md](PROJECT_STATE.md) only. Other docs link there instead of restating
status. Every module doc carries a `> Status:` header — trust it only as of this
file's audit date; when in doubt, the `route.ts` file is the ground truth for what's
live.

**When to update these docs:** update per change, in the same commit as the code —
**not** after every run, and **not** as a separate cleanup pass later. The trigger is
"did I change behavior a doc describes?", not elapsed time:

- Changed documented behavior (a route's contract, a table, a flow, a rule)? → edit the
  affected doc(s) in the same change and name them in your final response. Doc edits are
  part of "done," not a follow-up.
- Pure bugfix / refactor that keeps the same contract? → often zero doc edits. Don't
  manufacture churn.
- Backstop (nothing enforces the above): every so often — before onboarding someone, or
  roughly monthly — do an explicit pass: *audit `docs/` against the current code and flag
  anything stale.* This catches whatever slipped through.

Docs written as an afterthought go stale fastest; that is how the `supabase/migrations/`
drift ([database/02](database/02-migrations-and-drift.md)) happened. Keep code and docs
moving together.

---

## File map

| You need | Read |
|---|---|
| What works / what's broken / what's risky right now | [PROJECT_STATE.md](PROJECT_STATE.md) |
| Why it's built this way (the real tradeoffs) | [DECISIONS.md](DECISIONS.md) |
| How the whole app fits together (layers, request flow) | [architecture/01-system-architecture.md](architecture/01-system-architecture.md) |
| Login, roles, who-can-see-what | [architecture/02-auth-and-access-control.md](architecture/02-auth-and-access-control.md) |
| The three ways this app talks to the database | [architecture/03-data-access-patterns.md](architecture/03-data-access-patterns.md) |
| Why `/dashboard/[module]` renders nothing, and how the UI actually switches | [architecture/04-dashboard-shell-and-routing.md](architecture/04-dashboard-shell-and-routing.md) |
| Every table, grouped by module | [database/01-schema-overview.md](database/01-schema-overview.md) |
| Migration workflow + the migration-drift warning | [database/02-migrations-and-drift.md](database/02-migrations-and-drift.md) |
| API conventions (auth, response shapes, errors) | [api/00-api-overview.md](api/00-api-overview.md) |
| Per-module API contracts | `api/01`–`api/10` (see file map in the API overview) |
| Frontend conventions + module layout | [frontend/00-frontend-overview.md](frontend/00-frontend-overview.md) |
| Per-module UI contracts | `frontend/01`–`frontend/07` |

---

## The six modules

Every feature belongs to one of these. Sidebar labels in parentheses.

| Module | Access | Sidebar label | Where the logic lives |
|---|---|---|---|
| Domestic Calculator | all users | "Domestic Calculator" | `components/DomesticCalculator/`, reads Supabase directly |
| International Calculator | all users | "International Calculator" | `components/InternationalCalculator/` + `api/international/**` |
| Vehicle Tracker (fuel + vendor invoices) | all users | "Vehicle Tracker" | `components/FuelTracker/` + `api/fuel-*`, `api/vehicles/**`, `api/vehicle-expense*/**` |
| Warehouse | **admin only** | "Warehouse" | `components/Warehouse/` + `api/warehouse/**` |
| Loans / Advances | **admin only** | "Loans / Advances" | `components/LoansAndAdvances/`, reads Supabase directly |
| User Management | **admin only** | "User Management" | `components/UserManagement/` + `api/admin/users/**` |

---

## Architecture in one breath

```
Browser (React client components)
  ├── some modules call Supabase directly (browser anon client + RLS)   src/lib/supabaseClient.ts
  └── other modules call our own Route Handlers                          fetch("/api/...")
        │
Route Handlers (src/app/api/**/route.ts)
  ├── requireAuth / requireAdmin  (Supabase session → profiles row)      src/lib/auth.ts
  ├── Supabase admin client (service role, bypasses RLS)                 src/lib/supabase/admin.ts
  └── raw pg Pool (transactional SQL)                                    src/lib/db.ts
        │
PostgreSQL (Supabase)
```

Two things surprise people, both covered in the architecture docs:

1. **Three data-access patterns coexist on purpose.** Direct browser→Supabase, Route
   Handler→Supabase-admin, and Route Handler→raw-`pg`. Which one a module uses is a
   real decision, not an accident — see [DECISIONS.md](DECISIONS.md).
2. **The dashboard is one client shell, not real routes.** `/dashboard/[module]` is a
   server page that validates the slug and renders `null`; the actual UI is
   `DashboardShell` switching "sections" in React state. See
   [architecture/04-dashboard-shell-and-routing.md](architecture/04-dashboard-shell-and-routing.md).

---

## Non-negotiables

- **Money is application-owned, ledger-first.** Warehouse balances and vendor-invoice
  paid totals are *derived from transaction/allocation rows*, never stored as a
  running total someone edits. Don't add a "balance" column and mutate it. See
  [DECISIONS.md](DECISIONS.md).
- **Admin-only modules are gated in two places, and both must stay.** The client
  (`DashboardShell` / `Sidebar` hide them) *and* the server (`requireAdmin` in the
  route). Client gating is UX; the server guard is the real security boundary.
- **API routes own their own auth.** Middleware deliberately skips `/api`. Every
  protected route calls `requireAuth`/`requireAdmin` itself. A new route with no guard
  is a public route — treat that as a bug unless it's intentionally under `/public`.
- **Schema changes should be versioned migrations** (`supabase migration new` → SQL →
  `db push`), committed with the code that needs them. Reality today: only some tables
  are in `supabase/migrations/`; the warehouse and legacy calculator/loans tables were
  created directly in Supabase. See [database/02-migrations-and-drift.md](database/02-migrations-and-drift.md)
  before you assume the migrations folder is the whole schema.
- **Naming:** snake_case in Postgres, camelCase or snake_case in JSON (inconsistent —
  see each API doc), PascalCase React components.

---

## Before you finish

```bash
npm run lint
npm run build
```

There are **no automated tests** in this repo (verified 2026-07-21) and no CI beyond
Vercel's build. `npm run build` (which type-checks) is the only safety net — run it.
Update every doc that describes behavior you changed, and name the changed files in
your final response.

## Handoff notes

- **The Vehicle Tracker carries a lot of dead weight.** A legacy "Other Expenses /
  Paid Expenses" system (`vehicle_expenses`, `vehicle_expense_payments`,
  `vehicle_expense_payment_items`) was migrated into a newer "Vendor Invoices" system
  (`vehicle_expense_invoices` + items + payment batches + allocations). The legacy
  tables and their API routes still exist but are hidden from navigation, kept for a
  future cleanup. New work goes through vendor invoices. See
  [api/06-vendor-invoices-and-payments.md](api/06-vendor-invoices-and-payments.md) and
  [api/07-legacy-vehicle-expenses.md](api/07-legacy-vehicle-expenses.md).
- **Warehouse billing runs on a Vercel cron**, not on demand. `accrue-due` is hit
  Mon/Wed/Fri 02:00 UTC (`vercel.json`). Charges appear because the cron inserted them.
- **The `.env` file is present locally and git-ignored.** It holds real Supabase keys
  (including the service-role key). Never print its values into docs, code, or logs.
- **`Documentation/` (capital D, repo root) is empty** and `leodashboard.md` +
  `README.md` hold the *old* scattered notes this `docs/` folder supersedes. They're
  left in place; treat `docs/` as the source of truth.

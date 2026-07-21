# Leo Dashboard — Documentation

Internal operations dashboard for **Leo Packers and Movers**. Next.js 15 (App Router),
React 19, Tailwind 4, Supabase (PostgreSQL + Auth + Storage), deployed on Vercel.

**Start here:** [AI_CONTEXT.md](AI_CONTEXT.md) — the one-page brain. Everything else
hangs off it.

---

## How this folder is organised

```
docs/
  AI_CONTEXT.md          ← read first: what this is, the six modules, non-negotiables
  PROJECT_STATE.md       ← owns all status: what works / broken / risky
  DECISIONS.md           ← why it's built this way (the real tradeoffs)

  architecture/
    01-system-architecture.md        request flow, layers, tech stack
    02-auth-and-access-control.md     login, roles, middleware, route guards
    03-data-access-patterns.md        the three ways we reach the database
    04-dashboard-shell-and-routing.md the single-shell UI and why routes render null

  database/
    01-schema-overview.md            every table, grouped by module
    02-migrations-and-drift.md       Supabase CLI workflow + the drift warning

  api/
    00-api-overview.md               conventions shared by all routes
    01-auth.md                       login / logout / me / request-access
    02-admin-users.md                user approval + management
    03-international-calculator.md   save / history
    04-fuel-and-vehicles.md          vehicles, fuel entries, fuel dashboard, public driver flow
    05-fuel-dashboard-analytics.md   analytics endpoints
    06-vendor-invoices-and-payments.md  active vendor invoice + payment-batch system
    07-legacy-vehicle-expenses.md    retained-but-hidden legacy expense system
    08-warehouse-pods-and-cycles.md  pods, cycles, renewals, rate changes
    09-warehouse-transactions.md     the ledger (charge / payment / adjustment)
    10-warehouse-billing-payments-alerts.md  accrual cron, payments, alerts, dashboard

  frontend/
    00-frontend-overview.md          conventions, module boundaries, shared UI
    01-domestic-calculator.md
    02-international-calculator.md
    03-loans-and-advances.md
    04-vehicle-tracker.md
    05-warehouse.md
    06-user-management.md
    07-shared-components-and-lib.md
```

---

## Conventions used in these docs

- Every module doc opens with a `> Status:` line. It reflects reality **as of the
  audit date at the top of [PROJECT_STATE.md](PROJECT_STATE.md)** — not a promise about
  today.
- Route paths are written as they appear in the filesystem: `src/app/api/.../route.ts`
  maps to the URL `/api/...`.
- "The database is the source of truth, this doc is a map." If code and docs disagree,
  trust the code and fix the doc in the same change.
- These docs describe **current reality only**. Roadmap/wishlist items live in
  `leodashboard.md` at the repo root (the old planning notes) — not here.

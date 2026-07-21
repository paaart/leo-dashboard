# System Architecture

> Status: Current. Verified against code/config 2026-07-21.
> Scope: The big picture — stack, folder layout, request lifecycle, deployment.

---

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15**, App Router | Frontend + backend in one app |
| UI | **React 19**, **Tailwind CSS 4** | `src/app/globals.css`, PostCSS via `@tailwindcss/postcss` |
| Language | **TypeScript 5.8** | `"type": "module"` project |
| Auth | **Supabase Auth** | cookie session via `@supabase/ssr` |
| Database | **PostgreSQL** (Supabase) | reached two ways — Supabase JS client and raw `pg` |
| Storage | **Supabase Storage** | fuel bill/meter images |
| PDF | **@react-pdf/renderer** | international quote documents |
| Spreadsheets | **xlsx** | data-import/seed scripts only (`scripts/`), not the app — the warehouse payment export builds CSV by hand |
| Validation | **zod** | used in newer routes (e.g. warehouse) |
| Toasts | **react-hot-toast** | mounted in the root layout |
| Icons | **lucide-react** | |
| Hosting | **Vercel** | build on push; cron jobs in `vercel.json` |

There is **no separate backend service**. The "backend" is the set of Next.js Route
Handlers under `src/app/api/`.

---

## 2. Folder layout

```
src/
  middleware.ts              page-route auth gate (skips /api and public routes)
  app/
    layout.tsx               root layout (html, Toaster)
    page.tsx                 entry — redirects into the dashboard
    login/page.tsx           login + request-access screen (public)
    driver/fuel-entry/       public driver fuel submission (public)
    dashboard/
      layout.tsx             wraps DashboardShell in the auth provider
      page.tsx               dashboard root
      [module]/page.tsx      validates the module slug, renders null (see arch/04)
    warehouse/statement/     standalone warehouse statement page
    api/                     ← ALL backend logic lives here (Route Handlers)
      auth/                  login, logout, me, request-access
      admin/users/           user approval + management (admin)
      international/          save + history
      fuel-entries/          + /public, + /[id]
      fuel-dashboard/        + /analytics
      vehicles/              + /public, + /[id]
      vehicle-expenses/      legacy (retained, hidden)
      vehicle-expense-payments/          legacy
      vehicle-expense-invoices/          active vendor invoices (+ analytics, payments)
      vehicle-expense-payment-batches/   active vendor payment batches
      warehouse/             pods, cycles, transactions, payments, alerts, dashboard-summary

  components/                React components, grouped by module
    Dashboard/               DashboardShell, DashboardAuthProvider
    DomesticCalculator/  InternationalCalculator/  FuelTracker/
    Warehouse/  LoansAndAdvances/  UserManagement/  shared/
    Header.tsx  Sidebar.tsx

  lib/                       shared code
    auth.ts                  requireAuth / requireAdmin / getCurrentAppUser
    auth-routes.ts           isPublicRoute()
    db.ts                    raw pg Pool
    supabase/route.ts        SSR (cookie) Supabase client for Route Handlers
    supabase/admin.ts        service-role Supabase client
    supabaseClient.ts        browser anon Supabase client
    errors.ts  utils.ts  api.ts
    fuel-tracker/            types, queries, calculations, validation, uploads, api
    warehouse/               types, pods, ledger, billing, renew, queries, ledgerMath, ...

supabase/
  config.toml
  migrations/                versioned SQL (PARTIAL — see database/02)

scripts/                     one-off data seed/import scripts (Node, not part of the app)
public/                      static assets
vercel.json                  cron schedule for warehouse accrual
```

---

## 3. Request lifecycle

### Page requests (anything not under `/api`)

```
Browser requests /dashboard/...
  → src/middleware.ts runs
      → is it /_next, /api, a file (has a dot), or a public route?  → pass through
      → else: read Supabase session from cookies
          → no session?  → redirect to /login?next=<path>
          → session?     → continue
  → Next.js renders the page (dashboard/layout.tsx → DashboardAuthProvider → DashboardShell)
  → DashboardShell calls /api/auth/me to confirm the app-level user + role
```

Note: middleware only checks that **a Supabase session exists** — not role or profile
status. The real "are you an active app user" check is `/api/auth/me`
(`getCurrentAppUser`), which the client calls on mount.

### API requests (`/api/...`)

```
Browser (or Vercel cron) → fetch("/api/...")
  → middleware passes it straight through (it skips /api)
  → the Route Handler runs its own guard:
        requireAuth(request)    → 401 if no active app user
        requireAdmin(request)   → 403 if not admin
  → handler does its work via Supabase admin client and/or raw pg
  → returns JSON
```

Every protected route is responsible for its own auth. See
[02-auth-and-access-control.md](02-auth-and-access-control.md).

---

## 4. Environment variables

Read from a git-ignored `.env` (present locally; also set in Vercel). **Names only —
never print values.**

| Var | Used by | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | everywhere | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser client, SSR client, middleware | anon key, RLS-bound |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase/admin.ts` | service role, **bypasses RLS** — server only |
| `SUPABASE_DB_URL` | `src/lib/db.ts` | direct Postgres connection string for `pg` (prefer session mode, not the pooler, for transactions) |

`NEXT_PUBLIC_*` vars are exposed to the browser by design. The service-role key and DB
URL must never reach the client.

---

## 5. Deployment

- **Vercel**, building on push. `next build` type-checks — that's the only gate (no
  tests, no other CI).
- **Cron** (`vercel.json`): `/api/warehouse/pods/accrue-due?batchSize=50` at 02:00 UTC
  on Mon, Wed, and Fri. This drives warehouse charge accrual. See
  [api/10](../api/10-warehouse-billing-payments-alerts.md).
- **`next.config.ts`** allows remote images from `leopackersandmovers.com`.

---

## 6. Where to go next

- Auth and who-can-do-what → [02-auth-and-access-control.md](02-auth-and-access-control.md)
- The three database-access patterns → [03-data-access-patterns.md](03-data-access-patterns.md)
- Why the dashboard routes render null → [04-dashboard-shell-and-routing.md](04-dashboard-shell-and-routing.md)

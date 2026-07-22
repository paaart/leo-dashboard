# Leo Dashboard — Project State

> Owns all status. Other docs link here instead of restating it.
> Every claim is marked **verified** (read from code/config on the date shown) or
> **unverified** (inferred, or true-in-code but not exercised at runtime during this
> pass — re-check before relying on it).

Last verification pass: **2026-07-22** (initial docs creation. Routes read from
`src/app/api/`, components from `src/components/`, schema from `supabase/migrations/`
plus the type definitions in `src/lib/**/types.ts`).

---

## What works

- **Auth** — verified in code. Username/password login (`/api/auth/login`) maps a
  username to a `profiles` row, checks `status = 'active'`, then signs in via Supabase
  with the profile's email. Self-service signup (`/api/auth/request-access`) creates a
  `pending` profile awaiting admin approval. Page routes are gated by
  `src/middleware.ts` (session presence only); API routes gate themselves with
  `requireAuth`/`requireAdmin`. Not load-tested; correctness claims are from reading
  the handlers.
- **Six modules render and are wired to data** — verified in code: Domestic Calculator,
  International Calculator, Vehicle Tracker, Warehouse, Loans/Advances, User Management.
  Each maps to a `DashboardShell` section (see
  [architecture/04](architecture/04-dashboard-shell-and-routing.md)).
- **Warehouse ledger** — verified in code. Pods, immutable billing cycles, and a
  transaction ledger (charge/payment/adjustment) with GST on charges. Balances are
  derived from the ledger, not stored. Renewals create new cycles; rate changes are
  atomic. Uses the raw `pg` Pool for transactional integrity.
- **Warehouse charge accrual runs on a schedule** — verified in `vercel.json`. A Vercel
  cron calls `/api/warehouse/pods/accrue-due?batchSize=50` at **02:00 UTC on Mon, Wed,
  Fri**. This is how monthly charges get inserted. There is also a manual
  `/api/warehouse/pods/accrue` endpoint.
- **Vendor invoices (Vehicle Tracker)** — verified in code + schema. `vehicle_expense_invoices`
  with line items, multi-invoice **payment batches** and **allocations**. Invoice
  paid-totals and status (`unpaid`/`partially_paid`/`paid`) are derived from allocation
  totals and enforced by database triggers.
- **Fuel tracking** — verified in code. Vehicle master + fuel entries with approximate
  mileage/cost-per-km. A **public** driver flow (`/driver/fuel-entry`,
  `/api/fuel-entries/public`, `/api/vehicles/public`) lets drivers submit entries
  without logging in.
- **Loans & Advances** — verified in code. Employee master + `employee_loans` ledger,
  outstanding balances via the `get_outstanding_loans` RPC. Talks to Supabase directly
  from the browser (no API routes).
- **Transport calculators** — verified in code. Domestic reads `transport_quotes` /
  `vehicle_quotes` / `transport_distances` directly from Supabase; International saves
  quotes through `/api/international/**` and renders a PDF via `@react-pdf/renderer`.
  Those calculator lookup tables are now versioned in migrations and seeded locally.

## What's legacy (present, but not the path forward)

- **Legacy "Other Expenses / Paid Expenses"** — verified. Tables `vehicle_expenses`,
  `vehicle_expense_payments`, `vehicle_expense_payment_items` and routes under
  `/api/vehicle-expenses` and `/api/vehicle-expense-payments` still exist and still
  work, but the tabs are hidden from navigation. A migration
  (`202607010001_migrate_legacy_vehicle_expenses_to_vendor_invoices.sql`) copied their
  data into the vendor-invoice system. New work goes through vendor invoices; the
  legacy tables are retained for a future cleanup phase. See
  [api/07](api/07-legacy-vehicle-expenses.md).

## What doesn't exist yet

- **Automated tests** — verified: zero test files in the repo. `npm run build` (type
  check) is the only gate.
- **CI/CD beyond Vercel** — verified: no GitHub Actions or other CI config found. Vercel
  builds on push; cron jobs are defined in `vercel.json`.
- **The wishlist in `leodashboard.md`** — OCR bill reading, WhatsApp reminders,
  inventory tracking, quotation-to-booking, analytics dashboards, etc. are aspirational
  notes, not implemented.

## Risks / known problems

- **Schema migration drift — still real, but slightly better.**
  The migrations folder now also includes the calculator lookup tables and seed data,
  plus fuel, profiles, vehicle-expense, and the warehouse-alert-dismissals tables. The
  **warehouse core tables**
  (`warehouse_pods`, `warehouse_pod_cycles`, `warehouse_pod_transactions`), the
  **loans tables** (`employees`, `employee_loans`, `companies`, `locations`), and the
  warehouse enum types are still created directly in Supabase and are **not** in version
  control. A fresh `supabase db reset` will NOT reproduce the full schema. See
  [database/02](database/02-migrations-and-drift.md).
- **RLS posture is uneven.** Modules that talk to Supabase directly from the browser
  (Domestic, Loans, parts of Warehouse client UI) rely on Row-Level Security to be
  safe, because they use the anon key. Whether every such table has correct RLS
  policies is **unverified** — RLS policies are not in the migrations folder either.
  This is the highest-value thing to audit. See [DECISIONS.md](DECISIONS.md).
- **Two money systems overlap in the Vehicle Tracker.** Legacy expenses and vendor
  invoices both exist; the legacy tables are still readable/writable via their routes.
  Divergence is possible until the legacy cleanup happens.
- **No CI, no tests.** Builds are only checked locally / on Vercel. Behavioural
  regressions are caught by humans.
- **Secrets in a local `.env`.** Git-ignored, but present. Includes the service-role
  key. Don't commit it, don't echo it.

## Doc hygiene state

- This `docs/` tree was created 2026-07-21 from a code read. Per-module `> Status:`
  headers were accurate to the code at that time.
- The root `leodashboard.md` and the warehouse notes in `README.md` are the **old**
  scattered docs. They contain useful domain framing but also roadmap/aspirational
  content. They were folded into this tree and left in place; where they disagree with
  a doc here, this tree wins.

# Leo Dashboard — Decisions

> Why it's built this way. The tradeoffs behind choices that look odd until you know
> the reason. If you're about to "clean up" something here, read its entry first.

These are inferred from the code as it stands on 2026-07-21, plus the framing in the
old `leodashboard.md`. Where a decision is a guess about intent rather than a stated
rule, it says so.

---

## 1. One Next.js repo, Route Handlers as the backend

There is no separate API server. Business logic that must be trusted lives in
`src/app/api/**/route.ts` (Route Handlers), not in a Go/Node service.

**Why:** small team, single deploy target (Vercel), and the app grew organically from a
calculator. A separate backend would be pure overhead here. The stated philosophy
(`leodashboard.md`): "API routes should own calculations and validation" — keep trusted
logic out of both the browser and the database where practical.

**Consequence:** "the backend" is just the `api/` folder. Auth, money math, and
transactional SQL all live there.

---

## 2. Three data-access patterns coexist — on purpose

This is the single most confusing thing about the codebase until you see the pattern.

| Pattern | Client used | Who runs it | Used by |
|---|---|---|---|
| **A. Browser → Supabase directly** | anon key, `src/lib/supabaseClient.ts` | the user's browser | Domestic Calculator, Loans/Advances, parts of the Warehouse client UI, International reads |
| **B. Route Handler → Supabase admin** | service-role key, `src/lib/supabase/admin.ts` | our server | Auth, user management, and CRUD that needs to bypass RLS or use admin APIs |
| **C. Route Handler → raw `pg` Pool** | Postgres connection, `src/lib/db.ts` | our server | Warehouse ledger, anything needing multi-statement transactions |

**Why three?**
- **A** is the fastest way to ship a read-heavy screen: no route to write, Supabase +
  RLS does the work. Good for low-risk reads (quote tables) and admin-only tools where
  the whole module is already gated (Loans).
- **B** is for flows that must not trust the browser (checking a user's status at
  login, creating auth users, approving accounts) — the service role bypasses RLS.
- **C** is for **money**. The warehouse ledger needs real transactions (insert a
  charge + advance the next-charge-date atomically), which the Supabase JS client can't
  express cleanly. Raw SQL over `pg` gives us `BEGIN/COMMIT`.

**The tradeoff / the risk:** pattern A leans entirely on Row-Level Security being
correct, and RLS policies are **not in version control** (see
[PROJECT_STATE.md](PROJECT_STATE.md)). If you move a table from "read via API" to "read
via browser," you've made RLS the security boundary — check the policy exists.

**Rule of thumb for new code:** touching money or needing a transaction → pattern C.
Needs to bypass RLS or use admin auth → pattern B. Low-risk read in an already-gated
admin module → pattern A is acceptable but prefer a route if it's writing.

---

## 3. Money is ledger-first; balances are derived, never stored

Both money systems follow this:

- **Warehouse:** `warehouse_pod_transactions` is the single source of truth. A pod's
  outstanding balance is `sum(charges) − sum(payments) ± adjustments`, computed on
  read. There is no `balance` column that code mutates.
- **Vendor invoices:** an invoice's paid total is `sum(allocations)` for that invoice;
  its status (`unpaid`/`partially_paid`/`paid`) is derived from that sum vs the invoice
  total.

**Why:** it's audit-safe. You can always explain a number by pointing at rows. There
are no forecasts and no retroactive edits to a stored total that could silently drift.

**Consequence / non-negotiable:** don't add a running-total column and update it in
application code. If you need performance, cache in a view or compute in SQL — don't
denormalise the truth.

---

## 4. Vendor-invoice invariants live in database triggers; warehouse invariants live in the app

A deliberate contrast worth understanding:

- **Vendor invoices** enforce their rules with **Postgres triggers** (deferred
  constraint triggers): invoice total must equal the sum of its items; total allocated
  can't exceed the invoice total; a payment batch's total must equal the sum of its
  allocations; invoice status is re-synced on every payment change. See
  `202606300001_*.sql` and `202606300002_*.sql`.
- **Warehouse** enforces its rules in **application code** (Route Handlers + `src/lib/warehouse/`),
  with the DB holding mostly plain tables. The stated direction in `leodashboard.md` is
  "application-layer business logic, minimal DB triggers."

**Why the difference?** The vendor-invoice money math (items, multi-invoice payment
allocation) has strict arithmetic invariants that are easy to violate from multiple
code paths — triggers make them impossible to break regardless of who writes. The
warehouse logic is more procedural (billing schedules, cycles, accrual timing) and was
intentionally kept in the app layer for visibility.

**Consequence:** when you change a vendor invoice, expect the database to reject invalid
states (and to auto-update `status`). When you change warehouse money, **you** are
responsible for integrity — wrap it in a transaction.

---

## 5. The dashboard is one client shell, not a set of routes

`/dashboard/[module]/page.tsx` validates the slug and returns `null`. The real UI is
`DashboardShell` (a client component) that reads the URL segment and swaps "sections"
in React state.

**Why (inferred):** it makes cross-module navigation instant (no server round-trip, no
per-section data-fetch waterfall) and keeps one auth/layout context alive. The modules
are self-contained client components that fetch their own data, so a full route per
screen would add ceremony without benefit.

**Consequence:** don't expect `/dashboard/warehouse/payments` to be a real page. Deep
links go to `/dashboard/<module>`; sub-section (e.g. warehouse "payments") is React
state, not a URL. See [architecture/04](architecture/04-dashboard-shell-and-routing.md).

---

## 6. Login is by username, but Supabase authenticates by email

`/api/auth/login` takes a username, looks up the `profiles` row (service role), and
then calls Supabase `signInWithPassword` with **that profile's email**.

**Why:** operational users (warehouse staff, ops managers) think in usernames, not
emails, but Supabase Auth is email-first. The profile table bridges the two and also
lets us block login for non-`active` accounts before ever hitting Supabase Auth.

---

## 7. Access control is enforced twice, and that's intentional

Admin-only modules (Warehouse, Loans, Users) are hidden in the client
(`Sidebar`/`DashboardShell`) **and** guarded on the server (`requireAdmin` in each
route or Supabase RLS).

**Why:** client hiding is UX (don't show buttons that will 403). The server guard is the
actual security. Removing either one is wrong: without the client guard users see dead
buttons; without the server guard the module is actually exposed.

**Middleware deliberately skips `/api`** — so every API route must guard itself. A route
with no guard is effectively public.

---

## 8. Legacy expense system was migrated, not deleted

The old "Other Expenses / Paid Expenses" tables were copied into the vendor-invoice
system by a carefully-verified migration, then hidden from the UI — but the tables and
their API routes were left intact.

**Why:** deleting live financial data before the business has verified the migration is
irreversible and risky. Retaining the legacy path is cheap insurance. The migration
itself (`202607010001_*.sql`) is idempotent and self-verifying (it aborts if totals
don't reconcile).

**Consequence:** two systems overlap. New work uses vendor invoices. The legacy cleanup
is a known future task — don't build new features on the legacy tables.

---

## 9. Warehouse billing is time-driven via cron, not event-driven

Monthly charges are inserted by a Vercel cron hitting `accrue-due`, not when a user
opens a screen.

**Why:** billing must happen whether or not anyone logs in, and must be idempotent
(don't double-charge if the cron runs twice). The accrual logic checks `next_charge_date`
and advances it, so re-running is safe.

**Consequence:** if charges look missing, check the cron ran — don't add
"accrue-on-page-load" logic that could double-charge.

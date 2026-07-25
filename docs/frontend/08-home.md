# Frontend — Home

> Status: Current. Verified 2026-07-26.
> Component: `src/components/Dashboard/HomeContent.tsx` (a **server component** —
> no `"use client"`), rendered by `src/app/dashboard/[module]/page.tsx` for the
> `home` slug and passed into `DashboardShell` as `children`.
> Access: all users (admins see more). Route: `/dashboard/home` — the landing page
> after login; `/` and `/dashboard` redirect here.

The only server-rendered module. All data is fetched **during the request** (in one
`Promise.all`) and arrives in the HTML — there are no client-side data fetches on
this page. See [architecture/04](../architecture/04-dashboard-shell-and-routing.md)
§1 and [DECISIONS.md](../DECISIONS.md) §5 for why.

---

## Sections, top to bottom

1. **Greeting** — time-of-day greeting + today's date, both computed in the
   `Asia/Kolkata` timezone (the server may run in UTC).
2. **KPI row** *(admin only)* — four `MetricCard`s:
   - Warehouse Outstanding (+ active-POD count) and Overdue/Pending and Monthly
     Charges — from `getWarehouseDashboardSummary()` in `src/lib/warehouse/summary.ts`
     (the same function behind `/api/warehouse/dashboard-summary`).
   - Loans Outstanding — the `get_outstanding_loans` RPC via the **admin** Supabase
     client (summed server-side).
3. **Needs attention** — top 5 vehicle renewal alerts (due in 15 days or overdue)
   from `listVehicleRenewalAlerts()` (`src/lib/fuel-tracker`), with urgency chips and
   a link into the Vehicle Tracker. Green "all clear" banner when empty. Shown to
   all users.
4. **Upcoming warehouse payments** *(admin only)* — top 5 pod payments due in the
   next 5 days from `listWarehousePaymentAlerts()` (`summary.ts`; same
   dismissed-alert filtering as the Payment Alerts screen), with amount + due chips
   and a link to the warehouse module.
5. **Quick actions** — link tiles to Domestic quote, International quote, Vehicle
   Tracker, and (admin only) Warehouse and Loans.

Each data source degrades independently: a failed fetch renders that section's
empty/"—" state rather than breaking the page.

---

## Auth

The page (not the shell) resolves the user server-side via
`getServerComponentAppUser()` ([architecture/02](../architecture/02-auth-and-access-control.md)
§2) and redirects to `/login` if there is none. `isAdmin` gates the KPI row, the
payments card, and the admin quick actions — regular users get the greeting,
renewal alerts, and their three quick actions.

## Notes for changes

- Keep this component server-only: no hooks, no event handlers. Anything interactive
  added here must be a small `"use client"` leaf component it imports.
- Data helpers must stay in shared `src/lib/**` functions (used by both this page and
  the API routes) — no inline SQL in the page, and no imports of client-side fetch
  wrappers.
- It renders inside the shell chrome, so it must not add its own header/sidebar.

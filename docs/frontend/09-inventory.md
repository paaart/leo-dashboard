# Inventory Management (frontend)

> Status: Current. Verified 2026-09-24.
> Files: `src/components/Inventory/**`, `src/lib/inventory/client.ts`, `src/lib/roles.ts`.
> API: [api/11](../api/11-inventory.md).

Tracks packaging material (cartons, blankets, paper rolls…) across the company's branches.
The business shape: one **central store** (Uttarahalli) buys from vendors and dispatches
to the other branches; each branch reports what it has on the shelf. Reusable items go
out on jobs and come back, so the numbers only settle at month granularity — the module
is built around counted snapshots, not a derived running balance.

Sidebar label: **"Inventory Management"**. Module slug: `/dashboard/inventory`.

---

## 1. Who sees it

| Role | Sees |
|---|---|
| `admin` | every sub-section |
| `branch` (branch staff) | only the sub-sections flagged for them in `sections.ts` — **none yet**; the stock-reporting screens are the next slice |
| `user` | nothing (the module is hidden and blocked) |

`branch` is a third `profiles.role` added for this module (see
[architecture/02](../architecture/02-auth-and-access-control.md)). Branch-staff users
get **only** the Inventory Management group in the sidebar, and `/dashboard/home`
redirects them to `/dashboard/inventory`. Admins approve accounts as "Branch staff" in
User Management, then assign branches under Setup → Branch staff.

The per-sub-section role list lives in one place —
`src/components/Inventory/sections.ts` — and is read by `DashboardShell`
(`canAccessSection`) and `Sidebar` (which sub-links to render, and the default landing
sub). Adding a screen means adding an entry there plus a `renderContent()` branch.

---

## 2. Sub-sections

| `sub` | Component | Who |
|---|---|---|
| `setup` | `InventorySetup` | admin |

### Setup

`InventorySetup` is a `PageHeader` + `SegmentedTabs` (the shared pill tab strip added
in `shared/DashboardUI.tsx`) with three panels:

- **Materials** (`SetupMaterials`) — add form (name, unit, minimum stock) and an
  inline-editable table. Rows track a draft; **Save** is enabled only when something
  changed and sends just the changed fields. Deactivate/Reactivate toggles `isActive`;
  inactive rows stay listed at reduced opacity.
- **Branches** (`SetupBranches`) — add form (name) and a table with inline rename,
  a **Make central** action (reloads the list because the previous central is
  un-flagged server-side), and Deactivate/Reactivate. The central store has neither
  action — it can only be *moved* to another branch.
- **Branch staff** (`SetupAssignments`) — one row per branch-role user, with a chip per
  active branch to toggle; Save replaces the whole set via
  `PUT /api/inventory/assignments/[profileId]`. Empty state points admins at User
  Management, since accounts are created there.

All three fetch through `src/lib/inventory/client.ts` (thin `fetchJson` wrappers; the
`fetchJson` helper is the shared one in `lib/warehouse/api.ts`) and report with
`react-hot-toast`, matching Loans' `ManageEmployees`.

---

## 3. Conventions carried into this module

- Data comes from our own routes (never the browser Supabase client), so nothing here
  depends on RLS.
- Types shared by routes and components are in `src/lib/inventory/types.ts`; JSON is
  camelCase end to end.
- Tables follow the mobile rule: `min-w-*` inside `tableWrapper` so the container
  scrolls. The assignments panel is a list, not a table, so chips can wrap on phones.

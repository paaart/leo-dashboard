# Inventory Management (frontend)

> Status: Current. Updated against code 2026-10-28; Slice 3 migration is applied live.
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
| `branch` (branch staff) | Overview and Update stock, scoped to assigned active branches |
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
| `overview` | `InventoryCounts` (overview) | admin + branch |
| `update` | `InventoryCounts` (update) | admin + branch |
| `purchases` | `InventoryPurchases` | admin + branch |
| `dispatches` | `InventoryMovement` (dispatches) | admin + branch |
| `count-requests` | `InventoryMovement` (count requests) | admin + branch |
| `reconciliation` | `InventoryMovement` (reconciliation) | admin + branch |
| `setup` | `InventorySetup` | admin |

### Overview and Update stock

Overview is the default for both roles. It shows latest dated snapshots per material,
company totals for admins or assigned-branch totals for staff, and a branch filter.
Missing counts remain unknown, never zero. Cards show the oldest count's age and how
many selected branches have not counted. Company totals below a material's company-wide
minimum are flagged; incomplete totals are explicitly labelled as reported subtotals.
Branch-only views do not reuse that company-wide minimum as a branch target.

Update stock uses an actual count date (IST today by default), one whole non-negative
number per active material, and partial saves. Blank leaves the material unchanged;
zero explicitly records no stock. Dates range from 2026-08-31 (August closing / September
opening) through today. Choose month-end dates for closing counts. An existing count on
the selected date can be corrected; every changed value records who/when/old/new.
A stale version rejects the entire save with a reload message. Changing branch/date
or reloading prompts before discarding draft values; page unload warns too.

History & edit log opens in a modal with 20 saves per page, scoped to the selected
material and available branches. Historical corrections do not replace a newer count in
Overview. Count history and edit logs are immutable; admins correct a count through
Update stock rather than deleting the audit trail.

### Purchases

Purchases records central-store buying and emergency branch purchases. Admins can see
and record every active branch; branch staff can only use their assigned branches. Each
entry records the material, vendor, date, quantity, unit price, optional notes and an
optional PDF/image invoice. The invoice is stored privately in Supabase Storage and is
opened through a short-lived signed URL.

The purchase list compares each unit price with the trailing six-month average for that
material. Prices at least 5% below the average show **Good deal**; prices at least 5%
above show **Above average**. With no prior six-month data it shows **No history**.
The list shows total cost (`quantity × unit price`). The entry form accepts any two of
quantity, unit price, and total cost, then calculates the third. Purchases do not
automatically change shelf counts. Admins can delete a purchase; the invoice object is
removed with it.

### Dispatches, count requests, and reconciliation

Admins dispatch material from Uttarahalli to a branch. The receiving branch confirms
the quantity received, which changes the dispatch from **In transit** to **Received**.
Branch staff can only see dispatches involving their assigned branches and can confirm
incoming dispatches.

Admins can raise count requests for any branch. Branch staff see requests for their
assigned branches and can mark them complete after entering a stock count. Admins can
delete count requests and dispatches; branch staff have no delete actions.

Reconciliation is calculated by month and branch/material as `opening + received - sent
- closing = apparent usage`. Missing opening or closing counts remain blank.

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

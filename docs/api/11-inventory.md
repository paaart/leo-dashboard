# Inventory Management API

> Status: Current. Updated against code 2026-10-14; count migration applied live 2026-10-14.
> Files: `src/app/api/inventory/**`, `src/lib/inventory/{setup,counts,count-validation,access,http,types}.ts`.
> Frontend: [frontend/09](../frontend/09-inventory.md). Tables:
> [database/01 § Inventory](../database/01-schema-overview.md#inventory-management-migration).

Packaging-material stock across branches. Setup routes (materials, branches, branch-staff assignments) are **admin-only**.
Count routes allow admins and assigned branch staff. All use the raw `pg` Pool (pattern C).

---

## Conventions specific to this module

- Responses use the standard `{ ok: true, data }` / `{ ok: false, error }` envelope via
  `jsonOk` / `jsonError` in `src/lib/inventory/http.ts`.
- **JSON is camelCase** in both directions (`isActive`, `minStock`, `branchIds`). The SQL
  in `setup.ts` aliases columns so rows come back already camelCased.
- Ids are uuids and are validated with `isUuid` before hitting the database.
- Unique-name collisions (`23505`) map to **409** with a human message.
- `requireInventoryAccess(request)` in `src/lib/inventory/access.ts` is the guard for the
  count and history routes: admins get `branchIds: "all"`, branch
  staff get their assigned active branch ids (possibly `[]`), everyone else 403.

---

## Branches

### GET `/api/inventory/branches` (`?includeInactive=1`)

Active branches ordered by `sort_order`, then name. `includeInactive=1` adds deactivated
ones.

→ `InventoryBranch[]` — `{ id, name, isCentral, isActive, sortOrder, createdAt, updatedAt }`

### POST `/api/inventory/branches`

**Body:** `{ name }`. New branches get `sort_order = max + 1`.
→ 201 `InventoryBranch`. 409 if the name (case-insensitive, trimmed) exists.

### PATCH `/api/inventory/branches/[id]`

**Body:** any of `{ name, isActive, isCentral }` (at least one).

Rules enforced in `updateBranch` inside a transaction:

| Attempt | Result |
|---|---|
| deactivate the central store | 400 "Make another branch the central store before deactivating this one" |
| `isCentral: true` on an inactive branch (without also activating it) | 400 |
| `isCentral: true` on another branch | previous central is un-flagged first (the partial unique index allows only one) |
| `isCentral: false` on the current central | 400 — choose a different branch instead |

→ `InventoryBranch`. 404 if not found.

---

## Materials

### GET `/api/inventory/materials` (`?includeInactive=1`)

→ `InventoryMaterial[]` — `{ id, name, unit, minStock, isActive, sortOrder, createdAt, updatedAt }`

### POST `/api/inventory/materials`

**Body:** `{ name, unit?, minStock? }`. `unit` defaults to `"pcs"` (≤ 20 chars).
`minStock` is a whole number ≥ 0, or `null`/blank for none.
→ 201 `InventoryMaterial`. 409 on duplicate name.

### PATCH `/api/inventory/materials/[id]`

**Body:** any of `{ name, unit, minStock, isActive }`. Sending `minStock: null` clears the
minimum (the SQL uses a "was this field sent" flag rather than `coalesce`, because null
is a legitimate value).
→ `InventoryMaterial`. 404 if not found.

---

## Branch-staff assignments

Which `profiles.role = 'branch'` users may report stock for which branches.

### GET `/api/inventory/assignments`

Every branch-role profile with `status in ('active','inactive')`, plus their branch ids.

→ `InventoryAssignment[]` — `{ profileId, username, fullName, email, status, branchIds }`

### PUT `/api/inventory/assignments/[profileId]`

**Body:** `{ branchIds: string[] }` — the **complete** list; duplicates are dropped and an
empty array unassigns the user. Runs delete + insert in one transaction.

| Error | Status |
|---|---|
| user not found | 404 |
| user's role is not `branch` | 400 |
| any branch id unknown | 400 |

→ the updated `InventoryAssignment`.


## Counts (admin + branch staff)

Uses migration `20261013154626_inventory_counts.sql` (applied live 2026-10-14). This migration also revokes
`anon`/`authenticated` Data API privileges on the three setup tables: their routes
already use the server connection, and assignments must not be writable around the guard.

### GET `/api/inventory/counts?date=YYYY-MM-DD`

Returns `{ isCompanyView, branches, materials, counts }`. Only active branches accessible
to the caller are included; an unassigned staff member gets empty branches/counts.
Materials are active reference data. Omit date for the latest count per branch/material;
provide date for exact-date counts. Missing entries are unknown, not zero.
Count shape: `{ id, branchId, materialId, countDate, quantity, version, updatedAt }`.

### POST `/api/inventory/counts`

Body: `{ branchId, date, entries: [{ materialId, quantity, version }] }`.
Use `version: null` to create, or the current version to correct an existing count.
1–500 distinct materials; integer quantities 0–2147483647. Dates must be real calendar
dates from 2026-08-31 through today in Asia/Kolkata. Omitting a material leaves it unchanged.
The server supplies the actor. A transaction locks the branch, rechecks access, validates
active materials and writes all entries with trigger-generated audit records. Unchanged
values do not create edits. Stale versions return 409 and roll back the whole submission.
Success: `{ saved: true }`. Unauthorized branch: 403; unavailable branch: 404.

### GET `/api/inventory/counts/history?materialId=UUID&branchId=UUID&offset=0`

`materialId` is required; `branchId` is optional and must be accessible. Returns up to
100 audit entries, ordered by save time descending. Offset is an integer 0–1000000.
Each entry has `{ id, countId, branchId, countDate, oldQuantity, newQuantity, editedBy,
editedAt, version }`; `editedBy` is the current profile display name, while the database
retains the actor's profile id. Creation uses `oldQuantity: null`.

### Verification

`npm ci && npm run test:inventory` runs isolated PostgreSQL (PGlite) migration, transaction,
validation and route-access tests. No credentials, Docker, or live database writes are
needed. The tests substitute authentication infrastructure, so real login and deployed
browser verification remain rollout checks after live migration approval.

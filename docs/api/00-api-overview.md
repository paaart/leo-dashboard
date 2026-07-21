# API Overview

> Status: Current. Verified against every `route.ts` under `src/app/api/` on 2026-07-21.
> Scope: conventions shared by all routes + a complete endpoint index. Per-module detail
> is in `api/01`–`api/10`.

"The API" is the set of Next.js Route Handlers under `src/app/api/`. A file at
`src/app/api/foo/bar/route.ts` serves the URL `/api/foo/bar`. `[id]` folders are dynamic
segments (`/api/foo/123`).

---

## 1. Auth on every route

Middleware **skips `/api` entirely** — each route guards itself
(see [architecture/02](../architecture/02-auth-and-access-control.md)):

```ts
const auth = await requireAuth(request);   // any active app user, else 401
const auth = await requireAdmin(request);  // active admin, else 403
if (!auth.ok) return auth.response;
```

- **`requireAdmin`** — all `warehouse/**` and `admin/**` routes.
- **`requireAuth`** — international, fuel, vehicles, and all vehicle-expense/vendor-invoice
  routes (so any active user, not just admins, can use the Vehicle Tracker).
- **No guard (public by design)** — `auth/login`, `auth/logout`, `auth/request-access`,
  `vehicles/public`, `fuel-entries/public`. The `me` route resolves the session but
  returns 401 if there's no active user.

---

## 2. Response shape — the dominant convention, and the exceptions

**Dominant (auth, admin, fuel, vehicles, vendor invoices, warehouse):**

```json
// success
{ "ok": true, "data": <payload> }
// failure  (with an HTTP status: 400 / 401 / 403 / 404 / 409 / 500)
{ "ok": false, "error": "human-readable message" }
```

There is **no** structured error object or error-code enum — just a string `error` and
the HTTP status. Most handlers wrap the body in a local `jsonError(message, status)`
helper.

**Exceptions (the International Calculator routes, written earlier):**

```json
// international/save
{ "success": true, "data": [...] }      or  { "error": "..." }
// international/history
{ "data": [...] }                        or  { "error": "..." }
```

If you add or refactor a route, follow the `{ ok, data | error }` convention. The
`international/*` shapes are legacy — the client's `src/lib/api.ts` already normalises
them.

---

## 3. Common patterns you'll see

- **`export const runtime = "nodejs";`** on most routes — required because they use the
  `pg` Pool and/or the service-role client, which don't run on the edge.
- **Validation lives in three places:** hand-rolled `validate*Input` functions in
  `src/lib/fuel-tracker/` and `src/lib/vehicle-expense-invoices.ts` (returning
  `{ ok, value } | { ok:false, error }`); inline checks in warehouse routes; and `zod`
  is a dependency used in newer spots. Dates are validated with an `isISODate`
  (`YYYY-MM-DD`) check throughout.
- **Pagination:** list routes accept `?limit` (default 500, capped 2000) and `?offset`;
  the paged warehouse lists use `?page`/`?pageSize` (default 50, capped 200) instead.
- **Money integrity:** warehouse routes use the raw `pg` Pool with `BEGIN/COMMIT`; the
  transaction-update route uses optimistic concurrency (`last_known_updated_at` →
  409 on conflict).
- **`created_by`** on vendor-invoice writes is taken from `auth.user.id`, not the body.

---

## 4. Complete endpoint index

Auth — [api/01](01-auth.md)

| Method | Path | Guard |
|---|---|---|
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | public (signs out current session) |
| GET | `/api/auth/me` | session |
| POST | `/api/auth/request-access` | public |

Admin / users — [api/02](02-admin-users.md)

| Method | Path | Guard |
|---|---|---|
| GET | `/api/admin/users` (`?status`) | admin |
| PATCH | `/api/admin/users/[id]` | admin |

International Calculator — [api/03](03-international-calculator.md)

| Method | Path | Guard |
|---|---|---|
| POST | `/api/international/save` | auth |
| GET | `/api/international/history` | auth |

Fuel & vehicles — [api/04](04-fuel-and-vehicles.md)

| Method | Path | Guard |
|---|---|---|
| GET / POST | `/api/vehicles` | auth |
| PATCH | `/api/vehicles/[id]` | auth |
| GET | `/api/vehicles/public` | **public** |
| GET / POST | `/api/fuel-entries` | auth |
| PATCH / DELETE | `/api/fuel-entries/[id]` | auth |
| POST | `/api/fuel-entries/public` | **public** |
| GET | `/api/fuel-dashboard` | auth |
| GET | `/api/fuel-dashboard/analytics` | auth |

Vendor invoices & payments — [api/06](06-vendor-invoices-and-payments.md)

| Method | Path | Guard |
|---|---|---|
| GET / POST | `/api/vehicle-expense-invoices` | auth |
| GET / PATCH / DELETE | `/api/vehicle-expense-invoices/[id]` | auth |
| POST | `/api/vehicle-expense-invoices/[id]/payments` | auth |
| DELETE | `/api/vehicle-expense-invoices/[id]/payments/[paymentId]` | auth |
| GET | `/api/vehicle-expense-invoices/analytics` | auth |
| GET / POST | `/api/vehicle-expense-payment-batches` | auth |
| GET / DELETE | `/api/vehicle-expense-payment-batches/[id]` | auth |

Legacy vehicle expenses — [api/07](07-legacy-vehicle-expenses.md)

| Method | Path | Guard |
|---|---|---|
| GET / POST | `/api/vehicle-expenses` | auth |
| PATCH / DELETE | `/api/vehicle-expenses/[id]` | auth |
| GET / POST | `/api/vehicle-expense-payments` | auth |

Warehouse pods & cycles — [api/08](08-warehouse-pods-and-cycles.md)

| Method | Path | Guard |
|---|---|---|
| GET | `/api/warehouse/pods` (`?status,limit,offset`) | admin |
| POST | `/api/warehouse/pods/create` | admin |
| PATCH | `/api/warehouse/pods/update-client` | admin |
| DELETE | `/api/warehouse/pods/delete` (`?podId`) | admin |
| GET | `/api/warehouse/pods/closed` (`?page,pageSize,search`) | admin |
| GET | `/api/warehouse/pods/cycles` (`?podId`) | admin |
| POST | `/api/warehouse/pods/cycles/close` | admin |
| POST | `/api/warehouse/pods/cycles/renew` | admin |
| POST | `/api/warehouse/pods/rate-change` | admin |

Warehouse transactions — [api/09](09-warehouse-transactions.md)

| Method | Path | Guard |
|---|---|---|
| GET | `/api/warehouse/pods/transactions` (`?podId` or `?cycleId`) | admin |
| POST | `/api/warehouse/pods/transactions/add` | admin |
| POST | `/api/warehouse/pods/transactions/payment` | admin |
| PATCH | `/api/warehouse/pods/transactions/update` | admin |
| DELETE | `/api/warehouse/pods/transactions/delete` (`?id`) | admin |

Warehouse billing / payments / alerts — [api/10](10-warehouse-billing-payments-alerts.md)

| Method | Path | Guard |
|---|---|---|
| GET | `/api/warehouse/pods/accrue-due` (`?batchSize`) | admin · **cron** |
| POST | `/api/warehouse/pods/accrue` (`?podId`) | admin |
| GET | `/api/warehouse/pods/payments` (`?page,pageSize,search,fromDate,toDate,...`) | admin |
| GET | `/api/warehouse/payments/export` (`?startDate,endDate`) | admin · CSV |
| GET | `/api/warehouse/dashboard-summary` | admin |
| GET | `/api/warehouse/payment-alerts` | admin |
| POST | `/api/warehouse/payment-alerts/dismiss` | admin |

---

## 5. Documentation convention for each module doc

Each `api/NN-*.md` should cover, per endpoint: **method + path**, **auth**, **query/body**,
**success shape**, **notable errors/status codes**, **which lib function / SQL it calls**,
and **which tables it touches**. Keep it to current reality — no roadmap.

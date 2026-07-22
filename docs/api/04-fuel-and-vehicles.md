# API — Fuel & Vehicles

> Status: Current. Verified 2026-07-21.
> Routes: `src/app/api/vehicles/**`, `src/app/api/fuel-entries/**`,
> `src/app/api/fuel-dashboard/**`. Shared logic: `src/lib/fuel-tracker/`.
> Frontend: [frontend/04](../frontend/04-vehicle-tracker.md).

The fuel side of the Vehicle Tracker: a vehicle master, fuel refill entries with
approximate mileage/cost, and dashboard summaries. Fuel-dashboard analytics has its own
doc: [api/05](05-fuel-dashboard-analytics.md).

All routes are `requireAuth` (any active user) except the two **public** driver routes,
and all declare `runtime = "nodejs"`. Response shape is `{ ok, data | error }`.
Validation is delegated to `validate*Input` helpers in `src/lib/fuel-tracker/` that
return `{ ok, value } | { ok:false, error }`.

---

## Vehicles

### GET `/api/vehicles`
List vehicles. Query: `?status`, `?limit` (default 500, max 2000), `?offset`.
→ `{ ok: true, data }` via `listVehicles`. Rows include the three optional renewal
date/amount/vendor groups for National Permit, Insurance, and Road Tax.

### POST `/api/vehicles`
Create a vehicle. Validated by `validateVehicleInput`. On success **201** `{ ok, data }`.
A duplicate `vehicle_no` maps the `vehicles_vehicle_no_unique` constraint error to
**409** `"vehicle_no must be unique"`. Accepts renewal date/amount/vendor fields in
either snake_case or camelCase (`nationalPermitRenewalDate`,
`nationalPermitRenewalAmount`, `nationalPermitRenewalVendor`, etc.). Dates are
optional `YYYY-MM-DD`; amounts are optional numbers > 0.

### PATCH `/api/vehicles/[id]`
Update a vehicle. Validated by `validateVehicleUpdateInput`. Errors carry a `status`
propagated from the lib layer (e.g. 404 for not found).

### GET `/api/vehicles/renewal-alerts`
Lists active vehicle renewal reminders due in the next 15 days or overdue, excluding
alerts dismissed for the exact `(vehicle, renewal type, renewal date)`. Returns
vehicle number/type/company, renewal label/type/date/amount/vendor, days until renewal,
and `status` (`overdue` \| `due_today` \| `due_soon`).

### POST `/api/vehicles/renewal-alerts/dismiss`
Body `{ vehicleId, renewalType, renewalDate }`, where `renewalType` is
`national_permit`, `insurance`, or `road_tax`, and `renewalDate` is `YYYY-MM-DD`.
Persists a dismissal for that exact item/date; changing the saved renewal date creates
a fresh alert.

### GET `/api/vehicles/public` — **public, no auth**
Minimal list for the driver form: active vehicles only, via the **raw `pg` Pool**
directly (not the fuel-tracker lib). Returns `{ id, vehicleNo, vehicleType }[]`. Exposes
nothing sensitive by design.

**Touches:** `vehicles`, `vehicle_renewal_alert_dismissals`.

---

## Fuel entries

### GET `/api/fuel-entries`
List entries. Query: `?vehicle_id`, `?limit`, `?offset`. → `{ ok, data }` via
`listFuelEntries`.

### POST `/api/fuel-entries`
Create an entry. `validateFuelEntryInput` → `createFuelEntry`. **201** on success. The
lib computes derived fields (km driven, approx mileage, cost/km) and sets the soft
`warning_flag` when numbers look off.

### PATCH / DELETE `/api/fuel-entries/[id]`
Update (`validateFuelEntryUpdateInput` → `updateFuelEntry`) or delete
(`deleteFuelEntry`, returns `{ ok, data: { id } }`). Error `status` propagates from the
lib.

### POST `/api/fuel-entries/public` — **public, no auth**
The driver submission endpoint. Accepts a reduced camelCase body
(`vehicleId, fuelDate, fuelAmount, fuelLiters, odometerReading, billImagePath,
meterImagePath, driverName, driverMobile, remarks`), trims optional strings, validates
`driverMobile` as ≥10 digits, then runs the same `validateFuelEntryInput` +
`createFuelEntry` as the authed route. Returns **201** `{ ok, data: { id, fuelDate } }`.

**Touches:** `fuel_entries`, `vehicles` (FK).

---

## Fuel dashboard

### GET `/api/fuel-dashboard`
Vehicle-wise summary (totals, averages, recent entries) via
`getFuelDashboardSummary()`. → `{ ok, data }`.

Analytics endpoints (`/api/fuel-dashboard/analytics`) are documented separately in
[api/05](05-fuel-dashboard-analytics.md).

---

## The public driver flow, end to end

```
Driver opens /driver/fuel-entry  (public page, no login)
  → GET /api/vehicles/public         pick a vehicle
  → (optional) upload bill/meter image to Supabase Storage
  → POST /api/fuel-entries/public    submit
```

Because these are unauthenticated, treat them as an **attack surface**: they must only
read/write fuel data, never expose admin info, and rely on validation to reject junk.
See [architecture/02](../architecture/02-auth-and-access-control.md) §8.

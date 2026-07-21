# API — Fuel Dashboard & Analytics

> Status: Current. Verified 2026-07-21.
> Routes: `src/app/api/fuel-dashboard/route.ts`, `src/app/api/fuel-dashboard/analytics/route.ts`.
> Logic: `src/lib/fuel-tracker/queries.ts` + `calculations.ts`. Both `requireAuth`.

The numbers behind the Vehicle Tracker's "Performance" view. Everything is **approximate
operational tracking**, not precise telemetry (the fuel philosophy in `leodashboard.md`):
refills are inconsistent in the real world, so the goal is trends and abnormalities.

---

## The mileage / cost math

Per fuel entry (`calculateFuelEntryValues`, computed on create/update):

```
km_driven      = current_odometer − previous_odometer
approx_mileage = km_driven / fuel_liters      (only if km_driven > 0)
fuel_rate      = fuel_amount / fuel_liters
cost_per_km    = fuel_amount / km_driven       (only if km_driven > 0)
```

If `km_driven <= 0` (odometer not greater than the previous reading), the entry is
flagged: `warning_flag = true`, mileage/cost left `null`, and a `warning_reason` set.
This is a **soft** signal for the UI, not a hard rejection — bad odometer data still
saves (see the DB constraint allowing negative `km_driven` only when `warning_flag`).

---

## GET `/api/fuel-dashboard`

Per-vehicle rollup across all fuel entries (`getFuelDashboardSummary`):

```json
{
  "ok": true,
  "data": [{
    "vehicleId": "...", "vehicleNo": "...",
    "totalKm": 0, "totalFuelAmount": 0, "totalFuelLiters": 0,
    "averageMileage": 0,        // totalKm / totalFuelLiters  (null if no liters)
    "averageCostPerKm": 0,      // totalFuelAmount / totalKm   (null if no km)
    "lastFuelDate": "YYYY-MM-DD",
    "lastOdometerReading": 0
  }]
}
```

`totalKm` only counts positive `km_driven` (ignores the flagged/negative entries).
Vehicles with no entries appear with zeros/nulls.

**Touches:** `vehicles`, `fuel_entries`.

---

## GET `/api/fuel-dashboard/analytics`

Filtered analytics with "best/worst" insights. Query (all optional):

| Param | Meaning |
|---|---|
| `vehicleId` | scope to one vehicle |
| `dateFrom` | `YYYY-MM-DD`, entries on/after (400 if malformed) |
| `dateTo` | `YYYY-MM-DD`, entries on/before (400 if malformed) |

Calls `getFuelDashboardAnalytics(filters)`. Returns aggregate fuel metrics plus
per-metric insight objects (`{ vehicleId, vehicleNo, value }`, empty when there's no
data).

**Touches:** `fuel_entries` **and** `vehicle_expenses`. Note: the expense side of
analytics still reads the **legacy** `vehicle_expenses` table (via
`expenseAnalyticsWhere`), not the vendor-invoice tables. This is one place the legacy
system is still live — see [api/07](07-legacy-vehicle-expenses.md) and
[PROJECT_STATE.md](../PROJECT_STATE.md).

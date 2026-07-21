# Frontend — Domestic Calculator

> Status: Current. Verified 2026-07-21.
> Component: `src/components/DomesticCalculator/` (entry: `index.tsx`).
> Access: all users. Data: **browser → Supabase** via `src/lib/api.ts` (no API routes).

A quote calculator for domestic (city-to-city) household-goods and vehicle transport.
It's read-only against reference data — nothing is saved.

---

## What it does

Pick a **source** and **destination** city, then either:

- **Household goods (HHG):** enter CFT (cubic feet); the tool looks up packaging +
  transportation rates for that route and computes packaging cost, transport cost, and
  total.
- **Vehicle transport:** pick a vehicle **size**; the tool shows the carrier cost and
  Leo cost for that route/size.

A rate-type toggle (`houseRate` / `carRate`) switches between the two modes.

---

## Components

| File | Role |
|---|---|
| `index.tsx` | orchestrator: holds all state, fetches data, computes totals |
| `CitySelector.tsx` | source/destination pickers (options derived from the quote map) |
| `CftInput.tsx` | CFT entry for HHG mode |
| `VehicleSizeSelector.tsx` | vehicle size picker for vehicle mode |
| `RateTypeToggle.tsx` | HHG vs vehicle mode |
| `QuoteSummary.tsx` | the computed result display |

---

## Data flow

All via `src/lib/api.ts` (browser Supabase client, anon key — RLS applies):

| Helper | Table | When |
|---|---|---|
| `getHHGQuoteMap()` | `transport_quotes` | once on mount → `{ source: [{ destination, packaging, transportation }] }` |
| `getVehicleQuotesDict(source, destination)` | `vehicle_quotes` | when both cities chosen → `{ source: { dest: { size: { carrier_cost, leo_cost } } } }` |
| `getDistance(source, destination)` | `transport_distances` | for distance-based figures |

Source-city options come from the keys of the HHG map; destinations from the selected
source's entries. Totals are derived in `index.tsx` with `useMemo`.

**States:** `LoadingState` while the HHG map loads; an error string if the fetch fails;
`EmptyState` when a route has no data.

> These three tables are **Supabase-only** (not in migrations) and seeded by the scripts
> in `/scripts` (`uploadQuotes`, `uploadVehicleQuotes`, `transportdistance`). See
> [database/02](../database/02-migrations-and-drift.md).

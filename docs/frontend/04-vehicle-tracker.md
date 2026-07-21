# Frontend — Vehicle Tracker

> Status: Current. Verified 2026-07-21.
> Component: `src/components/FuelTracker/` (entry: `FuelTrackerPage.tsx`).
> Access: all users. Data: `fetch` to fuel / vehicles / vendor-invoice routes
> ([api/04](../api/04-fuel-and-vehicles.md), [api/05](../api/05-fuel-dashboard-analytics.md),
> [api/06](../api/06-vendor-invoices-and-payments.md)).

The Vehicle Tracker (sidebar label; internally the `fuel` section). Unlike other modules
it uses its **own tab bar**, not the shell's `sub` mechanism — one big page component
(`FuelTrackerPage`, ~1000 lines) owns all state, data fetching, and modals, and renders a
tab's table + toolbar.

---

## Tabs (`FuelTrackerTabs.tsx`)

| Tab id | Label | Shows |
|---|---|---|
| `dashboard` | **Performance** | per-vehicle summary + analytics (`FuelTrackerDashboard`, `FuelDashboardCards`) |
| `vehicles` | **Vehicles** | vehicle master (`VehicleTable` + `VehicleFormModal`) |
| `fuel-entries` | **Fuel Entries** | fuel refills (`FuelEntryTable` + `FuelEntryFormModal`) |
| `vendor-invoices` | **Vendor Invoices** | active vendor invoices (`VendorInvoiceTable`, form + view modals) |
| `vendor-payments` | **Vendor Payments** | payment batches (`VendorPaymentBatchTable`, form + view modals) |

The legacy **Other Expenses / Paid Expenses** tabs were removed from navigation. Their
components still exist (`VehicleExpenseTable`, `VehicleExpenseFormModal`,
`VehicleExpensePaymentModal`, `VehicleExpensePaymentTable`) but aren't rendered — see
[api/07](../api/07-legacy-vehicle-expenses.md).

---

## What each tab does

- **Performance** — reads `GET /api/fuel-dashboard` and `/api/fuel-dashboard/analytics`
  (with `vehicleId`/`dateFrom`/`dateTo` filters). Shows total km, fuel spend, litres,
  average mileage, cost/km per vehicle, plus best/worst insights.
- **Vehicles** — list + create/edit via `/api/vehicles` (`POST`) and `/api/vehicles/[id]`
  (`PATCH`). A duplicate `vehicle_no` surfaces the 409 as a toast.
- **Fuel Entries** — list + create/edit/delete via `/api/fuel-entries[/id]`. Flagged
  entries (bad odometer) show a warning via `FuelStatusBadge`/`FuelTooltip`.
- **Vendor Invoices** — list (with a status filter: all / unpaid / partially_paid / paid),
  create (`VendorInvoiceFormModal`), view (`VendorInvoiceViewModal`), edit, delete via
  `/api/vehicle-expense-invoices`. A summary dashboard uses
  `/api/vehicle-expense-invoices/analytics`.
- **Vendor Payments** — list, create (allocating one payment across invoices via
  `VendorPaymentBatchFormModal`), view, delete via `/api/vehicle-expense-payment-batches`.

Shared table helpers: `TablePagination`, `SerialNumber`, `FuelEmptyState`.

---

## The public driver flow (`Public/DriverFuelEntryPage.tsx`)

A **separate, unauthenticated** page at `/driver/fuel-entry` (route:
`src/app/driver/fuel-entry/page.tsx`; public per `isPublicRoute`). Drivers:

1. pick a vehicle (`GET /api/vehicles/public`),
2. optionally upload bill/meter images to Supabase Storage,
3. submit (`POST /api/fuel-entries/public`).

Mobile-first and deliberately minimal. It shares no state with `FuelTrackerPage`.

---

## Notes

- `FuelTrackerPage` centralises everything: tab state (`activeTab`), all data arrays,
  every modal's open/editing/saving flags, and the invoice status / vehicle / date
  filters. New Vehicle-Tracker features hang off this component.
- Money for vendor invoices is server-derived (allocations → paid totals → status). The
  UI only displays it.

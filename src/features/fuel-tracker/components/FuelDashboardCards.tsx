import { CalendarDays, Gauge, IndianRupee, Truck } from "lucide-react";
import type {
  FuelDashboardSummary,
  FuelEntry,
  Vehicle,
} from "../types/fuelTracker.types";

function formatNumber(value: number | null, digits = 2) {
  if (value === null) return "-";

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function FuelDashboardCards({
  vehicles,
  entries,
  dashboard,
  loading,
}: {
  vehicles: Vehicle[];
  entries: FuelEntry[];
  dashboard: FuelDashboardSummary[];
  loading: boolean;
}) {
  const activeVehicles = vehicles.filter(
    (vehicle) => vehicle.status === "active"
  ).length;
  const totalAmount = dashboard.reduce(
    (sum, row) => sum + row.totalFuelAmount,
    0
  );
  const totalKm = dashboard.reduce((sum, row) => sum + row.totalKm, 0);
  const latestFuelDate =
    entries
      .map((entry) => entry.fuel_date)
      .sort((a, b) => b.localeCompare(a))[0] ?? null;

  const cards = [
    {
      label: "Active Vehicles",
      value: formatNumber(activeVehicles, 0),
      hint: `${formatNumber(vehicles.length, 0)} total vehicles`,
      icon: Truck,
    },
    {
      label: "Fuel Spend",
      value: formatCurrency(totalAmount),
      hint: "Across recorded entries",
      icon: IndianRupee,
    },
    {
      label: "Distance Logged",
      value: `${formatNumber(totalKm, 0)} km`,
      hint: "Positive odometer movement",
      icon: Gauge,
    },
    {
      label: "Latest Fuel Date",
      value: latestFuelDate ?? "-",
      hint: "Most recent entry",
      icon: CalendarDays,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>
                {loading ? (
                  <div className="mt-2 h-7 w-28 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                ) : (
                  <p className="mt-1 text-2xl font-semibold text-gray-950 dark:text-gray-50">
                    {card.value}
                  </p>
                )}
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-2 text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              {card.hint}
            </p>
          </div>
        );
      })}
    </div>
  );
}

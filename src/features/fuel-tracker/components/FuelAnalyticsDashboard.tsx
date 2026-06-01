import {
  AlertTriangle,
  BadgeIndianRupee,
  Gauge,
  IndianRupee,
  Route,
  TrendingUp,
} from "lucide-react";
import type {
  FuelAnalyticsInsight,
  FuelDashboardAnalytics,
  FuelDeviationStatus,
  Vehicle,
} from "../types/fuelTracker.types";

function formatNumber(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) return "-";

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
  }).format(value);
}

function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function deviationBadge(status: FuelDeviationStatus) {
  if (status === "good") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (status === "low") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300";
  }
  if (status === "normal") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";
  }

  return "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function deviationLabel(status: FuelDeviationStatus) {
  if (status === "good") return "Good";
  if (status === "low") return "Low";
  if (status === "normal") return "Normal";
  return "No data";
}

function InsightCard({
  label,
  insight,
  suffix,
  currency,
}: {
  label: string;
  insight: FuelAnalyticsInsight;
  suffix?: string;
  currency?: boolean;
}) {
  const value = currency
    ? formatCurrency(insight.value)
    : `${formatNumber(insight.value)}${insight.value === null ? "" : suffix ?? ""}`;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-base font-semibold text-gray-950 dark:text-gray-50">
        {insight.vehicleNo ?? "-"}
      </p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{value}</p>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="h-7 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      <div className="mt-3 h-4 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

export function FuelAnalyticsDashboard({
  analytics,
  vehicles,
  loading,
  error,
  filters,
  onFiltersChange,
}: {
  analytics: FuelDashboardAnalytics | null;
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  filters: { vehicleId: string; dateFrom: string; dateTo: string };
  onFiltersChange: (filters: {
    vehicleId: string;
    dateFrom: string;
    dateTo: string;
  }) => void;
}) {
  const summary = analytics?.summary;
  const summaryCards = [
    {
      label: "Total Fuel Spend",
      value: formatCurrency(summary?.totalFuelSpend ?? null),
      hint: "All filtered entries",
      icon: IndianRupee,
    },
    {
      label: "Total Fuel Liters",
      value: `${formatNumber(summary?.totalFuelLiters ?? null, 3)} L`,
      hint: "All filtered entries",
      icon: Gauge,
    },
    {
      label: "Total KM Driven",
      value: `${formatNumber(summary?.totalKmDriven ?? null, 0)} km`,
      hint: "Valid distance entries",
      icon: Route,
    },
    {
      label: "Average Mileage",
      value:
        summary?.averageMileage === null || summary?.averageMileage === undefined
          ? "-"
          : `${formatNumber(summary.averageMileage)} km/L`,
      hint: "Total valid KM / valid liters",
      icon: TrendingUp,
    },
    {
      label: "Average Cost / KM",
      value:
        summary?.averageCostPerKm === null ||
        summary?.averageCostPerKm === undefined
          ? "-"
          : `${formatCurrency(summary.averageCostPerKm)} / km`,
      hint: "Valid fuel amount / valid KM",
      icon: BadgeIndianRupee,
    },
    {
      label: "Warning Entries",
      value: formatNumber(summary?.warningEntries ?? null, 0),
      hint: "Operational review needed",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 md:grid-cols-3">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            Vehicle Filter
          </span>
          <select
            value={filters.vehicleId}
            onChange={(event) =>
              onFiltersChange({ ...filters, vehicleId: event.target.value })
            }
            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
          >
            <option value="all">All vehicles</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicle_no}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            From
          </span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) =>
              onFiltersChange({ ...filters, dateFrom: event.target.value })
            }
            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            To
          </span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) =>
              onFiltersChange({ ...filters, dateTo: event.target.value })
            }
            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} />
            ))
          : summaryCards.map((card) => {
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
                      <p className="mt-1 text-2xl font-semibold text-gray-950 dark:text-gray-50">
                        {card.value}
                      </p>
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

      {analytics ? (
        <>
          <div>
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <h3 className="text-base font-semibold text-gray-950 dark:text-gray-50">
                Insights
              </h3>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <InsightCard
                label="Best mileage vehicle"
                insight={analytics.insights.bestMileageVehicle}
                suffix=" km/L"
              />
              <InsightCard
                label="Lowest mileage vehicle"
                insight={analytics.insights.lowestMileageVehicle}
                suffix=" km/L"
              />
              <InsightCard
                label="Highest fuel spend vehicle"
                insight={analytics.insights.highestFuelSpendVehicle}
                currency
              />
              <InsightCard
                label="Most warning entries vehicle"
                insight={analytics.insights.mostWarningEntriesVehicle}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <h3 className="font-semibold text-gray-950 dark:text-gray-50">
                Vehicle-wise Performance
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Operational deviation compares each vehicle mileage against the
                filtered fleet average.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1120px] w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Vehicle No</th>
                    <th className="px-4 py-3 font-semibold">Total KM</th>
                    <th className="px-4 py-3 font-semibold">Total Liters</th>
                    <th className="px-4 py-3 font-semibold">
                      Total Fuel Amount
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Average Mileage
                    </th>
                    <th className="px-4 py-3 font-semibold">Cost / KM</th>
                    <th className="px-4 py-3 font-semibold">Warning Count</th>
                    <th className="px-4 py-3 font-semibold">Deviation</th>
                    <th className="px-4 py-3 font-semibold">Last Fuel Date</th>
                    <th className="px-4 py-3 font-semibold">Last Odometer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {analytics.vehicles.map((vehicle) => (
                    <tr
                      key={vehicle.vehicleId}
                      className="text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/70"
                    >
                      <td className="px-4 py-3 font-semibold text-gray-950 dark:text-gray-50">
                        {vehicle.vehicleNo}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(vehicle.totalKm, 0)} km
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(vehicle.totalLiters, 3)} L
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(vehicle.totalFuelAmount)}
                      </td>
                      <td className="px-4 py-3">
                        {vehicle.averageMileage === null
                          ? "-"
                          : `${formatNumber(vehicle.averageMileage)} km/L`}
                      </td>
                      <td className="px-4 py-3">
                        {vehicle.costPerKm === null
                          ? "-"
                          : `${formatCurrency(vehicle.costPerKm)} / km`}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(vehicle.warningCount, 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${deviationBadge(
                            vehicle.deviationStatus
                          )}`}
                        >
                          {deviationLabel(vehicle.deviationStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {vehicle.lastFuelDate ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(vehicle.lastOdometer, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <h3 className="font-semibold text-gray-950 dark:text-gray-50">
                Monthly Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[840px] w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Month</th>
                    <th className="px-4 py-3 font-semibold">
                      Total Fuel Amount
                    </th>
                    <th className="px-4 py-3 font-semibold">Total Liters</th>
                    <th className="px-4 py-3 font-semibold">Total KM</th>
                    <th className="px-4 py-3 font-semibold">
                      Average Mileage
                    </th>
                    <th className="px-4 py-3 font-semibold">Cost / KM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {analytics.monthlyBreakdown.map((row) => (
                    <tr
                      key={row.month}
                      className="text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/70"
                    >
                      <td className="px-4 py-3 font-semibold text-gray-950 dark:text-gray-50">
                        {row.month}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(row.totalFuelAmount)}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(row.totalLiters, 3)} L
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(row.totalKm, 0)} km
                      </td>
                      <td className="px-4 py-3">
                        {row.averageMileage === null
                          ? "-"
                          : `${formatNumber(row.averageMileage)} km/L`}
                      </td>
                      <td className="px-4 py-3">
                        {row.costPerKm === null
                          ? "-"
                          : `${formatCurrency(row.costPerKm)} / km`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {analytics.monthlyBreakdown.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No monthly data for the selected filters.
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

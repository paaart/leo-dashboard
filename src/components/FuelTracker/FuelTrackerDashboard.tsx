import {
  AlertTriangle,
  BadgeIndianRupee,
  Gauge,
  IndianRupee,
  ReceiptIndianRupee,
  Route,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FuelTooltip } from "./FuelTooltip";
import { VehicleSearchSelect } from "./VehicleSearchSelect";
import { SERIAL_COLUMN_CLASS, serialNumber } from "./SerialNumber";
import { TablePagination, paginateItems } from "./TablePagination";
import type {
  FuelAnalyticsInsight,
  FuelDashboardAnalytics,
  FuelDeviationStatus,
  Vehicle,
} from "@/lib/fuel-tracker/types";

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

function formatOdometer(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return String(value);
}

function performanceBadge(status: FuelDeviationStatus) {
  if (status === "good") {
    return "border-success/25 bg-success-soft text-success-soft-fg";
  }
  if (status === "low") {
    return "border-danger/25 bg-danger-soft text-danger-soft-fg";
  }

  return "border-edge bg-surface-2 text-fg-muted";
}

function performanceLabel(status: FuelDeviationStatus) {
  if (status === "good") return "Good";
  if (status === "low") return "Needs Review";
  return "No Data";
}

function performanceDetails(
  vehicle: FuelDashboardAnalytics["vehicles"][number]
) {
  return [
    `Total KM: ${formatNumber(vehicle.totalKm, 0)} km`,
    `Total Liters: ${formatNumber(vehicle.totalLiters, 3)} L`,
    `Cost / KM: ${
      vehicle.costPerKm === null ? "-" : `${formatCurrency(vehicle.costPerKm)} / km`
    }`,
    `Warning Count: ${formatNumber(vehicle.warningCount, 0)}`,
    `Last Odometer: ${formatOdometer(vehicle.lastOdometer)}`,
  ].join("\n");
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
    : `${formatNumber(insight.value)}${
        insight.value === null ? "" : suffix ?? ""
      }`;

  return (
    <div className="rounded-xl border border-edge bg-surface p-4 shadow-card">
      <p className="text-sm text-fg-muted">{label}</p>
      <p className="mt-2 text-base font-semibold text-fg">
        {insight.vehicleNo ?? "-"}
      </p>
      <p className="mt-1 text-sm text-fg-muted">{value}</p>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="rounded-xl border border-edge bg-surface p-4 shadow-card">
      <div className="h-7 w-32 animate-pulse rounded bg-surface-2" />
      <div className="mt-3 h-4 w-48 animate-pulse rounded bg-surface-2" />
    </div>
  );
}

export function FuelTrackerDashboard({
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
  const [performancePage, setPerformancePage] = useState(1);
  const performanceRows = useMemo(
    () => paginateItems(analytics?.vehicles ?? [], performancePage),
    [analytics?.vehicles, performancePage]
  );

  useEffect(() => {
    setPerformancePage(1);
  }, [filters.dateFrom, filters.dateTo, filters.vehicleId]);

  const summaryCards = [
    {
      label: "Total Fuel Cost",
      value: formatCurrency(summary?.totalFuelSpend ?? null),
      hint: "All filtered entries",
      icon: IndianRupee,
    },
    {
      label: "Total Other Expenses",
      value: formatCurrency(summary?.totalOtherExpenses ?? null),
      hint: "Filtered non-fuel expenses",
      icon: ReceiptIndianRupee,
    },
    {
      label: "Total Vehicle Operating Cost",
      value: formatCurrency(summary?.totalVehicleOperatingCost ?? null),
      hint: "Fuel cost + other expenses",
      icon: BadgeIndianRupee,
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
        summary?.averageMileage === null ||
        summary?.averageMileage === undefined
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
      icon: IndianRupee,
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
      <div className="grid gap-3 rounded-xl border border-edge bg-surface p-4 shadow-card md:grid-cols-3">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-fg">
            Vehicle Filter
          </span>
          <VehicleSearchSelect
            vehicles={vehicles}
            value={filters.vehicleId === "all" ? "" : filters.vehicleId}
            onChange={(vehicleId) =>
              onFiltersChange({
                ...filters,
                vehicleId: vehicleId || "all",
              })
            }
            emptyLabel="All vehicles"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-fg">
            From
          </span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) =>
              onFiltersChange({ ...filters, dateFrom: event.target.value })
            }
            className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-fg">
            To
          </span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) =>
              onFiltersChange({ ...filters, dateTo: event.target.value })
            }
            className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger-soft-fg">
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
                  className="rounded-xl border border-edge bg-surface p-4 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-fg-muted">
                        {card.label}
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-fg">
                        {card.value}
                      </p>
                    </div>
                    <div className="rounded-lg bg-accent-soft p-2 text-accent-soft-fg">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-fg-muted">
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
              <TrendingUp className="h-4 w-4 text-fg-muted" />
              <h3 className="text-base font-semibold text-fg">
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

          <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-card">
            <div className="border-b border-edge px-4 py-3">
              <h3 className="font-semibold text-fg">
                Vehicle-wise Performance
              </h3>
              <p className="mt-1 text-sm text-fg-muted">
                Vehicle mileage compared to fleet average mileage.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-190 w-full text-left text-sm">
                <thead className="border-b border-edge bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
                  <tr>
                    <th className={SERIAL_COLUMN_CLASS}>S.No</th>
                    <th className="px-4 py-3 font-semibold">Vehicle</th>
                    <th className="px-4 py-3 font-semibold">Mileage</th>
                    <th className="px-4 py-3 font-semibold">
                      Health/Deviation
                    </th>
                    <th className="px-4 py-3 font-semibold">Last Entry</th>
                    <th className="px-4 py-3 font-semibold">
                      Total Fuel Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {performanceRows.items.map((vehicle, index) => (
                    <tr
                      key={vehicle.vehicleId}
                      className="text-fg-muted hover:bg-surface-2/60"
                    >
                      <td className={SERIAL_COLUMN_CLASS}>
                        {serialNumber(index, performanceRows.page)}
                      </td>
                      <td className="max-w-44 px-4 py-3 font-semibold text-fg">
                        <FuelTooltip
                          content={performanceDetails(vehicle)}
                          className="truncate"
                        >
                          {vehicle.vehicleNo}
                        </FuelTooltip>
                      </td>
                      <td className="px-4 py-3">
                        <FuelTooltip content={performanceDetails(vehicle)}>
                          {vehicle.averageMileage === null
                            ? "-"
                            : `${formatNumber(vehicle.averageMileage)} km/L`}
                        </FuelTooltip>
                      </td>
                      <td className="px-4 py-3">
                        <FuelTooltip content={performanceDetails(vehicle)}>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${performanceBadge(
                              vehicle.deviationStatus
                            )}`}
                          >
                            {performanceLabel(vehicle.deviationStatus)}
                          </span>
                        </FuelTooltip>
                      </td>
                      <td className="px-4 py-3">
                        {vehicle.lastFuelDate ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(vehicle.totalFuelAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={performanceRows.page}
              totalItems={analytics.vehicles.length}
              onPageChange={setPerformancePage}
              label="vehicles"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-card">
            <div className="border-b border-edge px-4 py-3">
              <h3 className="font-semibold text-fg">
                Monthly Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-210 w-full text-left text-sm">
                <thead className="border-b border-edge bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
                  <tr>
                    <th className={SERIAL_COLUMN_CLASS}>S.No</th>
                    <th className="px-4 py-3 font-semibold">Month</th>
                    <th className="px-4 py-3 font-semibold">
                      Total Fuel Amount
                    </th>
                    <th className="px-4 py-3 font-semibold">Total Liters</th>
                    <th className="px-4 py-3 font-semibold">Total KM</th>
                    <th className="px-4 py-3 font-semibold">Average Mileage</th>
                    <th className="px-4 py-3 font-semibold">Cost / KM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {analytics.monthlyBreakdown.map((row, index) => (
                    <tr
                      key={row.month}
                      className="text-fg-muted hover:bg-surface-2/60"
                    >
                      <td className={SERIAL_COLUMN_CLASS}>
                        {serialNumber(index)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-fg">
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
                <div className="px-4 py-8 text-center text-sm text-fg-muted">
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

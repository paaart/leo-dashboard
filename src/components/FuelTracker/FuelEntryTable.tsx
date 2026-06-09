import { ExternalLink, Plus } from "lucide-react";
import { FuelEmptyState } from "./FuelEmptyState";
import { FuelStatusBadge } from "./FuelStatusBadge";
import type { FuelEntry, Vehicle } from "@/lib/fuel-tracker/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number | null, digits = 2) {
  if (value === null) return "-";

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
  }).format(value);
}

export function FuelEntryTable({
  entries,
  vehiclesById,
  loading,
  error,
  onAdd,
  onViewProof,
}: {
  entries: FuelEntry[];
  vehiclesById: Map<string, Vehicle>;
  loading: boolean;
  error: string | null;
  onAdd: () => void;
  onViewProof: (path: string) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <FuelEmptyState
        title="No fuel entries found"
        description="Add a fuel entry to begin building vehicle-wise history."
        action={
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Fuel Entry
          </button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="overflow-x-auto">
        <table className="min-w-345 w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Vehicle</th>
              <th className="px-4 py-3 font-semibold">Driver Name</th>
              <th className="px-4 py-3 font-semibold">Driver Mobile</th>
              <th className="px-4 py-3 font-semibold">Fuel Amount</th>
              <th className="px-4 py-3 font-semibold">Fuel Liters</th>
              <th className="px-4 py-3 font-semibold">Odometer</th>
              <th className="px-4 py-3 font-semibold">
                Distance Since Last Refill
              </th>
              <th className="px-4 py-3 font-semibold">Approx. Entry Mileage</th>
              <th className="px-4 py-3 font-semibold">Warning</th>
              <th className="px-4 py-3 font-semibold">Proof</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {entries.map((entry) => {
              const vehicle = vehiclesById.get(entry.vehicle_id);

              return (
                <tr
                  key={entry.id}
                  className="text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/70"
                >
                  <td className="px-4 py-3">{entry.fuel_date}</td>
                  <td className="px-4 py-3 font-semibold text-gray-950 dark:text-gray-50">
                    {vehicle?.vehicle_no ?? "Unknown vehicle"}
                  </td>
                  <td className="px-4 py-3">{entry.driver_name || "-"}</td>
                  <td className="px-4 py-3">{entry.driver_mobile || "-"}</td>
                  <td className="px-4 py-3">
                    {formatCurrency(entry.fuel_amount)}
                  </td>
                  <td className="px-4 py-3">
                    {formatNumber(entry.fuel_liters, 3)} L
                  </td>
                  <td className="px-4 py-3">
                    {formatNumber(entry.odometer_reading)}
                  </td>
                  <td className="px-4 py-3">
                    {entry.km_driven === null
                      ? "-"
                      : `${formatNumber(entry.km_driven, 0)} km`}
                  </td>
                  <td className="px-4 py-3">
                    {entry.approx_mileage === null
                      ? "-"
                      : `${formatNumber(entry.approx_mileage, 2)} km/L`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <FuelStatusBadge
                        status={entry.warning_flag ? "warning" : "normal"}
                      />
                      {entry.warning_flag && entry.warning_reason ? (
                        <p className="max-w-55 text-xs text-amber-700 dark:text-amber-300">
                          {entry.warning_reason}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {entry.bill_image_path ? (
                        <button
                          type="button"
                          onClick={() => onViewProof(entry.bill_image_path!)}
                          title={entry.bill_image_path}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Bill
                        </button>
                      ) : null}
                      {entry.meter_image_path ? (
                        <button
                          type="button"
                          onClick={() => onViewProof(entry.meter_image_path!)}
                          title={entry.meter_image_path}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Meter
                        </button>
                      ) : null}
                      {!entry.bill_image_path && !entry.meter_image_path ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          No proof
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

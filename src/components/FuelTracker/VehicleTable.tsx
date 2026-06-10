import { Plus } from "lucide-react";
import { FuelEmptyState } from "./FuelEmptyState";
import { FuelStatusBadge } from "./FuelStatusBadge";
import type { Vehicle } from "@/lib/fuel-tracker/types";

export function VehicleTable({
  vehicles,
  loading,
  error,
  onAdd,
}: {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  onAdd: () => void;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
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

  if (vehicles.length === 0) {
    return (
      <FuelEmptyState
        title="No vehicles yet"
        description="Add the first vehicle to start tracking fuel entries and mileage history."
        action={
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Vehicle Number</th>
              <th className="px-4 py-3 font-semibold">Vehicle Type</th>
              <th className="px-4 py-3 font-semibold">Leo Company</th>
              <th className="px-4 py-3 font-semibold">Starting Odometer</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {vehicles.map((vehicle) => (
              <tr
                key={vehicle.id}
                className="text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/70"
              >
                <td className="px-4 py-3 font-semibold text-gray-950 dark:text-gray-50">
                  {vehicle.vehicle_no}
                </td>
                <td className="px-4 py-3">{vehicle.vehicle_type}</td>
                <td className="px-4 py-3">
                  {vehicle.assigned_driver || "-"}
                </td>
                <td className="px-4 py-3">
                  {String(vehicle.starting_odometer)}
                </td>
                <td className="px-4 py-3">
                  <FuelStatusBadge status={vehicle.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

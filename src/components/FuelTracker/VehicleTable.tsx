import { Pencil, Plus } from "lucide-react";
import { FuelEmptyState } from "./FuelEmptyState";
import { FuelStatusBadge } from "./FuelStatusBadge";
import { FuelTooltip } from "./FuelTooltip";
import { SERIAL_COLUMN_CLASS, serialNumber } from "./SerialNumber";
import type { Vehicle } from "@/lib/fuel-tracker/types";

function vehicleDetails(vehicle: Vehicle) {
  return [
    `Starting Odometer: ${String(vehicle.starting_odometer)}`,
    `National Permit Last: ${vehicle.national_permit_last_renewal_date ?? "-"}`,
    `National Permit Next: ${vehicle.national_permit_next_renewal_date ?? "-"}`,
    `Insurance Last: ${vehicle.insurance_last_renewal_date ?? "-"}`,
    `Insurance Next: ${vehicle.insurance_next_renewal_date ?? "-"}`,
    `Road Tax Last: ${vehicle.road_tax_last_renewal_date ?? "-"}`,
    `Road Tax Next: ${vehicle.road_tax_next_renewal_date ?? "-"}`,
    `Created: ${vehicle.created_at}`,
    `Updated: ${vehicle.updated_at}`,
  ].join("\n");
}

export function VehicleTable({
  vehicles,
  loading,
  error,
  currentPage = 1,
  pageSize = 50,
  onAdd,
  onEdit,
  onViewRenewals,
}: {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  currentPage?: number;
  pageSize?: number;
  onAdd: () => void;
  onEdit: (vehicle: Vehicle) => void;
  onViewRenewals: (vehicle: Vehicle) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-edge bg-surface p-4 shadow-card">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-md bg-surface-2"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger/25 bg-danger-soft p-4 text-sm text-danger-soft-fg">
        {error}
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <FuelEmptyState
        title="No vehicles yet"
        description="Add the first vehicle to start tracking fuel entries, expenses, and mileage history."
        action={
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-160 w-full text-left text-sm">
          <thead className="border-b border-edge bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
            <tr>
              <th className={SERIAL_COLUMN_CLASS}>S.No</th>
              <th className="px-4 py-3 font-semibold">Vehicle Number</th>
              <th className="px-4 py-3 font-semibold">Vehicle Type</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Renewals</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {vehicles.map((vehicle, index) => (
              <tr
                key={vehicle.id}
                className="text-fg-muted hover:bg-surface-2/60"
              >
                <td className={SERIAL_COLUMN_CLASS}>
                  {serialNumber(index, currentPage, pageSize)}
                </td>
                <td className="max-w-44 px-4 py-3 font-semibold text-fg">
                  <FuelTooltip
                    content={vehicleDetails(vehicle)}
                    className="truncate"
                  >
                    {vehicle.vehicle_no}
                  </FuelTooltip>
                </td>
                <td className="px-4 py-3">{vehicle.vehicle_type}</td>
                <td className="px-4 py-3">{vehicle.company || "-"}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onViewRenewals(vehicle)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-edge px-3 text-sm font-medium text-fg hover:bg-surface-2"
                  >
                    View Renewals
                  </button>
                </td>
                <td className="px-4 py-3">
                  <FuelTooltip content={vehicleDetails(vehicle)}>
                    <span className="inline-flex">
                      <FuelStatusBadge status={vehicle.status} />
                    </span>
                  </FuelTooltip>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onEdit(vehicle)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-edge px-3 text-sm font-medium text-fg hover:bg-surface-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

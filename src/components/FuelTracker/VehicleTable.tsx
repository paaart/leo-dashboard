import { Pencil, Plus } from "lucide-react";
import { FuelEmptyState } from "./FuelEmptyState";
import { FuelStatusBadge } from "./FuelStatusBadge";
import { FuelTooltip } from "./FuelTooltip";
import { SERIAL_COLUMN_CLASS, serialNumber } from "./SerialNumber";
import type { Vehicle } from "@/lib/fuel-tracker/types";

function vehicleDetails(vehicle: Vehicle) {
  return [
    `Starting Odometer: ${String(vehicle.starting_odometer)}`,
    `National Permit: ${vehicle.national_permit_renewal_date ?? "-"}`,
    `Insurance: ${vehicle.insurance_renewal_date ?? "-"}`,
    `Road Tax: ${vehicle.road_tax_renewal_date ?? "-"}`,
    `Created: ${vehicle.created_at}`,
    `Updated: ${vehicle.updated_at}`,
  ].join("\n");
}

function fmtDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN");
}

function fmtCurrency(value: number | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function RenewalDate({
  label,
  value,
  amount,
  vendor,
}: {
  label: string;
  value: string | null;
  amount: number | null;
  vendor: string | null;
}) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2 text-xs">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-gray-800 dark:text-gray-200">
        <span className="font-medium">{fmtDate(value)}</span>
        <span className="ml-2 text-gray-500 dark:text-gray-400">
          {fmtCurrency(amount)}
          {vendor ? ` · ${vendor}` : ""}
        </span>
      </span>
    </div>
  );
}

export function VehicleTable({
  vehicles,
  loading,
  error,
  currentPage = 1,
  pageSize = 50,
  onAdd,
  onEdit,
}: {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  currentPage?: number;
  pageSize?: number;
  onAdd: () => void;
  onEdit: (vehicle: Vehicle) => void;
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
        description="Add the first vehicle to start tracking fuel entries, expenses, and mileage history."
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
        <table className="min-w-160 w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
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
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {vehicles.map((vehicle, index) => (
              <tr
                key={vehicle.id}
                className="text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/70"
              >
                <td className={SERIAL_COLUMN_CLASS}>
                  {serialNumber(index, currentPage, pageSize)}
                </td>
                <td className="max-w-44 px-4 py-3 font-semibold text-gray-950 dark:text-gray-50">
                  <FuelTooltip
                    content={vehicleDetails(vehicle)}
                    className="truncate"
                  >
                    {vehicle.vehicle_no}
                  </FuelTooltip>
                </td>
                <td className="px-4 py-3">{vehicle.vehicle_type}</td>
                <td className="px-4 py-3">{vehicle.company || "-"}</td>
                <td className="min-w-52 px-4 py-3">
                  <div className="space-y-1.5">
                    <RenewalDate
                      label="Permit"
                      value={vehicle.national_permit_renewal_date}
                      amount={vehicle.national_permit_renewal_amount}
                      vendor={vehicle.national_permit_renewal_vendor}
                    />
                    <RenewalDate
                      label="Insurance"
                      value={vehicle.insurance_renewal_date}
                      amount={vehicle.insurance_renewal_amount}
                      vendor={vehicle.insurance_renewal_vendor}
                    />
                    <RenewalDate
                      label="Road Tax"
                      value={vehicle.road_tax_renewal_date}
                      amount={vehicle.road_tax_renewal_amount}
                      vendor={vehicle.road_tax_renewal_vendor}
                    />
                  </div>
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
                    className="inline-flex min-h-9 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
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

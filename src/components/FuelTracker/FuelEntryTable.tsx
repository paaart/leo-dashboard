import { ExternalLink, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { FuelEmptyState } from "./FuelEmptyState";
import { FuelStatusBadge } from "./FuelStatusBadge";
import { FuelTooltip } from "./FuelTooltip";
import { SERIAL_COLUMN_CLASS, serialNumber } from "./SerialNumber";
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

function formatOdometer(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return String(value);
}

function proofDetails(entry: FuelEntry) {
  const proof = [
    entry.bill_image_path ? `Bill: ${entry.bill_image_path}` : null,
    entry.meter_image_path ? `Meter: ${entry.meter_image_path}` : null,
  ].filter(Boolean);

  return proof.length > 0 ? proof.join("\n") : "No Proof";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-inverse-muted">
        {label}
      </p>
      <p className="break-words text-xs text-fg-inverse">{value}</p>
    </div>
  );
}

function FuelEntryDetails({ entry }: { entry: FuelEntry }) {
  return (
    <div className="space-y-3">
      <DetailRow label="Company" value={entry.company || "-"} />
      <DetailRow label="Driver" value={entry.driver_name || "-"} />
      <DetailRow label="Mobile" value={entry.driver_mobile || "-"} />
      <DetailRow
        label="Distance Since Last Refill"
        value={
          entry.km_driven === null
            ? "-"
            : `${formatNumber(entry.km_driven, 0)} km`
        }
      />
      <DetailRow
        label="Approx Entry Mileage"
        value={
          entry.approx_mileage === null
            ? "-"
            : `${formatNumber(entry.approx_mileage, 2)} km/L`
        }
      />
      <DetailRow label="Proof" value={proofDetails(entry)} />
      <DetailRow label="Created At" value={entry.created_at || "-"} />
      <DetailRow label="Updated At" value={entry.updated_at || "-"} />
    </div>
  );
}

export function FuelEntryTable({
  entries,
  vehiclesById,
  loading,
  error,
  currentPage = 1,
  pageSize = 50,
  onAdd,
  onEdit,
  onDelete,
  onViewProof,
}: {
  entries: FuelEntry[];
  vehiclesById: Map<string, Vehicle>;
  loading: boolean;
  error: string | null;
  currentPage?: number;
  pageSize?: number;
  onAdd: () => void;
  onEdit: (entry: FuelEntry) => void;
  onDelete: (entry: FuelEntry) => void;
  onViewProof: (path: string) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-edge bg-surface p-4 shadow-card">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
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

  if (entries.length === 0) {
    return (
      <FuelEmptyState
        title="No fuel entries found"
        description="Add a fuel entry to begin building vehicle-wise history."
        action={
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            Add Fuel Entry
          </button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-240 w-full text-left text-sm">
          <thead className="border-b border-edge bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
            <tr>
              <th className={SERIAL_COLUMN_CLASS}>S.No</th>
              <th className="w-30 px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Vehicle</th>
              <th className="px-4 py-3 text-right font-semibold">
                Fuel Amount
              </th>
              <th className="px-4 py-3 text-right font-semibold">
                Fuel Litres
              </th>
              <th className="px-4 py-3 font-semibold">Odometer</th>
              <th className="px-4 py-3 font-semibold">Warning</th>
              <th className="px-4 py-3 font-semibold">Proof</th>
              <th className="px-4 py-3 font-semibold">Details</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {entries.map((entry, index) => {
              const vehicle = vehiclesById.get(entry.vehicle_id);

              return (
                <tr
                  key={entry.id}
                  className="text-fg-muted hover:bg-surface-2/60"
                >
                  <td className={SERIAL_COLUMN_CLASS}>
                    {serialNumber(index, currentPage, pageSize)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {entry.fuel_date}
                  </td>
                  <td className="max-w-44 px-4 py-3 font-semibold text-fg">
                    <span className="block truncate">
                      {vehicle?.vehicle_no ?? "Unknown vehicle"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(entry.fuel_amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatNumber(entry.fuel_liters, 3)} L
                  </td>
                  <td className="px-4 py-3">
                    {formatOdometer(entry.odometer_reading)}
                  </td>
                  <td className="px-4 py-3">
                    <FuelStatusBadge
                      status={entry.warning_flag ? "warning" : "normal"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {entry.bill_image_path ? (
                        <button
                          type="button"
                          onClick={() => onViewProof(entry.bill_image_path!)}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-edge px-2.5 text-xs font-medium text-fg hover:bg-surface-2"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Bill
                        </button>
                      ) : null}
                      {entry.meter_image_path ? (
                        <button
                          type="button"
                          onClick={() => onViewProof(entry.meter_image_path!)}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-edge px-2.5 text-xs font-medium text-fg hover:bg-surface-2"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Meter
                        </button>
                      ) : null}
                      {!entry.bill_image_path && !entry.meter_image_path ? (
                        <span className="text-xs text-fg-muted">
                          No Proof
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <FuelTooltip content={<FuelEntryDetails entry={entry} />}>
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-edge px-2.5 py-1 text-xs font-medium text-fg-muted transition hover:border-accent/25 hover:bg-accent-soft hover:text-accent-soft-fg">
                        <Info className="h-3.5 w-3.5" />
                        Details
                      </span>
                    </FuelTooltip>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(entry)}
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-edge px-3 text-sm font-medium text-fg hover:bg-surface-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(entry)}
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-danger/25 px-3 text-sm font-medium text-danger-soft-fg hover:bg-danger-soft"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
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

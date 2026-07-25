import { modalOverlay } from "@/components/shared/ui";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  CreateFuelEntryPayload,
  FuelEntry,
  Vehicle,
} from "@/lib/fuel-tracker/types";

const initialForm = {
  vehicleId: "",
  fuelDate: new Date().toISOString().slice(0, 10),
  fuelAmount: "",
  fuelLiters: "",
  odometerReading: "",
  driverName: "",
  driverMobile: "",
  remarks: "",
};

function FilePicker({
  id,
  label,
  file,
  error,
  onChange,
}: {
  id: string;
  label: string;
  file: File | null;
  error?: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-fg">
        {label}
      </span>
      <div className="flex min-h-10 items-center gap-3 rounded-md border border-dashed border-edge-strong bg-surface-2 px-3 py-2">
        <ImagePlus className="h-4 w-4 text-fg-muted" />
        <span className="min-w-0 flex-1 truncate text-sm text-fg-muted">
          {file ? file.name : "PNG, JPEG, or WebP up to 5 MB"}
        </span>
        <span className="rounded-md border border-edge bg-surface px-2.5 py-1 text-xs font-medium text-fg">
          Choose
        </span>
      </div>
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      {error ? (
        <span className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function FuelEntryFormModal({
  open,
  vehicles,
  loading,
  entry,
  onClose,
  onSubmit,
}: {
  open: boolean;
  vehicles: Vehicle[];
  loading: boolean;
  entry?: FuelEntry | null;
  onClose: () => void;
  onSubmit: (
    payload: Omit<CreateFuelEntryPayload, "billImagePath" | "meterImagePath">,
    files: { bill: File | null; meter: File | null }
  ) => Promise<void>;
}) {
  const [form, setForm] = useState(initialForm);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [meterFile, setMeterFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(entry);

  const activeVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status === "active"),
    [vehicles]
  );

  useEffect(() => {
    if (open) {
      setForm(
        entry
          ? {
              vehicleId: entry.vehicle_id,
              fuelDate: entry.fuel_date,
              fuelAmount: String(entry.fuel_amount),
              fuelLiters: String(entry.fuel_liters),
              odometerReading: String(entry.odometer_reading),
              driverName: entry.driver_name ?? "",
              driverMobile: entry.driver_mobile ?? "",
              remarks: entry.remarks ?? "",
            }
          : {
              ...initialForm,
              vehicleId: activeVehicles[0]?.id ?? vehicles[0]?.id ?? "",
            }
      );
      setBillFile(null);
      setMeterFile(null);
      setError(null);
    }
  }, [activeVehicles, entry, open, vehicles]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const fuelAmount = Number(form.fuelAmount);
    const fuelLiters = Number(form.fuelLiters);
    const odometerReading = Number(form.odometerReading);
    const driverName = form.driverName.trim();
    const driverMobile = form.driverMobile.trim();

    if (!form.vehicleId) {
      setError("Select a vehicle.");
      return;
    }
    if (!form.fuelDate) {
      setError("Fuel date is required.");
      return;
    }
    if (!Number.isFinite(fuelAmount) || fuelAmount <= 0) {
      setError("Fuel amount must be greater than zero.");
      return;
    }
    if (!Number.isFinite(fuelLiters) || fuelLiters <= 0) {
      setError("Fuel liters must be greater than zero.");
      return;
    }
    if (!Number.isFinite(odometerReading) || odometerReading <= 0) {
      setError("Odometer reading must be greater than zero.");
      return;
    }
    if (driverMobile && !/^\d{10,}$/.test(driverMobile)) {
      setError("Driver mobile must contain at least 10 digits.");
      return;
    }

    await onSubmit(
      {
        vehicleId: form.vehicleId,
        fuelDate: form.fuelDate,
        fuelAmount,
        fuelLiters,
        odometerReading,
        driverName: driverName || null,
        driverMobile: driverMobile || null,
        remarks: form.remarks.trim() || null,
      },
      { bill: billFile, meter: meterFile }
    );
  };

  return (
    <div className={modalOverlay}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-xl border border-edge bg-surface shadow-overlay">
        <div className="flex items-start justify-between gap-4 border-b border-edge px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-fg">
              {isEdit ? "Edit Fuel Entry" : "Add Fuel Entry"}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              {isEdit
                ? "Correct fuel details and recalculate the affected mileage chain."
                : "Upload bill and meter photos if available."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-fg-muted hover:bg-surface-2 hover:text-fg"
            aria-label="Close add fuel entry dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(92vh-80px)] space-y-4 overflow-y-auto px-5 py-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-fg">
                Vehicle
              </span>
              <select
                value={form.vehicleId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    vehicleId: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              >
                <option value="">Select vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicle_no} - {vehicle.vehicle_type}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
                Fuel Date
              </span>
              <input
                type="date"
                value={form.fuelDate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    fuelDate: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
                Fuel Amount
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.fuelAmount}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    fuelAmount: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="4500"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
                Fuel Liters
              </span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={form.fuelLiters}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    fuelLiters: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="50"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
                Odometer Reading
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.odometerReading}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    odometerReading: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="100200"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
                Driver Name
              </span>
              <input
                value={form.driverName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    driverName: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="Driver name"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
                Driver Mobile
              </span>
              <input
                type="tel"
                inputMode="numeric"
                value={form.driverMobile}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    driverMobile: event.target.value.replace(/\D/g, ""),
                  }))
                }
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="9876543210"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FilePicker
              id="fuel-bill-image"
              label="Bill Image"
              file={billFile}
              onChange={setBillFile}
            />
            <FilePicker
              id="fuel-meter-image"
              label="Meter Image"
              file={meterFile}
              onChange={setMeterFile}
            />
          </div>
          {isEdit ? (
            <p className="text-xs text-fg-muted">
              Existing proof images are kept unless a new file is selected.
            </p>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg">
              Remarks
            </span>
            <textarea
              value={form.remarks}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  remarks: event.target.value,
                }))
              }
              className="min-h-24 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              placeholder="Optional notes"
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger-soft-fg">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-edge pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="min-h-10 rounded-lg border border-edge px-4 text-sm font-medium text-fg hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || vehicles.length === 0}
              className="min-h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Fuel Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

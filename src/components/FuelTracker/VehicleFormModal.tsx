import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type {
  CreateVehiclePayload,
  VehicleStatus,
} from "@/lib/fuel-tracker/types";

const initialForm = {
  vehicleNo: "",
  vehicleType: "",
  assignedDriver: "",
  startingOdometer: "",
  status: "active" as VehicleStatus,
};

export function VehicleFormModal({
  open,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateVehiclePayload) => Promise<void>;
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const startingOdometer = Number(form.startingOdometer);

    if (!form.vehicleNo.trim()) {
      setError("Vehicle number is required.");
      return;
    }
    if (!form.vehicleType.trim()) {
      setError("Vehicle type is required.");
      return;
    }
    if (!Number.isFinite(startingOdometer) || startingOdometer < 0) {
      setError("Starting odometer must be a non-negative number.");
      return;
    }

    await onSubmit({
      vehicleNo: form.vehicleNo.trim().toUpperCase(),
      vehicleType: form.vehicleType.trim(),
      assignedDriver: form.assignedDriver.trim() || null,
      startingOdometer,
      status: form.status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
              Add Vehicle
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Register a vehicle before adding fuel entries.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            aria-label="Close add vehicle dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Vehicle Number
              </span>
              <input
                value={form.vehicleNo}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    vehicleNo: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="KA01AB1234"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Must be unique.
              </span>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Vehicle Type
              </span>
              <input
                value={form.vehicleType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    vehicleType: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="Truck"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Assigned Driver
              </span>
              <input
                value={form.assignedDriver}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    assignedDriver: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="Ramesh"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Starting Odometer
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.startingOdometer}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    startingOdometer: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="100000"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Status
            </span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  status: event.target.value as VehicleStatus,
                }))
              }
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="min-h-10 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-10 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Create Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

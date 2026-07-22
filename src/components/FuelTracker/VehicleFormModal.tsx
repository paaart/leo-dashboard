import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type {
  CreateVehiclePayload,
  Vehicle,
  VehicleStatus,
} from "@/lib/fuel-tracker/types";

const initialForm = {
  vehicleNo: "",
  vehicleType: "",
  company: "",
  startingOdometer: "",
  status: "active" as VehicleStatus,
  nationalPermitRenewalDate: "",
  nationalPermitRenewalAmount: "",
  nationalPermitRenewalVendor: "",
  insuranceRenewalDate: "",
  insuranceRenewalAmount: "",
  insuranceRenewalVendor: "",
  roadTaxRenewalDate: "",
  roadTaxRenewalAmount: "",
  roadTaxRenewalVendor: "",
};

function optionalAmount(value: string) {
  return value.trim() ? Number(value) : null;
}

export function VehicleFormModal({
  open,
  loading,
  vehicle,
  hasFuelEntries = false,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  vehicle?: Vehicle | null;
  hasFuelEntries?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateVehiclePayload) => Promise<void>;
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(vehicle);

  useEffect(() => {
    if (open) {
      setForm(
        vehicle
          ? {
              vehicleNo: vehicle.vehicle_no,
              vehicleType: vehicle.vehicle_type,
              company: vehicle.company ?? "",
              startingOdometer: String(vehicle.starting_odometer),
              status: vehicle.status,
              nationalPermitRenewalDate:
                vehicle.national_permit_renewal_date ?? "",
              nationalPermitRenewalAmount:
                vehicle.national_permit_renewal_amount === null
                  ? ""
                  : String(vehicle.national_permit_renewal_amount),
              nationalPermitRenewalVendor:
                vehicle.national_permit_renewal_vendor ?? "",
              insuranceRenewalDate: vehicle.insurance_renewal_date ?? "",
              insuranceRenewalAmount:
                vehicle.insurance_renewal_amount === null
                  ? ""
                  : String(vehicle.insurance_renewal_amount),
              insuranceRenewalVendor: vehicle.insurance_renewal_vendor ?? "",
              roadTaxRenewalDate: vehicle.road_tax_renewal_date ?? "",
              roadTaxRenewalAmount:
                vehicle.road_tax_renewal_amount === null
                  ? ""
                  : String(vehicle.road_tax_renewal_amount),
              roadTaxRenewalVendor: vehicle.road_tax_renewal_vendor ?? "",
            }
          : initialForm
      );
      setError(null);
    }
  }, [open, vehicle]);

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

    const renewalAmounts = [
      form.nationalPermitRenewalAmount,
      form.insuranceRenewalAmount,
      form.roadTaxRenewalAmount,
    ].map(optionalAmount);

    if (
      renewalAmounts.some(
        (amount) => amount !== null && (!Number.isFinite(amount) || amount <= 0)
      )
    ) {
      setError("Renewal amounts must be greater than zero.");
      return;
    }

    await onSubmit({
      vehicleNo: form.vehicleNo.trim().toUpperCase(),
      vehicleType: form.vehicleType.trim(),
      company: form.company.trim() || null,
      startingOdometer,
      status: form.status,
      nationalPermitRenewalDate: form.nationalPermitRenewalDate || null,
      nationalPermitRenewalAmount: optionalAmount(
        form.nationalPermitRenewalAmount
      ),
      nationalPermitRenewalVendor:
        form.nationalPermitRenewalVendor.trim() || null,
      insuranceRenewalDate: form.insuranceRenewalDate || null,
      insuranceRenewalAmount: optionalAmount(form.insuranceRenewalAmount),
      insuranceRenewalVendor: form.insuranceRenewalVendor.trim() || null,
      roadTaxRenewalDate: form.roadTaxRenewalDate || null,
      roadTaxRenewalAmount: optionalAmount(form.roadTaxRenewalAmount),
      roadTaxRenewalVendor: form.roadTaxRenewalVendor.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
              {isEdit ? "Edit Vehicle" : "Add Vehicle"}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isEdit
                ? "Update vehicle details used across tracker views."
                : "Register a vehicle before adding fuel entries or expenses."}
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
                Leo Company
              </span>
              <input
                value={form.company}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    company: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="LEO PACKERS AND MOVERS"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Company/entity this vehicle belongs to.
              </span>
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
              {isEdit && hasFuelEntries ? (
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  Changing starting odometer may affect baseline mileage
                  interpretation for this vehicle.
                </span>
              ) : null}
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

          <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <div>
              <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">
                Renewal Dates
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Alerts appear 15 days before each renewal date.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  National Permit
                </span>
                <input
                  type="date"
                  value={form.nationalPermitRenewalDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      nationalPermitRenewalDate: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.nationalPermitRenewalAmount}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      nationalPermitRenewalAmount: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                  placeholder="Amount"
                />
                <input
                  value={form.nationalPermitRenewalVendor}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      nationalPermitRenewalVendor: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                  placeholder="Vendor / authority"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Insurance
                </span>
                <input
                  type="date"
                  value={form.insuranceRenewalDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      insuranceRenewalDate: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.insuranceRenewalAmount}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      insuranceRenewalAmount: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                  placeholder="Amount"
                />
                <input
                  value={form.insuranceRenewalVendor}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      insuranceRenewalVendor: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                  placeholder="Vendor / authority"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Road Tax
                </span>
                <input
                  type="date"
                  value={form.roadTaxRenewalDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      roadTaxRenewalDate: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.roadTaxRenewalAmount}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      roadTaxRenewalAmount: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                  placeholder="Amount"
                />
                <input
                  value={form.roadTaxRenewalVendor}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      roadTaxRenewalVendor: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                  placeholder="Vendor / authority"
                />
              </label>
            </div>
          </div>

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
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

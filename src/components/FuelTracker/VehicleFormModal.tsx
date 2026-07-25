import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type {
  CreateVehiclePayload,
  Vehicle,
  VehicleStatus,
} from "@/lib/fuel-tracker/types";
import { FuelTooltip } from "./FuelTooltip";

const initialForm = {
  vehicleNo: "",
  vehicleType: "",
  company: "",
  startingOdometer: "",
  status: "active" as VehicleStatus,
  nationalPermitLastRenewalDate: "",
  nationalPermitNextRenewalDate: "",
  nationalPermitRenewalAmount: "",
  nationalPermitRenewalVendor: "",
  insuranceLastRenewalDate: "",
  insuranceNextRenewalDate: "",
  insuranceRenewalAmount: "",
  insuranceRenewalVendor: "",
  roadTaxLastRenewalDate: "",
  roadTaxNextRenewalDate: "",
  roadTaxRenewalAmount: "",
  roadTaxRenewalVendor: "",
};

type RenewalType = "nationalPermit" | "insurance" | "roadTax";

const initialNextRenewalEdited: Record<RenewalType, boolean> = {
  nationalPermit: false,
  insurance: false,
  roadTax: false,
};

function optionalAmount(value: string) {
  return value.trim() ? Number(value) : null;
}

function addDays(value: string, days: number) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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
  const [nextRenewalEdited, setNextRenewalEdited] = useState(
    initialNextRenewalEdited
  );
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
              nationalPermitLastRenewalDate:
                vehicle.national_permit_last_renewal_date ?? "",
              nationalPermitNextRenewalDate:
                vehicle.national_permit_next_renewal_date ?? "",
              nationalPermitRenewalAmount:
                vehicle.national_permit_renewal_amount === null
                  ? ""
                  : String(vehicle.national_permit_renewal_amount),
              nationalPermitRenewalVendor:
                vehicle.national_permit_renewal_vendor ?? "",
              insuranceLastRenewalDate:
                vehicle.insurance_last_renewal_date ?? "",
              insuranceNextRenewalDate:
                vehicle.insurance_next_renewal_date ?? "",
              insuranceRenewalAmount:
                vehicle.insurance_renewal_amount === null
                  ? ""
                  : String(vehicle.insurance_renewal_amount),
              insuranceRenewalVendor: vehicle.insurance_renewal_vendor ?? "",
              roadTaxLastRenewalDate:
                vehicle.road_tax_last_renewal_date ?? "",
              roadTaxNextRenewalDate:
                vehicle.road_tax_next_renewal_date ?? "",
              roadTaxRenewalAmount:
                vehicle.road_tax_renewal_amount === null
                  ? ""
                  : String(vehicle.road_tax_renewal_amount),
              roadTaxRenewalVendor: vehicle.road_tax_renewal_vendor ?? "",
            }
          : initialForm
      );
      setNextRenewalEdited(initialNextRenewalEdited);
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
      nationalPermitLastRenewalDate:
        form.nationalPermitLastRenewalDate || null,
      nationalPermitNextRenewalDate:
        form.nationalPermitNextRenewalDate || null,
      nationalPermitRenewalAmount: optionalAmount(
        form.nationalPermitRenewalAmount
      ),
      nationalPermitRenewalVendor:
        form.nationalPermitRenewalVendor.trim() || null,
      insuranceLastRenewalDate: form.insuranceLastRenewalDate || null,
      insuranceNextRenewalDate: form.insuranceNextRenewalDate || null,
      insuranceRenewalAmount: optionalAmount(form.insuranceRenewalAmount),
      insuranceRenewalVendor: form.insuranceRenewalVendor.trim() || null,
      roadTaxLastRenewalDate: form.roadTaxLastRenewalDate || null,
      roadTaxNextRenewalDate: form.roadTaxNextRenewalDate || null,
      roadTaxRenewalAmount: optionalAmount(form.roadTaxRenewalAmount),
      roadTaxRenewalVendor: form.roadTaxRenewalVendor.trim() || null,
    });
  };

  const changeLastRenewalDate = (
    type: RenewalType,
    lastKey:
      | "nationalPermitLastRenewalDate"
      | "insuranceLastRenewalDate"
      | "roadTaxLastRenewalDate",
    nextKey:
      | "nationalPermitNextRenewalDate"
      | "insuranceNextRenewalDate"
      | "roadTaxNextRenewalDate",
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [lastKey]: value,
      ...(nextRenewalEdited[type] ? {} : { [nextKey]: addDays(value, 365) }),
    }));
  };

  const changeNextRenewalDate = (
    type: RenewalType,
    key:
      | "nationalPermitNextRenewalDate"
      | "insuranceNextRenewalDate"
      | "roadTaxNextRenewalDate",
    value: string
  ) => {
    setNextRenewalEdited((previous) => ({ ...previous, [type]: true }));
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const renewalHelpText =
    "Last Renewal Date is the date payment was actually made. Next Renewal Date is the date used for alerts and urgency.";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
      <div className="mx-auto my-4 flex w-full max-w-xl max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
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

        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
        >
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
                className="no-number-spinner h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
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
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">
                  Renewal Details
                </h3>
                <FuelTooltip content={renewalHelpText}>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-400/70 text-[10px] font-semibold text-gray-500 dark:border-gray-600 dark:text-gray-400">
                    i
                  </span>
                </FuelTooltip>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-2">
                <span className="text-base font-medium text-gray-800 dark:text-gray-200">
                  National Permit
                </span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  Last Renewal Date
                </span>
                <input
                  type="date"
                  value={form.nationalPermitLastRenewalDate}
                  onChange={(event) =>
                    changeLastRenewalDate(
                      "nationalPermit",
                      "nationalPermitLastRenewalDate",
                      "nationalPermitNextRenewalDate",
                      event.target.value
                    )
                  }
                  title="Date on which payment was actually made."
                  className="no-number-spinner h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                />
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  Next Renewal Date
                </span>
                <input
                  type="date"
                  value={form.nationalPermitNextRenewalDate}
                  onChange={(event) =>
                    changeNextRenewalDate(
                      "nationalPermit",
                      "nationalPermitNextRenewalDate",
                      event.target.value
                    )
                  }
                  title="Next expected renewal. Alerts are generated from this date."
                  className="no-number-spinner h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                />
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  Last Renewal Amount
                </span>
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
                  className="no-number-spinner h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                  placeholder="Amount"
                />
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  Vendor / Authority
                </span>
                <input
                  value={form.nationalPermitRenewalVendor}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      nationalPermitRenewalVendor: event.target.value,
                  }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                  placeholder="Name"
                />
              </div>

              <div className="space-y-2">
                <span className="text-base font-medium text-gray-800 dark:text-gray-200">
                  Insurance
                </span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  Last Renewal Date
                </span>
                <input
                  type="date"
                  value={form.insuranceLastRenewalDate}
                  onChange={(event) =>
                    changeLastRenewalDate(
                      "insurance",
                      "insuranceLastRenewalDate",
                      "insuranceNextRenewalDate",
                      event.target.value
                    )
                  }
                  title="Date on which payment was actually made."
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                />
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  Next Renewal Date
                </span>
                <input
                  type="date"
                  value={form.insuranceNextRenewalDate}
                  onChange={(event) =>
                    changeNextRenewalDate(
                      "insurance",
                      "insuranceNextRenewalDate",
                      event.target.value
                    )
                  }
                  title="Next expected renewal. Alerts are generated from this date."
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                />
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  Last Renewal Amount
                </span>
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
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  Vendor / Authority
                </span>
                <input
                  value={form.insuranceRenewalVendor}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      insuranceRenewalVendor: event.target.value,
                  }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                  placeholder="Name"
                />
              </div>

              <div className="space-y-2">
                <span className="text-base font-medium text-gray-800 dark:text-gray-200">
                  Road Tax
                </span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  Last Renewal Date
                </span>
                <input
                  type="date"
                  value={form.roadTaxLastRenewalDate}
                  onChange={(event) =>
                    changeLastRenewalDate(
                      "roadTax",
                      "roadTaxLastRenewalDate",
                      "roadTaxNextRenewalDate",
                      event.target.value
                    )
                  }
                  title="Date on which payment was actually made."
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                />
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  Next Renewal Date
                </span>
                <input
                  type="date"
                  value={form.roadTaxNextRenewalDate}
                  onChange={(event) =>
                    changeNextRenewalDate(
                      "roadTax",
                      "roadTaxNextRenewalDate",
                      event.target.value
                    )
                  }
                  title="Next expected renewal. Alerts are generated from this date."
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                />
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  Last Renewal Amount
                </span>
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
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  Vendor / Authority
                </span>
                <input
                  value={form.roadTaxRenewalVendor}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      roadTaxRenewalVendor: event.target.value,
                  }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                  placeholder="Name"
                />
              </div>
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

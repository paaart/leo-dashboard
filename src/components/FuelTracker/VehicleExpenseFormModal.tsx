import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  CreateVehicleExpensePayload,
  Vehicle,
} from "@/lib/fuel-tracker/types";

const expenseTypes = [
  "Repair",
  "Part Purchase",
  "Tax",
  "Insurance",
  "Service",
  "Permit",
  "Tyres",
  "Battery",
  "Other",
];

const initialForm = {
  expenseScope: "vehicle",
  expenseDate: new Date().toISOString().slice(0, 10),
  vehicleId: "",
  expenseType: "",
  description: "",
  amount: "",
  vendor: "",
  invoiceReference: "",
  city: "",
  paymentMode: "",
  company: "",
  status: "pending",
};

export function VehicleExpenseFormModal({
  open,
  vehicles,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  vehicles: Vehicle[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateVehicleExpensePayload) => Promise<void>;
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);

  const activeVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status === "active"),
    [vehicles]
  );

  useEffect(() => {
    if (open) {
      setForm({
        ...initialForm,
        vehicleId: activeVehicles[0]?.id ?? vehicles[0]?.id ?? "",
        expenseType: expenseTypes[0],
      });
      setError(null);
    }
  }, [activeVehicles, open, vehicles]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const amount = Number(form.amount);
    const isVehicleExpense = form.expenseScope === "vehicle";

    if (!form.expenseDate) {
      setError("Date is required.");
      return;
    }
    if (isVehicleExpense && !form.vehicleId) {
      setError("Select a vehicle.");
      return;
    }
    if (!form.expenseType.trim()) {
      setError("Expense type is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    await onSubmit({
      expenseDate: form.expenseDate,
      expenseScope: isVehicleExpense ? "vehicle" : "general",
      vehicleId: isVehicleExpense ? form.vehicleId : null,
      expenseType: form.expenseType.trim(),
      description: form.description.trim() || null,
      amount,
      vendor: form.vendor.trim() || null,
      invoiceReference: form.invoiceReference.trim() || null,
      city: form.city.trim() || null,
      paymentMode: form.paymentMode.trim() || null,
      company: form.company.trim() || null,
      status: form.status === "pending" ? "pending" : "paid",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
              Add Expense
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Record non-fuel vehicle expenses for operating cost tracking.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            aria-label="Close add expense dialog"
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
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Expense Scope
              </span>
              <select
                value={form.expenseScope}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    expenseScope:
                      event.target.value === "general" ? "general" : "vehicle",
                  }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
              >
                <option value="vehicle">Vehicle Expense</option>
                <option value="general">General Expense</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Date
              </span>
              <input
                type="date"
                value={form.expenseDate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    expenseDate: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
              />
            </label>

            {form.expenseScope === "vehicle" ? (
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
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
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicle_no} - {vehicle.vehicle_type}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Expense Type
              </span>
              <select
                value={form.expenseType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    expenseType: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
              >
                {expenseTypes.map((expenseType) => (
                  <option key={expenseType} value={expenseType}>
                    {expenseType}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Amount
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    amount: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="2500"
              />
            </label>

            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Description
              </span>
              <input
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="Optional details"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Vendor
              </span>
              <input
                value={form.vendor}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, vendor: event.target.value }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="Vendor name"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Invoice Reference
              </span>
              <input
                value={form.invoiceReference}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    invoiceReference: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="Invoice number"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                City
              </span>
              <input
                value={form.city}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, city: event.target.value }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="City"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Mode Of Payment
              </span>
              <input
                value={form.paymentMode}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    paymentMode: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="Cash, UPI, bank transfer"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Company
              </span>
              <input
                value={form.company}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, company: event.target.value }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="Company"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Status
              </span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
              >
                <option value="pending">Pending</option>
              </select>
            </label>
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
              {loading ? "Saving..." : "Create Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { modalOverlay } from "@/components/shared/ui";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  CreateVehicleExpensePayload,
  Vehicle,
  VehicleExpense,
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
  expense,
  onClose,
  onSubmit,
}: {
  open: boolean;
  vehicles: Vehicle[];
  loading: boolean;
  expense?: VehicleExpense | null;
  onClose: () => void;
  onSubmit: (payload: CreateVehicleExpensePayload) => Promise<void>;
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(expense);

  const activeVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status === "active"),
    [vehicles]
  );

  useEffect(() => {
    if (open) {
      setForm(
        expense
          ? {
              expenseScope: expense.vehicle_id ? "vehicle" : "general",
              expenseDate: expense.expense_date,
              vehicleId: expense.vehicle_id ?? "",
              expenseType: expense.expense_type,
              description: expense.description ?? "",
              amount: String(expense.amount),
              vendor: expense.vendor ?? "",
              invoiceReference: expense.invoice_reference ?? "",
              city: expense.city ?? "",
              paymentMode: expense.payment_mode ?? "",
              company: expense.company ?? "",
              status: expense.status,
            }
          : {
              ...initialForm,
              vehicleId: activeVehicles[0]?.id ?? vehicles[0]?.id ?? "",
              expenseType: expenseTypes[0],
            }
      );
      setError(null);
    }
  }, [activeVehicles, expense, open, vehicles]);

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
    <div className={modalOverlay}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-xl border border-edge bg-surface shadow-overlay">
        <div className="flex items-start justify-between gap-4 border-b border-edge px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-fg">
              {isEdit ? "Edit Expense" : "Add Expense"}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              {isEdit
                ? "Correct pending non-fuel expense details."
                : "Record non-fuel vehicle expenses for operating cost tracking."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-fg-muted hover:bg-surface-2 hover:text-fg"
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
              <span className="text-sm font-medium text-fg">
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
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              >
                <option value="vehicle">Vehicle Expense</option>
                <option value="general">General Expense</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
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
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </label>

            {form.expenseScope === "vehicle" ? (
              <label className="space-y-1.5">
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
            ) : null}

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
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
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              >
                {expenseTypes.map((expenseType) => (
                  <option key={expenseType} value={expenseType}>
                    {expenseType}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
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
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="2500"
              />
            </label>

            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-fg">
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
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="Optional details"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
                Vendor
              </span>
              <input
                value={form.vendor}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, vendor: event.target.value }))
                }
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="Vendor name"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
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
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="Invoice number"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
                City
              </span>
              <input
                value={form.city}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, city: event.target.value }))
                }
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="City"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
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
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="Cash, UPI, bank transfer"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
                Company
              </span>
              <input
                value={form.company}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, company: event.target.value }))
                }
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="Company"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
                Status
              </span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value }))
                }
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              >
                <option value="pending">Pending</option>
              </select>
            </label>
          </div>

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
              disabled={loading}
              className="min-h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

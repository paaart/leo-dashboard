import { Pencil, Plus, Trash2 } from "lucide-react";
import { FuelEmptyState } from "./FuelEmptyState";
import { SERIAL_COLUMN_CLASS, serialNumber } from "./SerialNumber";
import type { Vehicle, VehicleExpense } from "@/lib/fuel-tracker/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatStatus(status: VehicleExpense["status"]) {
  return status === "paid" ? "Paid" : "Pending";
}

function statusClass(status: VehicleExpense["status"]) {
  if (status === "paid") {
    return "border-success/25 bg-success-soft text-success-soft-fg";
  }

  return "border-warning/25 bg-warning-soft text-warning-soft-fg";
}

export function VehicleExpenseTable({
  expenses,
  vehiclesById,
  loading,
  error,
  onAdd,
  onEdit,
  onDelete,
}: {
  expenses: VehicleExpense[];
  vehiclesById: Map<string, Vehicle>;
  loading: boolean;
  error: string | null;
  onAdd: () => void;
  onEdit: (expense: VehicleExpense) => void;
  onDelete: (expense: VehicleExpense) => void;
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

  if (expenses.length === 0) {
    return (
      <FuelEmptyState
        title="No other expenses found"
        description="Add an expense to track vehicle operating costs beyond fuel."
        action={
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-330 w-full text-left text-sm">
          <thead className="border-b border-edge bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
            <tr>
              <th className={SERIAL_COLUMN_CLASS}>S.No</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Vehicle Number</th>
              <th className="px-4 py-3 font-semibold">Expense Type</th>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Vendor</th>
              <th className="px-4 py-3 font-semibold">Invoice</th>
              <th className="px-4 py-3 font-semibold">City</th>
              <th className="px-4 py-3 font-semibold">Mode Of Payment</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {expenses.map((expense, index) => {
              const vehicle = expense.vehicle_id
                ? vehiclesById.get(expense.vehicle_id)
                : null;

              return (
                <tr
                  key={expense.id}
                  className="text-fg-muted hover:bg-surface-2/60"
                >
                  <td className={SERIAL_COLUMN_CLASS}>
                    {serialNumber(index)}
                  </td>
                  <td className="px-4 py-3">{expense.expense_date}</td>
                  <td className="px-4 py-3 font-semibold text-fg">
                    {expense.vehicle_id
                      ? vehicle?.vehicle_no ?? "Unknown vehicle"
                      : "General"}
                  </td>
                  <td className="px-4 py-3">{expense.expense_type}</td>
                  <td className="px-4 py-3">{expense.description ?? "-"}</td>
                  <td className="px-4 py-3">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-4 py-3">{expense.vendor ?? "-"}</td>
                  <td className="px-4 py-3">
                    {expense.invoice_reference ?? "-"}
                  </td>
                  <td className="px-4 py-3">{expense.city ?? "-"}</td>
                  <td className="px-4 py-3">{expense.payment_mode ?? "-"}</td>
                  <td className="px-4 py-3">{expense.company ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass(
                        expense.status
                      )}`}
                    >
                      {formatStatus(expense.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {expense.status === "pending" ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(expense)}
                          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-edge px-3 text-sm font-medium text-fg hover:bg-surface-2"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(expense)}
                          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-danger/25 px-3 text-sm font-medium text-danger-soft-fg hover:bg-danger-soft"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-fg-muted">
                        -
                      </span>
                    )}
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

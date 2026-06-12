import { Plus } from "lucide-react";
import { FuelEmptyState } from "./FuelEmptyState";
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
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
}

export function VehicleExpenseTable({
  expenses,
  vehiclesById,
  loading,
  error,
  onAdd,
}: {
  expenses: VehicleExpense[];
  vehiclesById: Map<string, Vehicle>;
  loading: boolean;
  error: string | null;
  onAdd: () => void;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
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

  if (expenses.length === 0) {
    return (
      <FuelEmptyState
        title="No other expenses found"
        description="Add an expense to track vehicle operating costs beyond fuel."
        action={
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="overflow-x-auto">
        <table className="min-w-[1320px] w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <tr>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {expenses.map((expense) => {
              const vehicle = expense.vehicle_id
                ? vehiclesById.get(expense.vehicle_id)
                : null;

              return (
                <tr
                  key={expense.id}
                  className="text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/70"
                >
                  <td className="px-4 py-3">{expense.expense_date}</td>
                  <td className="px-4 py-3 font-semibold text-gray-950 dark:text-gray-50">
                    {expense.vehicle_id
                      ? vehicle?.vehicle_no ?? "Unknown vehicle"
                      : "General"}
                  </td>
                  <td className="px-4 py-3">{expense.expense_type}</td>
                  <td className="px-4 py-3">{expense.description ?? "-"}</td>
                  <td className="px-4 py-3">{formatCurrency(expense.amount)}</td>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

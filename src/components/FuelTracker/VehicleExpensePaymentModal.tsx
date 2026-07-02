import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SERIAL_COLUMN_CLASS, serialNumber } from "./SerialNumber";
import type { FormEvent } from "react";
import type {
  CreateVehicleExpensePaymentPayload,
  Vehicle,
  VehicleExpense,
} from "@/lib/fuel-tracker/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function VehicleExpensePaymentModal({
  open,
  pendingExpenses,
  vehiclesById,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pendingExpenses: VehicleExpense[];
  vehiclesById: Map<string, Vehicle>;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateVehicleExpensePaymentPayload) => Promise<void>;
}) {
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentMode, setPaymentMode] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMode("");
      setReferenceNumber("");
      setRemarks("");
      setSelectedIds([]);
      setError(null);
    }
  }, [open]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedTotal = useMemo(
    () =>
      pendingExpenses.reduce(
        (sum, expense) =>
          selectedIdSet.has(expense.id) ? sum + expense.amount : sum,
        0
      ),
    [pendingExpenses, selectedIdSet]
  );

  if (!open) return null;

  const toggleExpense = (expenseId: string) => {
    setSelectedIds((prev) =>
      prev.includes(expenseId)
        ? prev.filter((id) => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (selectedIds.length === 0) {
      setError("Select at least one pending expense.");
      return;
    }

    if (!paymentDate) {
      setError("Payment date is required.");
      return;
    }

    if (selectedTotal <= 0) {
      setError("Selected expenses total must be greater than zero.");
      return;
    }

    await onSubmit({
      paymentDate,
      paymentMode: paymentMode.trim() || null,
      referenceNumber: referenceNumber.trim() || null,
      remarks: remarks.trim() || null,
      expenseIds: selectedIds,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
              Create Payment
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select pending expenses and mark them paid under one payment.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            aria-label="Close create payment dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(92vh-80px)] space-y-4 overflow-y-auto px-5 py-5"
        >
          <div className="grid gap-4 md:grid-cols-4">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Payment Date
              </span>
              <input
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Payment Mode
              </span>
              <input
                value={paymentMode}
                onChange={(event) => setPaymentMode(event.target.value)}
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="Cash, UPI, bank transfer"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Reference Number
              </span>
              <input
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="Optional"
              />
            </label>

            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Total
              </div>
              <div className="mt-1 text-lg font-semibold text-gray-950 dark:text-gray-50">
                {formatCurrency(selectedTotal)}
              </div>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Remarks
            </span>
            <textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
              placeholder="Optional notes"
            />
          </label>

          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="max-h-80 overflow-auto">
              <table className="min-w-245 w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                  <tr>
                    <th className={SERIAL_COLUMN_CLASS}>S.No</th>
                    <th className="w-12 px-4 py-3 font-semibold">Select</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Vehicle</th>
                    <th className="px-4 py-3 font-semibold">Expense Type</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Vendor</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {pendingExpenses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No pending expenses available.
                      </td>
                    </tr>
                  ) : (
                    pendingExpenses.map((expense, index) => {
                      const vehicle = expense.vehicle_id
                        ? vehiclesById.get(expense.vehicle_id)
                        : null;
                      const selected = selectedIdSet.has(expense.id);

                      return (
                        <tr
                          key={expense.id}
                          className="text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/70"
                        >
                          <td className={SERIAL_COLUMN_CLASS}>
                            {serialNumber(index)}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleExpense(expense.id)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              aria-label={`Select expense ${expense.id}`}
                            />
                          </td>
                          <td className="px-4 py-3">{expense.expense_date}</td>
                          <td className="px-4 py-3 font-semibold text-gray-950 dark:text-gray-50">
                            {expense.vehicle_id
                              ? vehicle?.vehicle_no ?? "Unknown vehicle"
                              : "General"}
                          </td>
                          <td className="px-4 py-3">{expense.expense_type}</td>
                          <td className="px-4 py-3">
                            {expense.description ?? "-"}
                          </td>
                          <td className="px-4 py-3">{expense.vendor ?? "-"}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatCurrency(expense.amount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-end">
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
              disabled={loading || pendingExpenses.length === 0}
              className="min-h-10 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { modalOverlay } from "@/components/shared/ui";
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
    <div className={modalOverlay}>
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-xl border border-edge bg-surface shadow-overlay">
        <div className="flex items-start justify-between gap-4 border-b border-edge px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-fg">
              Create Payment
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              Select pending expenses and mark them paid under one payment.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-fg-muted hover:bg-surface-2 hover:text-fg"
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
              <span className="text-sm font-medium text-fg">
                Payment Date
              </span>
              <input
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
                Payment Mode
              </span>
              <input
                value={paymentMode}
                onChange={(event) => setPaymentMode(event.target.value)}
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="Cash, UPI, bank transfer"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-fg">
                Reference Number
              </span>
              <input
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="Optional"
              />
            </label>

            <div className="rounded-md border border-edge bg-surface-2 px-3 py-2">
              <div className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                Total
              </div>
              <div className="mt-1 text-lg font-semibold text-fg">
                {formatCurrency(selectedTotal)}
              </div>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg">
              Remarks
            </span>
            <textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              rows={2}
              className="w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              placeholder="Optional notes"
            />
          </label>

          <div className="overflow-hidden rounded-lg border border-edge">
            <div className="max-h-80 overflow-auto">
              <table className="min-w-245 w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-edge bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
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
                <tbody className="divide-y divide-edge">
                  {pendingExpenses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-sm text-fg-muted"
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
                          className="text-fg-muted hover:bg-surface-2/60"
                        >
                          <td className={SERIAL_COLUMN_CLASS}>
                            {serialNumber(index)}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleExpense(expense.id)}
                              className="h-4 w-4 rounded border-edge text-accent focus:ring-accent"
                              aria-label={`Select expense ${expense.id}`}
                            />
                          </td>
                          <td className="px-4 py-3">{expense.expense_date}</td>
                          <td className="px-4 py-3 font-semibold text-fg">
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
            <div className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger-soft-fg">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-edge pt-4 sm:flex-row sm:items-center sm:justify-end">
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
              disabled={loading || pendingExpenses.length === 0}
              className="min-h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

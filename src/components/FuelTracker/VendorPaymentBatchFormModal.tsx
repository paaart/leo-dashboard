import { Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  CreateVehicleExpensePaymentBatchPayload,
  VehicleExpenseInvoice,
} from "@/lib/fuel-tracker/types";

type AllocationForm = {
  invoiceId: string;
  invoiceSearch: string;
  allocatedAmount: string;
  outstandingAmount: number | null;
};

const initialAllocation: AllocationForm = {
  invoiceId: "",
  invoiceSearch: "",
  allocatedAmount: "",
  outstandingAmount: null,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function moneyCents(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return NaN;
  return Math.round((amount + Number.EPSILON) * 100);
}

function centsToNumber(cents: number) {
  return cents / 100;
}

function invoiceLabel(invoice: VehicleExpenseInvoice) {
  return `${invoice.invoice_number ?? invoice.invoice_date} - ${
    invoice.vendor_name
  } - ${formatCurrency(invoice.balance_amount)} due`;
}

export function VendorPaymentBatchFormModal({
  open,
  invoices,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  invoices: VehicleExpenseInvoice[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateVehicleExpensePaymentBatchPayload) => Promise<void>;
}) {
  const [form, setForm] = useState({
    vendorName: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: "",
    referenceNumber: "",
    remarks: "",
    allocations: [initialAllocation] as AllocationForm[],
  });
  const [error, setError] = useState<string | null>(null);

  const payableInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.balance_amount > 0),
    [invoices]
  );
  const invoicesById = useMemo(
    () => new Map(invoices.map((invoice) => [invoice.id, invoice])),
    [invoices]
  );
  const runningTotal = useMemo(() => {
    const cents = form.allocations.reduce((sum, allocation) => {
      if (!allocation.invoiceId) return sum;

      const amountCents = moneyCents(allocation.allocatedAmount);
      return Number.isFinite(amountCents) && amountCents > 0
        ? sum + amountCents
        : sum;
    }, 0);
    return centsToNumber(cents);
  }, [form.allocations]);

  if (!open) return null;

  const updateAllocation = (
    index: number,
    updates: Partial<AllocationForm>
  ) => {
    setForm((prev) => ({
      ...prev,
      allocations: prev.allocations.map((allocation, allocationIndex) =>
        allocationIndex === index
          ? { ...allocation, ...updates }
          : allocation
      ),
    }));
  };

  const addAllocation = () => {
    setForm((prev) => ({
      ...prev,
      allocations: [...prev.allocations, { ...initialAllocation }],
    }));
  };

  const removeAllocation = (index: number) => {
    setForm((prev) => ({
      ...prev,
      allocations: prev.allocations.filter((_, allocationIndex) => {
        return allocationIndex !== index;
      }),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.vendorName.trim()) {
      setError("Vendor name is required.");
      return;
    }

    if (!form.paymentDate) {
      setError("Payment date is required.");
      return;
    }

    if (form.allocations.length === 0) {
      setError("Add at least one invoice allocation.");
      return;
    }

    const seenInvoiceIds = new Set<string>();
    const allocations = [];

    for (const [index, allocation] of form.allocations.entries()) {
      const amountCents = moneyCents(allocation.allocatedAmount);
      const invoice = invoicesById.get(allocation.invoiceId);
      const hasInvoice = Boolean(allocation.invoiceId);
      const hasAmount = Number.isFinite(amountCents) && amountCents > 0;

      if (!hasInvoice && !hasAmount) {
        continue;
      }

      if (!hasInvoice && hasAmount) {
        setError("Select an invoice for every allocated amount.");
        return;
      }

      if (seenInvoiceIds.has(allocation.invoiceId)) {
        setError(
          "This invoice is already included in this payment batch. If you want to split the payment across different dates, create another payment batch later."
        );
        return;
      }

      if (!invoice) {
        setError(`Allocation ${index + 1} has an invalid invoice selected.`);
        return;
      }

      if (!hasAmount) {
        setError(`Allocation ${index + 1} must be greater than zero.`);
        return;
      }

      const outstanding = allocation.outstandingAmount ?? invoice.balance_amount;
      const outstandingCents = moneyCents(outstanding);

      if (amountCents > outstandingCents) {
        setError(
          `Allocation ${index + 1} for ${
            invoice.invoice_number ?? invoice.id
          } cannot exceed the invoice outstanding balance.`
        );
        return;
      }

      seenInvoiceIds.add(allocation.invoiceId);
      allocations.push({
        invoiceId: allocation.invoiceId,
        allocatedAmount: centsToNumber(amountCents),
      });
    }

    if (allocations.length === 0) {
      setError("Add at least one complete invoice allocation.");
      return;
    }

    await onSubmit({
      vendorName: form.vendorName.trim(),
      paymentDate: form.paymentDate,
      paymentMode: form.paymentMode.trim() || null,
      referenceNumber: form.referenceNumber.trim() || null,
      remarks: form.remarks.trim() || null,
      allocations,
    });

    setForm({
      vendorName: "",
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: "",
      referenceNumber: "",
      remarks: "",
      allocations: [{ ...initialAllocation }],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
              Create Payment Batch
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Allocate one vendor payment across one or more outstanding invoices.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            aria-label="Close payment batch dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(92vh-80px)] space-y-5 overflow-y-auto px-5 py-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Vendor
              </span>
              <input
                value={form.vendorName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    vendorName: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="Vendor name"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Payment Date
              </span>
              <input
                type="date"
                value={form.paymentDate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    paymentDate: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Payment Mode
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
                Reference Number
              </span>
              <input
                value={form.referenceNumber}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    referenceNumber: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="Optional"
              />
            </label>

            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Remarks
              </span>
              <textarea
                value={form.remarks}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, remarks: event.target.value }))
                }
                rows={3}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="Optional remarks"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Invoice Allocations
              </h3>
              <button
                type="button"
                onClick={addAllocation}
                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <Plus className="h-4 w-4" />
                Add Allocation
              </button>
            </div>

            {form.allocations.map((allocation, index) => {
              return (
                <div
                  key={index}
                  className="grid gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800 md:grid-cols-[1fr_180px_auto]"
                >
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Invoice
                    </span>
                    <input
                      value={allocation.invoiceSearch}
                      onChange={(event) =>
                        updateAllocation(index, {
                          invoiceSearch: event.target.value,
                        })
                      }
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                      placeholder="Search invoices"
                    />
                    <select
                      value={allocation.invoiceId}
                      onChange={(event) => {
                        const nextInvoice = invoicesById.get(event.target.value);
                        updateAllocation(index, {
                          invoiceId: event.target.value,
                          invoiceSearch: nextInvoice
                            ? nextInvoice.invoice_number ??
                              nextInvoice.vendor_name
                            : "",
                          outstandingAmount: nextInvoice
                            ? nextInvoice.balance_amount
                            : null,
                          allocatedAmount: "",
                        });
                      }}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                    >
                      <option value="">Select invoice</option>
                      {payableInvoices
                        .filter((payableInvoice) => {
                          const query = allocation.invoiceSearch
                            .trim()
                            .toLowerCase();
                          const label = invoiceLabel(payableInvoice).toLowerCase();
                          return !query || label.includes(query);
                        })
                        .map((payableInvoice) => (
                          <option
                            key={payableInvoice.id}
                            value={payableInvoice.id}
                          >
                            {invoiceLabel(payableInvoice)}
                          </option>
                        ))}
                    </select>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      Outstanding:{" "}
                      {allocation.outstandingAmount !== null
                        ? formatCurrency(allocation.outstandingAmount)
                        : "-"}
                    </span>
                  </div>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Allocated Amount
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={allocation.allocatedAmount}
                      onChange={(event) =>
                        updateAllocation(index, {
                          allocatedAmount: event.target.value,
                        })
                      }
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                      placeholder="Amount"
                    />
                  </label>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeAllocation(index)}
                      disabled={form.allocations.length === 1}
                      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end">
              <div className="rounded-md border border-gray-200 px-4 py-3 text-right dark:border-gray-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Batch Total
                </p>
                <p className="mt-1 text-xl font-semibold text-gray-950 dark:text-gray-50">
                  {formatCurrency(runningTotal)}
                </p>
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
              {loading ? "Saving..." : "Create Payment Batch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

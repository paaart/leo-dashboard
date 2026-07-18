import { Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SERIAL_COLUMN_CLASS, serialNumber } from "./SerialNumber";
import type { FormEvent } from "react";
import type {
  CreateVehicleExpenseInvoicePaymentPayload,
  VehicleExpenseInvoice,
  VehicleExpenseInvoicePayment,
} from "@/lib/fuel-tracker/types";

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

function formatStatus(status: VehicleExpenseInvoice["status"]) {
  if (status === "partially_paid") return "Partially Paid";
  return status === "paid" ? "Paid" : "Unpaid";
}

function statusClass(status: VehicleExpenseInvoice["status"]) {
  if (status === "paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (status === "partially_paid") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
}

export function VendorInvoiceViewModal({
  invoice,
  onClose,
  loading,
  onRecordPayment,
  onDeletePayment,
}: {
  invoice: VehicleExpenseInvoice | null;
  onClose: () => void;
  loading: boolean;
  onRecordPayment: (
    invoice: VehicleExpenseInvoice,
    payload: CreateVehicleExpenseInvoicePaymentPayload
  ) => Promise<void>;
  onDeletePayment: (
    invoice: VehicleExpenseInvoice,
    payment: VehicleExpenseInvoicePayment
  ) => Promise<void>;
}) {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: "",
    paymentMode: "",
    referenceNumber: "",
    remarks: "",
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const sortedPayments = useMemo(() => {
    if (!invoice) return [];
    return [...invoice.payments].sort((a, b) => {
      if (a.payment_date !== b.payment_date) {
        return b.payment_date.localeCompare(a.payment_date);
      }

      return b.created_at.localeCompare(a.created_at);
    });
  }, [invoice]);

  if (!invoice) return null;

  const handleSubmitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaymentError(null);

    const amountCents = moneyCents(paymentForm.amount);
    const balanceCents = moneyCents(invoice.balance_amount);

    if (!paymentForm.paymentDate) {
      setPaymentError("Payment date is required.");
      return;
    }

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setPaymentError("Amount must be greater than zero.");
      return;
    }

    if (amountCents > balanceCents) {
      setPaymentError("Amount cannot exceed outstanding balance.");
      return;
    }

    await onRecordPayment(invoice, {
      paymentDate: paymentForm.paymentDate,
      amount: centsToNumber(amountCents),
      paymentMode: paymentForm.paymentMode.trim() || null,
      referenceNumber: paymentForm.referenceNumber.trim() || null,
      remarks: paymentForm.remarks.trim() || null,
    });

    setPaymentModalOpen(false);
    setPaymentForm({
      paymentDate: new Date().toISOString().slice(0, 10),
      amount: "",
      paymentMode: "",
      referenceNumber: "",
      remarks: "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
              Vendor Invoice Details
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {invoice.vendor_name} - {invoice.invoice_number ?? "No invoice number"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            aria-label="Close invoice details dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-80px)] space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Vendor
              </p>
              <p className="mt-1 font-semibold text-gray-950 dark:text-gray-50">
                {invoice.vendor_name}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Invoice Number
              </p>
              <p className="mt-1 text-gray-700 dark:text-gray-200">
                {invoice.invoice_number ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Invoice Date
              </p>
              <p className="mt-1 text-gray-700 dark:text-gray-200">
                {invoice.invoice_date}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Due Date
              </p>
              <p className="mt-1 text-gray-700 dark:text-gray-200">
                {invoice.due_date ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Status
              </p>
              <span
                className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass(
                  invoice.status
                )}`}
              >
                {formatStatus(invoice.status)}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Total Amount
              </p>
              <p className="mt-1 font-semibold text-gray-950 dark:text-gray-50">
                {formatCurrency(invoice.total_amount)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Total Paid
              </p>
              <p className="mt-1 text-gray-700 dark:text-gray-200">
                {formatCurrency(invoice.paid_amount)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Balance
              </p>
              <p className="mt-1 text-gray-700 dark:text-gray-200">
                {formatCurrency(invoice.balance_amount)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Remarks
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
              {invoice.remarks ?? "-"}
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">
                Line Items
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-230 w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                  <tr>
                    <th className={SERIAL_COLUMN_CLASS}>S.No</th>
                    <th className="px-4 py-3 font-semibold">Scope</th>
                    <th className="px-4 py-3 font-semibold">Vehicles</th>
                    <th className="px-4 py-3 font-semibold">Expense Type</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {invoice.items.map((item, index) => (
                    <tr
                      key={item.id}
                      className="text-gray-700 dark:text-gray-200"
                    >
                      <td className={SERIAL_COLUMN_CLASS}>
                        {serialNumber(index)}
                      </td>
                      <td className="px-4 py-3">
                        {item.vehicles.length > 0 || item.vehicle_id
                          ? "Vehicle"
                          : "General"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-950 dark:text-gray-50">
                        {item.vehicles.length > 0
                          ? item.vehicles
                              .map((vehicle) => vehicle.vehicle_no)
                              .join(", ")
                          : item.vehicle_id
                          ? item.vehicle_no ?? "Unknown vehicle"
                          : "General"}
                      </td>
                      <td className="px-4 py-3">{item.expense_type}</td>
                      <td className="px-4 py-3">{item.description ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">
                  Payments
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Payment history for this vendor invoice.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPaymentError(null);
                  setPaymentForm((prev) => ({
                    ...prev,
                    amount:
                      invoice.balance_amount > 0
                        ? String(invoice.balance_amount)
                        : "",
                  }));
                  setPaymentModalOpen(true);
                }}
                disabled={invoice.balance_amount <= 0 || loading}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Record Payment
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Invoice Total
                </p>
                <p className="mt-1 text-gray-700 dark:text-gray-200">
                  {formatCurrency(invoice.total_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Total Paid
                </p>
                <p className="mt-1 text-gray-700 dark:text-gray-200">
                  {formatCurrency(invoice.paid_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Outstanding Balance
                </p>
                <p className="mt-1 text-gray-700 dark:text-gray-200">
                  {formatCurrency(invoice.balance_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Status
                </p>
                <span
                  className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass(
                    invoice.status
                  )}`}
                >
                  {formatStatus(invoice.status)}
                </span>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="overflow-x-auto">
                <table className="min-w-230 w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                    <tr>
                      <th className={SERIAL_COLUMN_CLASS}>S.No</th>
                      <th className="px-4 py-3 font-semibold">
                        Payment Batch
                      </th>
                      <th className="px-4 py-3 font-semibold">Payment Date</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Allocation Amount
                      </th>
                      <th className="px-4 py-3 font-semibold">Mode</th>
                      <th className="px-4 py-3 font-semibold">
                        Reference Number
                      </th>
                      <th className="px-4 py-3 font-semibold">Remarks</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {sortedPayments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                          No payments recorded.
                        </td>
                      </tr>
                    ) : (
                      sortedPayments.map((payment, index) => (
                        <tr
                          key={payment.id}
                          className="text-gray-700 dark:text-gray-200"
                        >
                          <td className={SERIAL_COLUMN_CLASS}>
                            {serialNumber(index)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {payment.payment_batch_id.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3">
                            {payment.payment_date}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-4 py-3">
                            {payment.payment_mode ?? "-"}
                          </td>
                          <td className="px-4 py-3">
                            {payment.reference_number ?? "-"}
                          </td>
                          <td className="px-4 py-3">
                            {payment.remarks ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => onDeletePayment(invoice, payment)}
                              disabled={loading}
                              className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete Batch
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {paymentModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
                  Record Payment
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Outstanding balance: {formatCurrency(invoice.balance_amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                aria-label="Close payment dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Payment Date
                  </span>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        paymentDate: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Amount
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        amount: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                    placeholder="2500"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Payment Mode
                  </span>
                  <input
                    value={paymentForm.paymentMode}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({
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
                    value={paymentForm.referenceNumber}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({
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
                    value={paymentForm.remarks}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        remarks: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                    placeholder="Optional remarks"
                  />
                </label>
              </div>

              {paymentError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  {paymentError}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
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
                  {loading ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { modalOverlay } from "@/components/shared/ui";
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
    return "border-success/25 bg-success-soft text-success-soft-fg";
  }

  if (status === "partially_paid") {
    return "border-accent/25 bg-accent-soft text-accent-soft-fg";
  }

  return "border-warning/25 bg-warning-soft text-warning-soft-fg";
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
    <div className={modalOverlay}>
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-xl border border-edge bg-surface shadow-overlay">
        <div className="flex items-start justify-between gap-4 border-b border-edge px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-fg">
              Vendor Invoice Details
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              {invoice.vendor_name} - {invoice.invoice_number ?? "No invoice number"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-fg-muted hover:bg-surface-2 hover:text-fg"
            aria-label="Close invoice details dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-80px)] space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Vendor
              </p>
              <p className="mt-1 font-semibold text-fg">
                {invoice.vendor_name}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Invoice Number
              </p>
              <p className="mt-1 text-fg-muted">
                {invoice.invoice_number ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Invoice Date
              </p>
              <p className="mt-1 text-fg-muted">
                {invoice.invoice_date}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Due Date
              </p>
              <p className="mt-1 text-fg-muted">
                {invoice.due_date ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
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
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Total Amount
              </p>
              <p className="mt-1 font-semibold text-fg">
                {formatCurrency(invoice.total_amount)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Total Paid
              </p>
              <p className="mt-1 text-fg-muted">
                {formatCurrency(invoice.paid_amount)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Balance
              </p>
              <p className="mt-1 text-fg-muted">
                {formatCurrency(invoice.balance_amount)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
              Remarks
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              {invoice.remarks ?? "-"}
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-edge">
            <div className="border-b border-edge bg-surface-2 px-4 py-3">
              <h3 className="text-sm font-semibold text-fg">
                Line Items
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-230 w-full text-left text-sm">
                <thead className="border-b border-edge bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
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
                <tbody className="divide-y divide-edge">
                  {invoice.items.map((item, index) => (
                    <tr
                      key={item.id}
                      className="text-fg-muted"
                    >
                      <td className={SERIAL_COLUMN_CLASS}>
                        {serialNumber(index)}
                      </td>
                      <td className="px-4 py-3">
                        {item.vehicles.length > 0 || item.vehicle_id
                          ? "Vehicle"
                          : "General"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-fg">
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

          <div className="rounded-lg border border-edge p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-fg">
                  Payments
                </h3>
                <p className="mt-1 text-sm text-fg-muted">
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
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Record Payment
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  Invoice Total
                </p>
                <p className="mt-1 text-fg-muted">
                  {formatCurrency(invoice.total_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  Total Paid
                </p>
                <p className="mt-1 text-fg-muted">
                  {formatCurrency(invoice.paid_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  Outstanding Balance
                </p>
                <p className="mt-1 text-fg-muted">
                  {formatCurrency(invoice.balance_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
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

            <div className="mt-4 overflow-hidden rounded-lg border border-edge">
              <div className="overflow-x-auto">
                <table className="min-w-230 w-full text-left text-sm">
                  <thead className="border-b border-edge bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
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
                  <tbody className="divide-y divide-edge">
                    {sortedPayments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-6 text-center text-sm text-fg-muted"
                        >
                          No payments recorded.
                        </td>
                      </tr>
                    ) : (
                      sortedPayments.map((payment, index) => (
                        <tr
                          key={payment.id}
                          className="text-fg-muted"
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
                              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-danger/25 px-3 text-sm font-medium text-danger-soft-fg hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-edge bg-surface shadow-overlay">
            <div className="flex items-start justify-between gap-4 border-b border-edge px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-fg">
                  Record Payment
                </h3>
                <p className="mt-1 text-sm text-fg-muted">
                  Outstanding balance: {formatCurrency(invoice.balance_amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="rounded-md p-2 text-fg-muted hover:bg-surface-2 hover:text-fg"
                aria-label="Close payment dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitPayment}
              className="max-h-[calc(90vh-80px)] space-y-4 overflow-y-auto p-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-fg">
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
                    className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-fg">
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
                    className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                    placeholder="2500"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-fg">
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
                    className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                    placeholder="Cash, UPI, bank transfer"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-fg">
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
                    className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                    placeholder="Optional"
                  />
                </label>

                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-sm font-medium text-fg">
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
                    className="w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                    placeholder="Optional remarks"
                  />
                </label>
              </div>

              {paymentError ? (
                <div className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger-soft-fg">
                  {paymentError}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-edge pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
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

import { modalOverlay } from "@/components/shared/ui";
import { Eye, Plus } from "lucide-react";
import { useState } from "react";
import { FuelEmptyState } from "./FuelEmptyState";
import { SERIAL_COLUMN_CLASS, serialNumber } from "./SerialNumber";
import type { VehicleExpensePayment } from "@/lib/fuel-tracker/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function PaymentDetailsModal({
  payment,
  onClose,
}: {
  payment: VehicleExpensePayment;
  onClose: () => void;
}) {
  return (
    <div className={modalOverlay}>
      <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-xl border border-edge bg-surface shadow-overlay">
        <div className="flex items-start justify-between gap-4 border-b border-edge px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-fg">
              Payment Details
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              {payment.reference_number ?? "No reference"} -{" "}
              {formatCurrency(payment.total_amount)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-edge px-3 py-2 text-sm font-medium text-fg hover:bg-surface-2"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(88vh-80px)] overflow-auto p-5">
          <table className="min-w-230 w-full text-left text-sm">
            <thead className="border-b border-edge bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
              <tr>
                <th className={SERIAL_COLUMN_CLASS}>S.No</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Vehicle</th>
                <th className="px-4 py-3 font-semibold">Expense Type</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Vendor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {payment.items.map((item, index) => (
                <tr key={item.id} className="text-fg-muted">
                  <td className={SERIAL_COLUMN_CLASS}>
                    {serialNumber(index)}
                  </td>
                  <td className="px-4 py-3">{item.expense_date}</td>
                  <td className="px-4 py-3 font-semibold text-fg">
                    {item.vehicle_id
                      ? item.vehicle_no ?? "Unknown vehicle"
                      : "General"}
                  </td>
                  <td className="px-4 py-3">{item.expense_type}</td>
                  <td className="px-4 py-3">{item.description ?? "-"}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-4 py-3">{item.vendor ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function VehicleExpensePaymentTable({
  payments,
  loading,
  error,
  onCreate,
}: {
  payments: VehicleExpensePayment[];
  loading: boolean;
  error: string | null;
  onCreate: () => void;
}) {
  const [selectedPayment, setSelectedPayment] =
    useState<VehicleExpensePayment | null>(null);

  if (loading) {
    return (
      <div className="rounded-xl border border-edge bg-surface p-4 shadow-card">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
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

  if (payments.length === 0) {
    return (
      <FuelEmptyState
        title="No paid expense payments found"
        description="Create a payment to mark pending expenses as paid."
        action={
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            Create Payment
          </button>
        }
      />
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-270 w-full text-left text-sm">
            <thead className="border-b border-edge bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
              <tr>
                <th className={SERIAL_COLUMN_CLASS}>S.No</th>
                <th className="px-4 py-3 font-semibold">Payment Date</th>
                <th className="px-4 py-3 font-semibold">Reference Number</th>
                <th className="px-4 py-3 font-semibold">Payment Mode</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Expense Count
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Total Amount
                </th>
                <th className="px-4 py-3 font-semibold">Remarks</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {payments.map((payment, index) => (
                <tr
                  key={payment.id}
                  className="text-fg-muted hover:bg-surface-2/60"
                >
                  <td className={SERIAL_COLUMN_CLASS}>
                    {serialNumber(index)}
                  </td>
                  <td className="px-4 py-3">{payment.payment_date}</td>
                  <td className="px-4 py-3 font-semibold text-fg">
                    {payment.reference_number ?? "-"}
                  </td>
                  <td className="px-4 py-3">{payment.payment_mode ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    {payment.expense_count}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCurrency(payment.total_amount)}
                  </td>
                  <td className="px-4 py-3">{payment.remarks ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedPayment(payment)}
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-edge px-3 text-sm font-medium text-fg hover:bg-surface-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPayment ? (
        <PaymentDetailsModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      ) : null}
    </>
  );
}

import { Eye, Plus } from "lucide-react";
import { useState } from "react";
import { FuelEmptyState } from "./FuelEmptyState";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
              Payment Details
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {payment.reference_number ?? "No reference"} -{" "}
              {formatCurrency(payment.total_amount)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>

        <div className="overflow-auto p-5">
          <table className="min-w-230 w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Vehicle</th>
                <th className="px-4 py-3 font-semibold">Expense Type</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Vendor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {payment.items.map((item) => (
                <tr key={item.id} className="text-gray-700 dark:text-gray-200">
                  <td className="px-4 py-3">{item.expense_date}</td>
                  <td className="px-4 py-3 font-semibold text-gray-950 dark:text-gray-50">
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
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
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

  if (payments.length === 0) {
    return (
      <FuelEmptyState
        title="No paid expense payments found"
        description="Create a payment to mark pending expenses as paid."
        action={
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
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
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="overflow-x-auto">
          <table className="min-w-270 w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              <tr>
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
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/70"
                >
                  <td className="px-4 py-3">{payment.payment_date}</td>
                  <td className="px-4 py-3 font-semibold text-gray-950 dark:text-gray-50">
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
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
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

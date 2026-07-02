import { X } from "lucide-react";
import { SERIAL_COLUMN_CLASS, serialNumber } from "./SerialNumber";
import type { VehicleExpensePaymentBatch } from "@/lib/fuel-tracker/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function statusLabel(status: string) {
  if (status === "partially_paid") return "Partially Paid";
  if (status === "paid") return "Paid";
  return "Unpaid";
}

export function VendorPaymentBatchViewModal({
  batch,
  onClose,
}: {
  batch: VehicleExpensePaymentBatch | null;
  onClose: () => void;
}) {
  if (!batch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
              Vendor Payment Details
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {batch.vendor_name} - {formatCurrency(batch.total_amount)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            aria-label="Close payment batch details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(88vh-80px)] space-y-5 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Payment Date
              </p>
              <p className="mt-1 text-gray-700 dark:text-gray-200">
                {batch.payment_date}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Vendor
              </p>
              <p className="mt-1 font-semibold text-gray-950 dark:text-gray-50">
                {batch.vendor_name}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Total Paid
              </p>
              <p className="mt-1 font-semibold text-gray-950 dark:text-gray-50">
                {formatCurrency(batch.total_amount)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Mode
              </p>
              <p className="mt-1 text-gray-700 dark:text-gray-200">
                {batch.payment_mode ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Reference
              </p>
              <p className="mt-1 text-gray-700 dark:text-gray-200">
                {batch.reference_number ?? "-"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Remarks
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
              {batch.remarks ?? "-"}
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">
                Invoice Allocations
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-280 w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                  <tr>
                    <th className={SERIAL_COLUMN_CLASS}>S.No</th>
                    <th className="px-4 py-3 font-semibold">Invoice</th>
                    <th className="px-4 py-3 font-semibold">Vendor</th>
                    <th className="px-4 py-3 font-semibold">Invoice Date</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Invoice Total
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Allocation
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Remaining Balance
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Status After Allocation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {batch.allocations.map((allocation, index) => (
                    <tr
                      key={allocation.id}
                      className="text-gray-700 dark:text-gray-200"
                    >
                      <td className={SERIAL_COLUMN_CLASS}>
                        {serialNumber(index)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-950 dark:text-gray-50">
                        {allocation.invoice_number ?? allocation.invoice_id}
                      </td>
                      <td className="px-4 py-3">
                        {allocation.invoice_vendor_name}
                      </td>
                      <td className="px-4 py-3">{allocation.invoice_date}</td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(allocation.invoice_total_amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(allocation.allocated_amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(allocation.invoice_balance_amount)}
                      </td>
                      <td className="px-4 py-3">
                        {statusLabel(allocation.invoice_status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

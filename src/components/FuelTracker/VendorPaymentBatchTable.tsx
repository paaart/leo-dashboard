import { Eye, Plus, Trash2 } from "lucide-react";
import { FuelEmptyState } from "./FuelEmptyState";
import { SERIAL_COLUMN_CLASS, serialNumber } from "./SerialNumber";
import type { VehicleExpensePaymentBatch } from "@/lib/fuel-tracker/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function VendorPaymentBatchTable({
  batches,
  loading,
  error,
  currentPage = 1,
  pageSize = 50,
  onAdd,
  onView,
  onDelete,
}: {
  batches: VehicleExpensePaymentBatch[];
  loading: boolean;
  error: string | null;
  currentPage?: number;
  pageSize?: number;
  onAdd: () => void;
  onView: (batch: VehicleExpensePaymentBatch) => void;
  onDelete: (batch: VehicleExpensePaymentBatch) => void;
}) {
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
        We could not load vendor payments. {error}
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <FuelEmptyState
        title="No vendor payments found"
        description="Create a vendor payment batch and allocate it across one or more invoices."
        action={
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Payment Batch
          </button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="overflow-x-auto">
        <table className="min-w-280 w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className={SERIAL_COLUMN_CLASS}>S.No</th>
              <th className="px-4 py-3 font-semibold">Payment Date</th>
              <th className="px-4 py-3 font-semibold">Vendor</th>
              <th className="px-4 py-3 text-right font-semibold">
                Total Paid
              </th>
              <th className="px-4 py-3 font-semibold">Mode</th>
              <th className="px-4 py-3 font-semibold">Reference</th>
              <th className="px-4 py-3 text-right font-semibold">
                Invoices Covered
              </th>
              <th className="px-4 py-3 font-semibold">Remarks</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {batches.map((batch, index) => (
              <tr
                key={batch.id}
                className="text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/70"
              >
                <td className={SERIAL_COLUMN_CLASS}>
                  {serialNumber(index, currentPage, pageSize)}
                </td>
                <td className="px-4 py-3">{batch.payment_date}</td>
                <td className="px-4 py-3 font-semibold text-gray-950 dark:text-gray-50">
                  {batch.vendor_name}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatCurrency(batch.total_amount)}
                </td>
                <td className="px-4 py-3">{batch.payment_mode ?? "-"}</td>
                <td className="px-4 py-3">{batch.reference_number ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  {batch.invoice_count}
                </td>
                <td className="max-w-72 truncate px-4 py-3">
                  {batch.remarks ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onView(batch)}
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(batch)}
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

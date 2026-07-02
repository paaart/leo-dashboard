import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { FuelEmptyState } from "./FuelEmptyState";
import { SERIAL_COLUMN_CLASS, serialNumber } from "./SerialNumber";
import type { VehicleExpenseInvoice } from "@/lib/fuel-tracker/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
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

function canChangeInvoice(invoice: VehicleExpenseInvoice) {
  return invoice.status === "unpaid" && invoice.payments.length === 0;
}

export function VendorInvoiceTable({
  invoices,
  loading,
  error,
  currentPage = 1,
  pageSize = 50,
  onAdd,
  onView,
  onEdit,
  onDelete,
}: {
  invoices: VehicleExpenseInvoice[];
  loading: boolean;
  error: string | null;
  currentPage?: number;
  pageSize?: number;
  onAdd: () => void;
  onView: (invoice: VehicleExpenseInvoice) => void;
  onEdit: (invoice: VehicleExpenseInvoice) => void;
  onDelete: (invoice: VehicleExpenseInvoice) => void;
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

  if (invoices.length === 0) {
    return (
      <FuelEmptyState
        title="No vendor invoices found"
        description="Create a vendor invoice to track non-fuel expenses by invoice and line item."
        action={
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Invoice
          </button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="overflow-x-auto">
        <table className="min-w-300 w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className={SERIAL_COLUMN_CLASS}>S.No</th>
              <th className="px-4 py-3 font-semibold">Vendor Name</th>
              <th className="px-4 py-3 font-semibold">Invoice Number</th>
              <th className="px-4 py-3 font-semibold">Invoice Date</th>
              <th className="px-4 py-3 font-semibold">Due Date</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 text-right font-semibold">Paid</th>
              <th className="px-4 py-3 text-right font-semibold">Balance</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Items</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {invoices.map((invoice, index) => {
              const editable = canChangeInvoice(invoice);

              return (
                <tr
                  key={invoice.id}
                  className="text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/70"
                >
                  <td className={SERIAL_COLUMN_CLASS}>
                    {serialNumber(index, currentPage, pageSize)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-950 dark:text-gray-50">
                    {invoice.vendor_name}
                  </td>
                  <td className="px-4 py-3">{invoice.invoice_number ?? "-"}</td>
                  <td className="px-4 py-3">{invoice.invoice_date}</td>
                  <td className="px-4 py-3">{invoice.due_date ?? "-"}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCurrency(invoice.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(invoice.paid_amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(invoice.balance_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass(
                        invoice.status
                      )}`}
                    >
                      {formatStatus(invoice.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {invoice.items.length}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onView(invoice)}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(invoice)}
                        disabled={!editable}
                        title={
                          editable
                            ? "Edit invoice"
                            : "Invoices with payments cannot be edited."
                        }
                        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(invoice)}
                        disabled={!editable}
                        title={
                          editable
                            ? "Delete invoice"
                            : "Invoices with payments cannot be deleted."
                        }
                        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
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

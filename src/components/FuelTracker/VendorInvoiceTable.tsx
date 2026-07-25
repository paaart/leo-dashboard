import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { FuelEmptyState } from "./FuelEmptyState";
import { FuelTooltip } from "./FuelTooltip";
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
    return "border-success/25 bg-success-soft text-success-soft-fg";
  }

  if (status === "partially_paid") {
    return "border-accent/25 bg-accent-soft text-accent-soft-fg";
  }

  return "border-warning/25 bg-warning-soft text-warning-soft-fg";
}

function canChangeInvoice(invoice: VehicleExpenseInvoice) {
  return invoice.status === "unpaid" && invoice.payments.length === 0;
}

function invoiceDetails(invoice: VehicleExpenseInvoice) {
  return [
    `Vendor: ${invoice.vendor_name}`,
    `Due Date: ${invoice.due_date ?? "-"}`,
    `Remarks: ${invoice.remarks ?? "-"}`,
    `Item Count: ${invoice.items.length}`,
  ].join("\n");
}

function invoiceAmountDetails(invoice: VehicleExpenseInvoice) {
  return [
    `Invoice Total: ${formatCurrency(invoice.total_amount)}`,
    `Paid: ${formatCurrency(invoice.paid_amount)}`,
    `Outstanding: ${formatCurrency(invoice.balance_amount)}`,
    `Status: ${formatStatus(invoice.status)}`,
  ].join("\n");
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
      <div className="rounded-xl border border-edge bg-surface p-4 shadow-card">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
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

  if (invoices.length === 0) {
    return (
      <FuelEmptyState
        title="No vendor invoices found"
        description="Create a vendor invoice to track non-fuel expenses by invoice and line item."
        action={
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            Add Invoice
          </button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-230 w-full text-left text-sm">
          <thead className="border-b border-edge bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
            <tr>
              <th className={SERIAL_COLUMN_CLASS}>S.No</th>
              <th className="px-4 py-3 font-semibold">Invoice Date</th>
              <th className="px-4 py-3 font-semibold">Vendor</th>
              <th className="px-4 py-3 font-semibold">Invoice Number</th>
              <th className="px-4 py-3 text-right font-semibold">
                Invoice Total
              </th>
              <th className="px-4 py-3 text-right font-semibold">Paid</th>
              <th className="px-4 py-3 text-right font-semibold">
                Outstanding
              </th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {invoices.map((invoice, index) => {
              const editable = canChangeInvoice(invoice);

              return (
                <tr
                  key={invoice.id}
                  className="text-fg-muted hover:bg-surface-2/60"
                >
                  <td className={SERIAL_COLUMN_CLASS}>
                    {serialNumber(index, currentPage, pageSize)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {invoice.invoice_date}
                  </td>
                  <td className="max-w-44 px-4 py-3 font-semibold text-fg">
                    <FuelTooltip
                      content={invoiceDetails(invoice)}
                      className="truncate"
                    >
                      {invoice.vendor_name}
                    </FuelTooltip>
                  </td>
                  <td className="max-w-36 px-4 py-3">
                    <FuelTooltip
                      content={invoice.invoice_number ?? null}
                      className="truncate"
                    >
                      {invoice.invoice_number ?? "-"}
                    </FuelTooltip>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <FuelTooltip content={invoiceAmountDetails(invoice)}>
                      {formatCurrency(invoice.total_amount)}
                    </FuelTooltip>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <FuelTooltip content={invoiceAmountDetails(invoice)}>
                      {formatCurrency(invoice.paid_amount)}
                    </FuelTooltip>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <FuelTooltip content={invoiceAmountDetails(invoice)}>
                      {formatCurrency(invoice.balance_amount)}
                    </FuelTooltip>
                  </td>
                  <td className="px-4 py-3">
                    <FuelTooltip content={invoiceDetails(invoice)}>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass(
                          invoice.status
                        )}`}
                      >
                        {formatStatus(invoice.status)}
                      </span>
                    </FuelTooltip>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onView(invoice)}
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-edge px-3 text-sm font-medium text-fg hover:bg-surface-2"
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
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-edge px-3 text-sm font-medium text-fg hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                            : "Invoice cannot be deleted because it has already been allocated to a payment batch."
                        }
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-danger/25 px-3 text-sm font-medium text-danger-soft-fg hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
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

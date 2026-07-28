import { modalOverlay } from "@/components/shared/ui";
import { Copy, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SERIAL_COLUMN_CLASS, serialNumber } from "./SerialNumber";
import { VehicleSearchSelect } from "./VehicleSearchSelect";
import type { FormEvent } from "react";
import type {
  CreateVehicleExpenseInvoicePayload,
  Vehicle,
  VehicleRenewalType,
  VehicleExpenseInvoice,
} from "@/lib/fuel-tracker/types";

const expenseTypes = [
  "Repair",
  "Part Purchase",
  "Tax",
  "Insurance",
  "Service",
  "Permit",
  "Tyres",
  "Battery",
  "Other",
];

type LineItemForm = {
  expenseScope: "vehicle" | "general";
  vehicleId: string;
  expenseType: string;
  renewalType: VehicleRenewalType | null;
  description: string;
  amount: string;
};

export type VendorInvoiceFormDraft = {
  vendorName?: string;
  invoiceDate?: string;
  dueDate?: string;
  remarks?: string;
  items: LineItemForm[];
};

const initialItem: LineItemForm = {
  expenseScope: "vehicle",
  vehicleId: "",
  expenseType: expenseTypes[0],
  renewalType: null,
  description: "",
  amount: "",
};

const initialForm = {
  vendorName: "",
  invoiceNumber: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  remarks: "",
  items: [initialItem] as LineItemForm[],
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function itemFromInvoice(
  item: VehicleExpenseInvoice["items"][number]
): LineItemForm {
  const linkedVehicleId = item.vehicles[0]?.id ?? item.vehicle_id ?? "";

  return {
    expenseScope: linkedVehicleId ? "vehicle" : "general",
    vehicleId: linkedVehicleId,
    expenseType: item.expense_type,
    renewalType: item.renewal_type,
    description: item.description ?? "",
    amount: String(item.amount),
  };
}

export function VendorInvoiceFormModal({
  open,
  vehicles,
  loading,
  invoice,
  draft,
  onClose,
  onSubmit,
}: {
  open: boolean;
  vehicles: Vehicle[];
  loading: boolean;
  invoice?: VehicleExpenseInvoice | null;
  draft?: VendorInvoiceFormDraft | null;
  onClose: () => void;
  onSubmit: (payload: CreateVehicleExpenseInvoicePayload) => Promise<void>;
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(invoice);

  const totalAmount = useMemo(() => {
    return form.items.reduce((sum, item) => {
      const amount = Number(item.amount);
      return Number.isFinite(amount) ? sum + amount : sum;
    }, 0);
  }, [form.items]);

  useEffect(() => {
    if (!open) return;

    setForm(
      invoice
        ? {
            vendorName: invoice.vendor_name,
            invoiceNumber: invoice.invoice_number ?? "",
            invoiceDate: invoice.invoice_date,
            dueDate: invoice.due_date ?? "",
            remarks: invoice.remarks ?? "",
            items:
              invoice.items.length > 0
                ? invoice.items.map(itemFromInvoice)
                : [{ ...initialItem }],
          }
        : draft
        ? {
            ...initialForm,
            vendorName: draft.vendorName ?? "",
            invoiceDate:
              draft.invoiceDate ?? new Date().toISOString().slice(0, 10),
            dueDate: draft.dueDate ?? "",
            remarks: draft.remarks ?? "",
            items: draft.items.length > 0 ? draft.items : [{ ...initialItem }],
          }
        : {
            ...initialForm,
            items: [{ ...initialItem }],
          }
    );
    setError(null);
  }, [draft, invoice, open]);

  if (!open) return null;

  const updateItem = (index: number, updates: Partial<LineItemForm>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item
      ),
    }));
  };

  const addItem = () => {
    setForm((prev) => {
      const previous = prev.items[prev.items.length - 1] ?? initialItem;

      return {
        ...prev,
        items: [
          ...prev.items,
          {
            ...initialItem,
            expenseScope: previous.expenseScope,
            expenseType: previous.expenseType,
            renewalType: null,
            description: previous.description,
            amount: "",
            vehicleId: "",
          },
        ],
      };
    });
  };

  const duplicateItem = (index: number) => {
    setForm((prev) => {
      const item = prev.items[index] ?? initialItem;
      const duplicate: LineItemForm = {
        expenseScope: item.expenseScope,
        expenseType: item.expenseType,
        renewalType: null,
        description: item.description,
        amount: item.amount,
        vehicleId: "",
      };

      return {
        ...prev,
        items: [
          ...prev.items.slice(0, index + 1),
          duplicate,
          ...prev.items.slice(index + 1),
        ],
      };
    });
  };

  const removeItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.vendorName.trim()) {
      setError("Vendor name is required.");
      return;
    }

    if (!form.invoiceDate) {
      setError("Invoice date is required.");
      return;
    }

    if (form.items.length === 0) {
      setError("Add at least one line item.");
      return;
    }

    const items = [];

    for (const [index, item] of form.items.entries()) {
      const amount = Number(item.amount);
      const isVehicleItem = item.expenseScope === "vehicle";

      if (isVehicleItem && !item.vehicleId) {
        setError(`Select a vehicle for row ${index + 1}.`);
        return;
      }

      if (!item.expenseType.trim()) {
        setError(`Expense type is required for row ${index + 1}.`);
        return;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        setError(`Amount must be greater than zero for row ${index + 1}.`);
        return;
      }

      items.push({
        vehicleId: isVehicleItem ? item.vehicleId : null,
        vehicleIds: isVehicleItem ? [item.vehicleId] : [],
        expenseType: item.expenseType.trim(),
        renewalType: item.renewalType,
        description: item.description.trim() || null,
        amount,
      });
    }

    await onSubmit({
      vendorName: form.vendorName.trim(),
      invoiceNumber: form.invoiceNumber.trim() || null,
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate || null,
      remarks: form.remarks.trim() || null,
      items,
    });
  };

  return (
    <div className={modalOverlay}>
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-xl border border-edge bg-surface shadow-overlay">
        <div className="flex items-start justify-between gap-4 border-b border-edge px-5 py-3">
          <div>
            <h2 className="text-lg font-semibold text-fg">
              {isEdit ? "Edit Vendor Invoice" : "Add Vendor Invoice"}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              Enter one row per vehicle cost.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-fg-muted hover:bg-surface-2 hover:text-fg"
            aria-label="Close vendor invoice dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(92vh-68px)] space-y-4 overflow-y-auto px-5 py-4"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1">
              <span className="text-sm font-medium text-fg">
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
                className="h-9 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="Vendor name"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-fg">
                Invoice Number
              </span>
              <input
                value={form.invoiceNumber}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    invoiceNumber: event.target.value,
                  }))
                }
                className="h-9 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="Optional"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-fg">
                Invoice Date
              </span>
              <input
                type="date"
                value={form.invoiceDate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    invoiceDate: event.target.value,
                  }))
                }
                className="h-9 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-fg">
                Due Date
              </span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, dueDate: event.target.value }))
                }
                className="h-9 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </label>

            <label className="space-y-1 sm:col-span-2 lg:col-span-4">
              <span className="text-sm font-medium text-fg">
                Remarks
              </span>
              <textarea
                value={form.remarks}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, remarks: event.target.value }))
                }
                rows={2}
                className="w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="Optional remarks"
              />
            </label>
          </div>

          <div className="overflow-visible rounded-lg border border-edge">
            <div className="flex items-center justify-between gap-3 border-b border-edge bg-surface-2 px-3 py-2">
              <h3 className="text-sm font-semibold text-fg">
                Line Items
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-edge bg-surface px-3 text-sm font-medium text-fg hover:bg-surface-2"
              >
                <Plus className="h-4 w-4" />
                Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-250 w-full text-left text-sm">
                <thead className="border-b border-edge bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
                  <tr>
                    <th className={SERIAL_COLUMN_CLASS}>S.No</th>
                    <th className="px-3 py-2 font-semibold">Scope</th>
                    <th className="px-3 py-2 font-semibold">Vehicle</th>
                    <th className="px-3 py-2 font-semibold">Expense Type</th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Amount
                    </th>
                    <th className="px-3 py-2 font-semibold">Description</th>
                    <th className="px-3 py-2 text-center font-semibold">
                      Duplicate
                    </th>
                    <th className="px-3 py-2 text-center font-semibold">
                      Delete
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {form.items.map((item, index) => (
                    <tr key={index} className="align-top">
                      <td className={SERIAL_COLUMN_CLASS}>
                        {serialNumber(index)}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.expenseScope}
                          onChange={(event) => {
                            const expenseScope =
                              event.target.value === "general"
                                ? "general"
                                : "vehicle";
                            updateItem(index, {
                              expenseScope,
                              vehicleId:
                                expenseScope === "general"
                                  ? ""
                                  : item.vehicleId,
                            });
                          }}
                          className="h-9 w-28 rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                        >
                          <option value="vehicle">Vehicle</option>
                          <option value="general">General</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {item.expenseScope === "vehicle" ? (
                          <VehicleSearchSelect
                            vehicles={vehicles}
                            value={item.vehicleId}
                            onChange={(vehicleId) =>
                              updateItem(index, { vehicleId })
                            }
                          />
                        ) : (
                          <span className="inline-flex min-h-9 items-center text-sm text-fg-muted">
                            General
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.expenseType}
                          onChange={(event) =>
                            updateItem(index, {
                              expenseType: event.target.value,
                              renewalType: null,
                            })
                          }
                          className="h-9 w-40 rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                        >
                          {expenseTypes.map((expenseType) => (
                            <option key={expenseType} value={expenseType}>
                              {expenseType}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onChange={(event) =>
                            updateItem(index, { amount: event.target.value })
                          }
                          className="h-9 w-32 rounded-lg border border-edge bg-surface px-3 text-right text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={item.description}
                          onChange={(event) =>
                            updateItem(index, {
                              description: event.target.value,
                            })
                          }
                          className="h-9 w-full min-w-64 rounded-lg border border-edge bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                          placeholder="Optional details"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => duplicateItem(index)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-edge text-fg hover:bg-surface-2"
                          title="Duplicate row"
                          aria-label={`Duplicate row ${index + 1}`}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={form.items.length === 1}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-danger/25 text-danger-soft-fg hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
                          title="Delete row"
                          aria-label={`Delete row ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-edge pt-4 sm:flex-row sm:items-start sm:justify-between">
            {error ? (
              <div className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger-soft-fg">
                {error}
              </div>
            ) : (
              <span />
            )}

            <div className="flex flex-col gap-3 sm:items-end">
              <div className="rounded-md border border-edge px-4 py-2 text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  Invoice Total
                </p>
                <p className="mt-1 text-xl font-semibold text-fg">
                  {formatCurrency(totalAmount)}
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
                  disabled={loading}
                  className="min-h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Saving..."
                    : isEdit
                    ? "Save Changes"
                    : "Create Invoice"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

import { Copy, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SERIAL_COLUMN_CLASS, serialNumber } from "./SerialNumber";
import type { FormEvent } from "react";
import type {
  CreateVehicleExpenseInvoicePayload,
  Vehicle,
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
    description: item.description ?? "",
    amount: String(item.amount),
  };
}

function VehicleSearchSelect({
  vehicles,
  value,
  onChange,
}: {
  vehicles: Vehicle[];
  value: string;
  onChange: (vehicleId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const selectedVehicle =
    vehicles.find((vehicle) => vehicle.id === value) ?? null;

  function vehicleLabel(vehicle: Vehicle) {
    return [
      vehicle.vehicle_no,
      vehicle.vehicle_type,
      vehicle.company,
    ]
      .filter(Boolean)
      .join(" - ");
  }

  const filteredVehicles = vehicles.filter((vehicle) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;

    return vehicleLabel(vehicle).toLowerCase().includes(term);
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    setDropdownRect(containerRef.current?.getBoundingClientRect() ?? null);
  }, [open, query]);

  const displayValue = open
    ? query
    : selectedVehicle
    ? vehicleLabel(selectedVehicle)
    : "";

  return (
    <div ref={containerRef} className="relative min-w-52">
      <input
        value={displayValue}
        onClick={() => {
          setOpen(true);
          setDropdownRect(containerRef.current?.getBoundingClientRect() ?? null);
          setQuery("");
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          if (!open) setOpen(true);
        }}
        className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 pr-7 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
        placeholder="Search vehicle"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
        ▼
      </span>

      {open ? (
        <div
          className="fixed z-[70] max-h-56 overflow-auto rounded-md border border-gray-200 bg-white text-sm shadow-lg dark:border-gray-800 dark:bg-gray-950"
          style={{
            left: dropdownRect?.left ?? 0,
            top: (dropdownRect?.bottom ?? 0) + 4,
            width: dropdownRect?.width ?? 240,
          }}
        >
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
              setQuery("");
            }}
            className="w-full px-3 py-2 text-left text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900"
          >
            Select vehicle
          </button>
          {filteredVehicles.length === 0 ? (
            <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
              {vehicles.length === 0 ? "No vehicles loaded" : "No vehicles found"}
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <button
                type="button"
                key={vehicle.id}
                onClick={() => {
                  onChange(vehicle.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900"
              >
                <span>{vehicle.vehicle_no}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {[vehicle.vehicle_type, vehicle.company].filter(Boolean).join(" - ")}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
              {isEdit ? "Edit Vendor Invoice" : "Add Vendor Invoice"}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter one row per vehicle cost.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
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
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="Vendor name"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
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
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="Optional"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
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
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Due Date
              </span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, dueDate: event.target.value }))
                }
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
              />
            </label>

            <label className="space-y-1 sm:col-span-2 lg:col-span-4">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Remarks
              </span>
              <textarea
                value={form.remarks}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, remarks: event.target.value }))
                }
                rows={2}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                placeholder="Optional remarks"
              />
            </label>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">
                Line Items
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <Plus className="h-4 w-4" />
                Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-250 w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
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
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
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
                          className="h-9 w-28 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
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
                          <span className="inline-flex min-h-9 items-center text-sm text-gray-500 dark:text-gray-400">
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
                            })
                          }
                          className="h-9 w-40 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
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
                          className="h-9 w-32 rounded-md border border-gray-300 bg-white px-3 text-right text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
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
                          className="h-9 w-full min-w-64 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                          placeholder="Optional details"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => duplicateItem(index)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
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
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
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

          <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:items-start sm:justify-between">
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            ) : (
              <span />
            )}

            <div className="flex flex-col gap-3 sm:items-end">
              <div className="rounded-md border border-gray-200 px-4 py-2 text-right dark:border-gray-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Invoice Total
                </p>
                <p className="mt-1 text-xl font-semibold text-gray-950 dark:text-gray-50">
                  {formatCurrency(totalAmount)}
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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

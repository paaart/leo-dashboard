"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import type { WarehousePodSummary } from "@/lib/warehouse/types";
import { listWarehousePods, deleteWarehousePod } from "@/lib/warehouse/pods";
import WarehousePodHistoryView from "./Ledger/WarehousePodLedger";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  SectionCard,
} from "@/components/shared/DashboardUI";
import WarehouseSummaryCards from "./WarehouseSummaryCards";
import { buttonSecondary, inputField } from "@/components/shared/ui";
import {
  TablePagination,
  paginateItems,
} from "@/components/FuelTracker/TablePagination";

const POD_PAGE_SIZE = 50;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

// function fmtDate(value?: string | null) {
//   if (!value) return "-";
//   return new Date(value).toLocaleDateString("en-IN");
// }

function statusBadgeClass(b: "green" | "yellow" | "red") {
  if (b === "red") {
    return "border-danger/25 bg-danger-soft text-danger-soft-fg";
  }
  if (b === "yellow") {
    return "border-warning/25 bg-warning-soft text-warning-soft-fg";
  }
  return "border-success/25 bg-success-soft text-success-soft-fg";
}

export default function WarehouseActivePods() {
  const [rows, setRows] = useState<WarehousePodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<WarehousePodSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listWarehousePods();
      setRows(data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to load warehouse pods");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return rows.filter((r) => {
      return (
        r.name.toLowerCase().includes(s) ||
        r.contact.toLowerCase().includes(s) ||
        (r.company_name ?? "").toLowerCase().includes(s) ||
        (r.location_name ?? "").toLowerCase().includes(s)
      );
    });
  }, [rows, q]);

  // KPIs (count + total due) intentionally aggregate over the full filtered
  // set, not the current page.
  const totalDueAll = useMemo(
    () => filtered.reduce((sum, r) => sum + (Number(r.total_due) || 0), 0),
    [filtered]
  );

  const paginated = useMemo(
    () => paginateItems(filtered, page, POD_PAGE_SIZE),
    [filtered, page]
  );

  const handleDelete = async (row: WarehousePodSummary) => {
    const ok = window.confirm(
      `Delete "${row.name}"?\n\nThis will permanently remove the pod and related cycle/transaction data.`
    );

    if (!ok) return;

    setDeletingId(row.id);

    try {
      await deleteWarehousePod(row.id);
      toast.success("Pod deleted");

      setRows((prev) => prev.filter((x) => x.id !== row.id));

      if (selected?.id === row.id) {
        setSelected(null);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to delete pod");
    } finally {
      setDeletingId(null);
    }
  };

  if (selected) {
    return (
      <WarehousePodHistoryView
        pod={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <PageHeader
            eyebrow="Storage"
            title="Warehouse Management"
            subtitle="Manage warehouse clients, PODs, billing, payments, and storage ledgers."
          />
          <LoadingState label="Loading active PODs" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Storage"
          title="Warehouse Management"
          subtitle="Manage warehouse clients, PODs, billing, payments, and storage ledgers."
        />

        <WarehouseSummaryCards />

        <SectionCard
          title="Warehouse PODs"
          description="Review active PODs, balances, due dates, and ledger actions."
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-fg-muted">
                {filtered.length} active
              </div>
              <div className="rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm font-semibold text-accent">
                {formatCurrency(totalDueAll)}
              </div>
            </div>
          }
        >
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, contact, company, or location..."
              className={`${inputField} lg:max-w-xl`}
            />
            <button
              type="button"
              onClick={() => void load()}
              className={buttonSecondary}
            >
              Refresh
            </button>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="No active PODs"
              description="Active warehouse PODs will appear here once clients are created."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-edge bg-surface shadow-card">
              <table className="min-w-270 w-full text-sm">
                <thead className="bg-surface-2 text-fg-muted">
                  <tr>
                    <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                      Sl no
                    </th>
                    <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                      Client
                    </th>
                    <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                      Company
                    </th>
                    <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                      Location
                    </th>
                    {/* <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                      Next Charge
                    </th>
                    <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                      Next Payment
                    </th> */}
                    <th className="border-b border-edge px-4 py-3 text-right font-semibold">
                      Total Due
                    </th>
                    <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                      Status
                    </th>
                    <th className="border-b border-edge px-4 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-edge">
                  {paginated.items.map((r, idx) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="cursor-pointer bg-surface transition-colors hover:bg-surface-2/60"
                    >
                      <td className="px-4 py-3 text-fg-muted">
                        <div className="font-medium text-fg">
                          {(paginated.page - 1) * POD_PAGE_SIZE + idx + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-fg">
                          {r.name}
                        </div>
                        <div className="text-xs text-fg-muted">
                          {r.client_id ?? "-"} • {r.contact}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-fg-muted">
                        {r.company_name ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-fg-muted">
                        {r.location_name ?? "-"}
                      </td>

                      {/* <td className="px-4 py-3 text-fg-muted">
                        {fmtDate(r.next_charge_date)}
                      </td>

                      <td className="px-4 py-3 text-fg-muted">
                        {fmtDate(r.next_payment_date)}
                      </td> */}

                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-accent">
                        {formatCurrency(Number(r.total_due))}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusBadgeClass(
                            r.severity_band
                          )}`}
                        >
                          {r.severity_band === "red"
                            ? "Overdue"
                            : r.severity_band === "yellow"
                            ? "Pending"
                            : "Healthy"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(r);
                          }}
                          disabled={deletingId === r.id}
                          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-danger/30 bg-danger-soft px-3 text-sm font-medium text-danger-soft-fg transition hover:border-danger/50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === r.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > 0 ? (
            <div className="mt-4">
              <TablePagination
                page={paginated.page}
                totalItems={filtered.length}
                onPageChange={setPage}
                label="pods"
                pageSize={POD_PAGE_SIZE}
              />
            </div>
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
}

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN");
}

function statusBadgeClass(b: "green" | "yellow" | "red") {
  if (b === "red") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";
  }
  if (b === "yellow") {
    return "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-300";
  }
  return "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300";
}

export default function WarehouseActivePods() {
  const [rows, setRows] = useState<WarehousePodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
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

  const totalDueAll = useMemo(
    () => filtered.reduce((sum, r) => sum + (Number(r.total_due) || 0), 0),
    [filtered]
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
      <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
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
    <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
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
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                {filtered.length} active
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-blue-700 dark:border-gray-800 dark:bg-gray-900 dark:text-blue-300">
                {formatCurrency(totalDueAll)}
              </div>
            </div>
          }
        >
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, contact, company, or location..."
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-500 lg:max-w-xl"
            />
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
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
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="min-w-[1080px] w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                  <tr>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Sl no
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Client
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Company
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Location
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Next Charge
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Next Payment
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold dark:border-gray-800">
                      Total Due
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Status
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold dark:border-gray-800">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filtered.map((r, idx) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="cursor-pointer bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                    >
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        <div className="font-medium text-gray-950 dark:text-gray-50">
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-950 dark:text-gray-50">
                          {r.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {r.client_id ?? "-"} • {r.contact}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {r.company_name ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {r.location_name ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {fmtDate(r.next_charge_date)}
                      </td>

                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {fmtDate(r.next_payment_date)}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-blue-700 dark:text-blue-300">
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
                          className="inline-flex min-h-9 items-center justify-center rounded-md border border-red-200 px-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
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
        </SectionCard>
      </div>
    </div>
  );
}

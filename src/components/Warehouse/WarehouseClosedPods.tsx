"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { getErrorMessage } from "@/lib/errors";
import {
  listClosedWarehousePods,
  type WarehouseClosedPodRow,
  type WarehouseClosedPodsMeta,
} from "@/lib/warehouse/pods";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  SectionCard,
} from "@/components/shared/DashboardUI";
import WarehouseSummaryCards from "./WarehouseSummaryCards";

const PAGE_SIZE = 50;

function fmtINR(value: number) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";

  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";

  return dt.toLocaleDateString("en-IN");
}

function dueToneClass(value: number) {
  if (value > 0) return "text-red-700 dark:text-red-300";
  if (value < 0) return "text-green-700 dark:text-green-300";
  return "text-gray-700 dark:text-gray-300";
}

export default function WarehouseClosedPods() {
  const [rows, setRows] = useState<WarehouseClosedPodRow[]>([]);
  const [meta, setMeta] = useState<WarehouseClosedPodsMeta>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);

    try {
      const data = await listClosedWarehousePods({
        page,
        pageSize: PAGE_SIZE,
        search,
      });

      setRows(data.rows);
      setMeta(data.meta);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to load closed pods");
      setRows([]);
      setMeta({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);

      if (page === 1) {
        void load();
      }
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalFinalDueOnPage = useMemo(() => {
    return rows.reduce((sum, row) => sum + Number(row.final_due || 0), 0);
  }, [rows]);

  const canGoPrev = meta.page > 1;
  const canGoNext = meta.page < meta.totalPages;

  const inputClass =
    "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-500";

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
          title="Closed PODs"
          description="Completed warehouse clients and final balances."
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                {meta.total} closed
              </div>
              <div
                className={`rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold dark:border-gray-800 dark:bg-gray-900 ${dueToneClass(
                  totalFinalDueOnPage
                )}`}
              >
                {fmtINR(totalFinalDueOnPage)}
              </div>
            </div>
          }
        >
          <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200">
                Search
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client, company, location, or contact..."
                className={inputClass}
              />
            </div>

            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <LoadingState label="Loading closed PODs" />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No closed PODs"
              description="Closed warehouse PODs will appear here once a cycle is completed."
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="min-w-[980px] w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                <tr>
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
                    Start Date
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                    Closed Date
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                    Billing
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold dark:border-gray-800">
                    Final Due
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {row.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {row.client_id ?? "—"} • {row.contact}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {row.company_name ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {row.location_name ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {fmtDate(row.start_date)}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {fmtDate(row.closed_at)}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      <div>{fmtINR(Number(row.rate))}</div>
                      <div className="text-xs capitalize text-gray-500 dark:text-gray-400">
                        {row.billing_interval.replaceAll("_", " ")}
                      </div>
                    </td>

                    <td
                      className={`px-4 py-3 text-right text-sm font-semibold ${dueToneClass(
                        row.final_due
                      )}`}
                    >
                      {fmtINR(Number(row.final_due))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {meta.page} of {meta.totalPages} • Showing {rows.length} of{" "}
              {meta.total}
            </div>

            <div className="flex gap-2">
                <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canGoPrev || loading}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!canGoNext || loading}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

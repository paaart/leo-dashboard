"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { getErrorMessage } from "@/lib/errors";
import {
  listClosedWarehousePods,
  type WarehouseClosedPodRow,
  type WarehouseClosedPodsMeta,
} from "@/lib/warehouse/pods";

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
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

  return (
    <div className="min-h-screen rounded bg-white p-6 shadow dark:bg-[#23272f]">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Closed Pods
          </h2>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Fully completed warehouse clients. These are not running or renewed
            pods.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-gray-100 px-4 py-3 dark:bg-gray-700">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">
              Closed Pods
            </div>

            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {meta.total}
            </div>
          </div>

          <div className="rounded-lg bg-red-50 px-4 py-3 dark:bg-red-900/20">
            <div className="text-xs uppercase tracking-wide text-red-700 dark:text-red-300">
              Final Due on Page
            </div>

            <div
              className={`text-xl font-bold ${dueToneClass(
                totalFinalDueOnPage
              )}`}
            >
              {fmtINR(totalFinalDueOnPage)}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Search
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client/company/location/contact..."
            className={inputClass}
          />
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-80 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
          No closed pods found.
        </div>
      ) : (
        <>
          <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Start Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Closed Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Billing
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Final Due
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-[#23272f]">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
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
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 disabled:opacity-60 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!canGoNext || loading}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 disabled:opacity-60 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { getErrorMessage } from "@/lib/errors";
import {
  exportWarehousePaymentsCsv,
  listWarehousePayments,
  type WarehousePaymentRow,
  type WarehousePaymentsMeta,
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
  return `₹${Math.abs(Number(value || 0)).toFixed(2)}`;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN");
}

export default function WarehousePayments() {
  const [rows, setRows] = useState<WarehousePaymentRow[]>([]);
  const [meta, setMeta] = useState<WarehousePaymentsMeta>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);

    try {
      const data = await listWarehousePayments({
        page,
        pageSize: PAGE_SIZE,
        search,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });

      setRows(data.rows);
      setMeta(data.meta);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to load payments");
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
  }, [search, fromDate, toDate]);

  // const totalPaymentsOnPage = useMemo(() => {
  //   return rows.reduce((sum, row) => {
  //     return sum + Math.abs(Number(row.amount || 0));
  //   }, 0);
  // }, [rows]);

  const canGoPrev = meta.page > 1;
  const canGoNext = meta.page < meta.totalPages;

  const handleExport = async () => {
    setExportError("");

    if (!exportStartDate || !exportEndDate) {
      setExportError("Select both start and end dates to export payments.");
      return;
    }

    if (exportStartDate > exportEndDate) {
      setExportError("Start date must be before or equal to end date.");
      return;
    }

    setExporting(true);

    try {
      const blob = await exportWarehousePaymentsCsv({
        startDate: exportStartDate,
        endDate: exportEndDate,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `warehouse-payments-${exportStartDate}-to-${exportEndDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Warehouse payments CSV downloaded");
    } catch (err: unknown) {
      const message =
        getErrorMessage(err) || "Failed to export warehouse payments";
      setExportError(message);
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

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
          title="Export Payment CSV"
          description="Download warehouse payment transactions for a selected date range."
          action={
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              Admin export
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[180px_180px_auto] lg:items-end">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200">
                Start Date
              </label>
              <input
                aria-label="Export start date"
                type="date"
                value={exportStartDate}
                onChange={(e) => {
                  setExportStartDate(e.target.value);
                  setExportError("");
                }}
                onInput={(e) => {
                  setExportStartDate(e.currentTarget.value);
                  setExportError("");
                }}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200">
                End Date
              </label>
              <input
                aria-label="Export end date"
                type="date"
                value={exportEndDate}
                onChange={(e) => {
                  setExportEndDate(e.target.value);
                  setExportError("");
                }}
                onInput={(e) => {
                  setExportEndDate(e.currentTarget.value);
                  setExportError("");
                }}
                className={inputClass}
              />
            </div>

            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              {exporting ? "Preparing CSV..." : "Download CSV"}
            </button>
          </div>

          {exportError && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {exportError}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Payments / Transactions"
          description="View warehouse payment entries across clients."
          action={
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              {meta.total} matching records
            </div>
          }
        >
          <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_auto] lg:items-end">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200">
            Search
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client/company/location/title/note..."
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200">
            From Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200">
            To Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
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
        <LoadingState label="Loading payments" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No payment records"
          description="Warehouse payment transactions will appear here."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="min-w-[1040px] w-full text-sm">
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
                    Payment Date
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                    Mode
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                    Title / Note
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold dark:border-gray-800">
                    Amount
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
                        {row.pod_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {row.client_id ?? "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {row.company_name ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {row.location_name ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {fmtDate(row.tx_date)}
                    </td>

                    <td className="px-4 py-3 text-sm capitalize text-gray-700 dark:text-gray-300">
                      {(row.mode_of_payment ?? "—").replaceAll("_", " ")}
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {row.title || "Payment"}
                      </div>
                      {row.note && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {row.note}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right text-sm font-semibold text-green-700 dark:text-green-300">
                      {fmtINR(row.amount)}
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

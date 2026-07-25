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
    "h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/25";

  return (
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Storage"
          title="Warehouse Management"
          subtitle="Manage warehouse clients, PODs, billing, payments, and storage ledgers."
        />

        <SectionCard
          title="Export Payment CSV"
          description="Download warehouse payment transactions for a selected date range."
          action={
            <div className="rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-fg-muted">
              Admin export
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[180px_180px_max-content] lg:items-end">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg">
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
              <label className="mb-1.5 block text-sm font-medium text-fg">
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
              className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-lg bg-accent px-6 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
            >
              {exporting ? "Preparing CSV..." : "Download CSV"}
            </button>
          </div>

          {exportError && (
            <div className="mt-3 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger-soft-fg">
              {exportError}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Payments / Transactions"
          description="View warehouse payment entries across clients."
          action={
            <div className="rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-fg-muted">
              {meta.total} matching records
            </div>
          }
        >
          <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_auto] lg:items-end">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg">
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
              <label className="mb-1.5 block text-sm font-medium text-fg">
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
              <label className="mb-1.5 block text-sm font-medium text-fg">
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
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-edge bg-surface px-4 text-sm font-medium text-fg shadow-card transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
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
              <div className="overflow-x-auto rounded-xl border border-edge bg-surface shadow-card">
                <table className="min-w-260 w-full text-sm">
                  <thead className="bg-surface-2 text-fg-muted">
                    <tr>
                      <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                        Client
                      </th>
                      <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                        Company
                      </th>
                      <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                        Location
                      </th>
                      <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                        Payment Date
                      </th>
                      <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                        Mode
                      </th>
                      <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                        Title / Note
                      </th>
                      <th className="border-b border-edge px-4 py-3 text-right font-semibold">
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-edge">
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="bg-surface transition-colors hover:bg-surface-2/60"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-fg">
                            {row.pod_name}
                          </div>
                          <div className="text-xs text-fg-muted">
                            {row.client_id ?? "—"}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm text-fg-muted">
                          {row.company_name ?? "—"}
                        </td>

                        <td className="px-4 py-3 text-sm text-fg-muted">
                          {row.location_name ?? "—"}
                        </td>

                        <td className="px-4 py-3 text-sm text-fg-muted">
                          {fmtDate(row.tx_date)}
                        </td>

                        <td className="px-4 py-3 text-sm capitalize text-fg-muted">
                          {(row.mode_of_payment ?? "—").replaceAll("_", " ")}
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-fg">
                            {row.title || "Payment"}
                          </div>
                          {row.note && (
                            <div className="mt-1 text-xs text-fg-muted">
                              {row.note}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right text-sm font-semibold text-success">
                          {fmtINR(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-fg-muted">
                  Page {meta.page} of {meta.totalPages} • Showing {rows.length}{" "}
                  of {meta.total}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!canGoPrev || loading}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-edge bg-surface px-4 text-sm font-medium text-fg shadow-card transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!canGoNext || loading}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-edge bg-surface px-4 text-sm font-medium text-fg shadow-card transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
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

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
import {
  buttonSecondary,
  fieldLabel,
  inputField,
} from "@/components/shared/ui";

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
  if (value > 0) return "text-danger";
  if (value < 0) return "text-success";
  return "text-fg-muted";
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

  const inputClass = inputField;

  return (
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Storage"
          title="Warehouse Management"
          subtitle="Manage warehouse clients, PODs, billing, payments, and storage ledgers."
        />

        <SectionCard
          title="Closed PODs"
          description="Completed warehouse clients and final balances."
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-fg-muted">
                {meta.total} closed
              </div>
              <div
                className={`rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm font-semibold ${dueToneClass(
                  totalFinalDueOnPage,
                )}`}
              >
                {fmtINR(totalFinalDueOnPage)}
              </div>
            </div>
          }
        >
          <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <label className={fieldLabel}>
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
              className={buttonSecondary}
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
              <div className="overflow-x-auto rounded-xl border border-edge bg-surface shadow-card">
                <table className="min-w-245 w-full text-sm">
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
                        Start Date
                      </th>
                      <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                        Closed Date
                      </th>
                      <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                        Billing
                      </th>
                      <th className="border-b border-edge px-4 py-3 text-right font-semibold">
                        Final Due
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
                            {row.name}
                          </div>
                          <div className="text-xs text-fg-muted">
                            {row.client_id ?? "—"} • {row.contact}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm text-fg-muted">
                          {row.company_name ?? "—"}
                        </td>

                        <td className="px-4 py-3 text-sm text-fg-muted">
                          {row.location_name ?? "—"}
                        </td>

                        <td className="px-4 py-3 text-sm text-fg-muted">
                          {fmtDate(row.start_date)}
                        </td>

                        <td className="px-4 py-3 text-sm text-fg-muted">
                          {fmtDate(row.closed_at)}
                        </td>

                        <td className="px-4 py-3 text-sm text-fg-muted">
                          <div>{fmtINR(Number(row.rate))}</div>
                          <div className="text-xs capitalize text-fg-muted">
                            {row.billing_interval.replaceAll("_", " ")}
                          </div>
                        </td>

                        <td
                          className={`px-4 py-3 text-right text-sm font-semibold ${dueToneClass(
                            row.final_due,
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
                <div className="text-sm text-fg-muted">
                  Page {meta.page} of {meta.totalPages} • Showing {rows.length}{" "}
                  of {meta.total}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!canGoPrev || loading}
                    className={buttonSecondary}
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!canGoNext || loading}
                    className={buttonSecondary}
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

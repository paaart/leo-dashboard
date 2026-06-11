"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, EyeOff, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

import { getErrorMessage } from "@/lib/errors";
import { recordWarehousePayment } from "@/lib/warehouse/ledger";
import {
  dismissWarehousePaymentAlert,
  listWarehousePaymentAlerts,
  type WarehousePaymentAlertRow,
  type WarehousePaymentAlertStatus,
} from "@/lib/warehouse/pods";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  SectionCard,
} from "@/components/shared/DashboardUI";
import WarehouseSummaryCards from "./WarehouseSummaryCards";
import WarehouseTxModal from "./Ledger/WarehouseTxModal";

type FilterValue = "all" | WarehousePaymentAlertStatus;

const FILTERS: Array<{ label: string; value: FilterValue }> = [
  { label: "All", value: "all" },
  { label: "Overdue", value: "overdue" },
  { label: "Due Today", value: "due_today" },
  { label: "Upcoming", value: "upcoming" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("en-IN");
}

function statusLabel(status: WarehousePaymentAlertStatus) {
  if (status === "overdue") return "Overdue";
  if (status === "due_today") return "Due Today";
  return "Upcoming";
}

function statusBadgeClass(status: WarehousePaymentAlertStatus) {
  if (status === "overdue") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";
  }

  if (status === "due_today") {
    return "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-300";
  }

  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";
}

export default function WarehousePaymentAlerts() {
  const [rows, setRows] = useState<WarehousePaymentAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [payingRow, setPayingRow] = useState<WarehousePaymentAlertRow | null>(
    null
  );
  const [dismissingKey, setDismissingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);

    try {
      const data = await listWarehousePaymentAlerts();
      setRows(data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to load payment alerts");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((row) => row.alert_status === filter);
  }, [filter, rows]);

  const totalDue = useMemo(
    () => filtered.reduce((sum, row) => sum + Number(row.total_due || 0), 0),
    [filtered]
  );

  const counts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.all += 1;
        acc[row.alert_status] += 1;
        return acc;
      },
      { all: 0, overdue: 0, due_today: 0, upcoming: 0 }
    );
  }, [rows]);

  const dismissAlert = async (row: WarehousePaymentAlertRow) => {
    const key = `${row.pod_id}:${row.next_payment_date}`;
    setDismissingKey(key);

    try {
      await dismissWarehousePaymentAlert({
        podId: row.pod_id,
        nextPaymentDate: row.next_payment_date,
      });
      setRows((prev) =>
        prev.filter(
          (item) =>
            item.pod_id !== row.pod_id ||
            item.next_payment_date !== row.next_payment_date
        )
      );
      toast.success("Alert dismissed");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to dismiss alert");
    } finally {
      setDismissingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <PageHeader
            eyebrow="Storage"
            title="Warehouse Management"
            subtitle="Manage warehouse clients, PODs, billing, payments, and storage ledgers."
          />
          <LoadingState label="Loading payment alerts" />
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
          title="Payment Alerts"
          description="Upcoming and overdue warehouse payment dates for active PODs."
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                {filtered.length} alerts
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-blue-700 dark:border-gray-800 dark:bg-gray-900 dark:text-blue-300">
                {formatCurrency(totalDue)}
              </div>
            </div>
          }
        >
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => {
                const active = filter === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={`inline-flex min-h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    }`}
                  >
                    {item.label}
                    <span className="ml-2 text-xs opacity-80">
                      {counts[item.value]}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="No payment alerts"
              description="No payment alerts due right now."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="min-w-[1080px] w-full text-sm">
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
                      POD Number
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Next Payment Date
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold dark:border-gray-800">
                      Total Due
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Alert Status
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold dark:border-gray-800">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filtered.map((row, idx) => {
                    const dismissKey = `${row.pod_id}:${row.next_payment_date}`;
                    const dismissing = dismissingKey === dismissKey;

                    return (
                      <tr
                        key={dismissKey}
                        className="bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                      >
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-950 dark:text-gray-50">
                            {row.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {row.contact}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {row.company_name ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {row.location_name ?? "-"}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                          {row.client_id ?? row.pod_id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {fmtDate(row.next_payment_date)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-blue-700 dark:text-blue-300">
                          {formatCurrency(Number(row.total_due))}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                              row.alert_status
                            )}`}
                          >
                            {statusLabel(row.alert_status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setPayingRow(row)}
                              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-blue-200 px-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-300 dark:hover:bg-blue-950/40"
                            >
                              <CreditCard className="h-4 w-4" />
                              Record Payment
                            </button>
                            <button
                              type="button"
                              onClick={() => void dismissAlert(row)}
                              disabled={dismissing}
                              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                              <EyeOff className="h-4 w-4" />
                              {dismissing
                                ? "Dismissing..."
                                : "Dismiss Reminder"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <WarehouseTxModal
        open={Boolean(payingRow)}
        title="Record Payment"
        kind="payment"
        onClose={() => setPayingRow(null)}
        onSubmit={async (value) => {
          if (!payingRow) return;

          await recordWarehousePayment({
            podId: payingRow.pod_id,
            amount: value.amount,
            txDate: value.txDate,
            title: value.title,
            note: value.note,
          });

          toast.success("Payment recorded");
          await load();
        }}
      />
    </div>
  );
}

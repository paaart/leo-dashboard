"use client";

import { useEffect, useState } from "react";
import { EyeOff, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

import { getErrorMessage } from "@/lib/errors";
import {
  dismissWarehousePaymentAlert,
  listWarehousePaymentAlerts,
  type WarehousePaymentAlertRow,
} from "@/lib/warehouse/pods";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  SectionCard,
} from "@/components/shared/DashboardUI";

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

export default function WarehousePaymentAlerts() {
  const [rows, setRows] = useState<WarehousePaymentAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
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

  const dismissAlert = async (row: WarehousePaymentAlertRow) => {
    const key = `${row.pod_id}:${row.next_payment_date}`;
    setDismissingKey(key);

    try {
      await dismissWarehousePaymentAlert({
        podId: row.pod_id,
        nextPaymentDate: row.next_payment_date,
      });
      await load();
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

        <SectionCard
          title="Upcoming Payments"
          description={`Due in the Next 5 Days • ${rows.length} Payments`}
          action={
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          }
        >
          {rows.length === 0 ? (
            <EmptyState
              title="No upcoming payments"
              description="No payments are due in the next 5 days."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="min-w-270 w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                  <tr>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Sl No
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
                      POD Number
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Next Payment Date
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold dark:border-gray-800">
                      Total Due
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3  font-semibold dark:border-gray-800">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {rows.map((row, idx) => {
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
                          <div className="flex justify-end gap-2">
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
    </div>
  );
}

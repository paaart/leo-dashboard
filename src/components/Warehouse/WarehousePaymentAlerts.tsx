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
      <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
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
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
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
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-edge bg-surface px-4 text-sm font-medium text-fg shadow-card transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="overflow-x-auto rounded-xl border border-edge bg-surface shadow-card">
              <table className="min-w-270 w-full text-sm">
                <thead className="bg-surface-2 text-fg-muted">
                  <tr>
                    <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                      Sl No
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
                    <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                      POD Number
                    </th>
                    <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                      Next Payment Date
                    </th>
                    <th className="border-b border-edge px-4 py-3 text-right font-semibold">
                      Total Due
                    </th>
                    <th className="border-b border-edge px-4 py-3  font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-edge">
                  {rows.map((row, idx) => {
                    const dismissKey = `${row.pod_id}:${row.next_payment_date}`;
                    const dismissing = dismissingKey === dismissKey;

                    return (
                      <tr
                        key={dismissKey}
                        className="bg-surface transition-colors hover:bg-surface-2/60"
                      >
                        <td className="px-4 py-3 text-fg-muted">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-fg">
                            {row.name}
                          </div>
                          <div className="text-xs text-fg-muted">
                            {row.contact}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-fg-muted">
                          {row.company_name ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-fg-muted">
                          {row.location_name ?? "-"}
                        </td>
                        <td className="px-4 py-3 font-medium text-fg">
                          {row.client_id ?? row.pod_id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 text-fg-muted">
                          {fmtDate(row.next_payment_date)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-accent">
                          {formatCurrency(Number(row.total_due))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void dismissAlert(row)}
                              disabled={dismissing}
                              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-edge bg-surface px-3 text-sm font-medium text-fg shadow-card transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
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

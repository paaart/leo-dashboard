import { AlertTriangle, EyeOff, FilePlus2, RefreshCw } from "lucide-react";
import type { VehicleRenewalAlert } from "@/lib/fuel-tracker/types";

function fmtDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}

function urgencyText(alert: VehicleRenewalAlert) {
  if (alert.daysUntilRenewal < 0) {
    const days = Math.abs(alert.daysUntilRenewal);
    return `${days} ${days === 1 ? "day" : "days"} overdue`;
  }
  if (alert.daysUntilRenewal === 0) return "Due Today";
  if (alert.daysUntilRenewal === 1) return "Due Tomorrow";
  return `Due in ${alert.daysUntilRenewal} days`;
}

function urgencyClass(alert: VehicleRenewalAlert) {
  if (alert.status === "overdue") {
    return "border-danger/25 bg-danger-soft text-danger-soft-fg";
  }

  if (alert.status === "due_today") {
    return "border-warning/25 bg-warning-soft text-warning-soft-fg";
  }

  return "border-accent/25 bg-accent-soft text-accent-soft-fg";
}

function fmtCurrency(value: number | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function VehicleRenewalAlerts({
  alerts,
  loading,
  dismissingKey,
  onRefresh,
  onDismiss,
  onCreateInvoice,
}: {
  alerts: VehicleRenewalAlert[];
  loading: boolean;
  dismissingKey: string | null;
  onRefresh: () => void;
  onDismiss: (alert: VehicleRenewalAlert) => void;
  onCreateInvoice: (alert: VehicleRenewalAlert) => void;
}) {
  return (
    <div className="rounded-xl border border-edge bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-fg">
              Renewal Alerts
            </h3>
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            Due in the next 15 days or overdue
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-edge px-3 text-sm font-medium text-fg hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-md bg-surface-2"
            />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="px-4 py-5 text-sm text-fg-muted">
          No renewal alerts in the next 15 days.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-210 w-full text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Vehicle</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Renewal Item</th>
                <th className="px-4 py-3 font-semibold">Last Renewal</th>
                <th className="px-4 py-3 font-semibold">Next Renewal</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Urgency</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {alerts.map((alert) => {
                const key = `${alert.vehicleId}:${alert.renewalType}:${alert.renewalDate}`;
                const dismissing = dismissingKey === key;

                return (
                  <tr
                    key={key}
                    className="text-fg-muted hover:bg-surface-2/60"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-fg">
                        {alert.vehicleNo}
                      </div>
                      <div className="text-xs text-fg-muted">
                        {alert.vehicleType}
                      </div>
                    </td>
                    <td className="px-4 py-3">{alert.company ?? "-"}</td>
                    <td className="px-4 py-3 font-medium">
                      {alert.renewalLabel}
                    </td>
                    <td className="px-4 py-3">
                      {alert.lastRenewalDate
                        ? fmtDate(alert.lastRenewalDate)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">{fmtDate(alert.renewalDate)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {fmtCurrency(alert.renewalAmount)}
                    </td>
                    <td className="px-4 py-3">{alert.renewalVendor ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${urgencyClass(
                          alert
                        )}`}
                      >
                        {urgencyText(alert)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onCreateInvoice(alert)}
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
                        >
                          <FilePlus2 className="h-4 w-4" />
                          Create Invoice
                        </button>
                        <button
                          type="button"
                          onClick={() => onDismiss(alert)}
                          disabled={dismissing}
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-edge px-3 text-sm font-medium text-fg hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <EyeOff className="h-4 w-4" />
                          {dismissing ? "Dismissing..." : "Dismiss"}
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
    </div>
  );
}

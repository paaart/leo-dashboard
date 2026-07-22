import { AlertTriangle, EyeOff, FilePlus2, RefreshCw } from "lucide-react";
import type { VehicleRenewalAlert } from "@/lib/fuel-tracker/types";

function fmtDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}

function urgencyText(alert: VehicleRenewalAlert) {
  if (alert.daysUntilRenewal < 0) {
    return `${Math.abs(alert.daysUntilRenewal)} days overdue`;
  }
  if (alert.daysUntilRenewal === 0) return "Due today";
  return `Due in ${alert.daysUntilRenewal} days`;
}

function urgencyClass(alert: VehicleRenewalAlert) {
  if (alert.status === "overdue") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";
  }

  if (alert.status === "due_today") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";
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
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">
              Renewal Alerts
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Due in the next 15 days or overdue
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
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
              className="h-12 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="px-4 py-5 text-sm text-gray-500 dark:text-gray-400">
          No renewal alerts in the next 15 days.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-210 w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Vehicle</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Renewal Item</th>
                <th className="px-4 py-3 font-semibold">Renewal Date</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Urgency</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {alerts.map((alert) => {
                const key = `${alert.vehicleId}:${alert.renewalType}:${alert.renewalDate}`;
                const dismissing = dismissingKey === key;

                return (
                  <tr
                    key={key}
                    className="text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/70"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-950 dark:text-gray-50">
                        {alert.vehicleNo}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {alert.vehicleType}
                      </div>
                    </td>
                    <td className="px-4 py-3">{alert.company ?? "-"}</td>
                    <td className="px-4 py-3 font-medium">
                      {alert.renewalLabel}
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
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          <FilePlus2 className="h-4 w-4" />
                          Create Invoice
                        </button>
                        <button
                          type="button"
                          onClick={() => onDismiss(alert)}
                          disabled={dismissing}
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
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

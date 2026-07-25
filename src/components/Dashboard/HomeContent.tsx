import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Globe2,
  HandCoins,
  IndianRupee,
  Truck,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import type { AppUser } from "@/lib/auth";
import { listVehicleRenewalAlerts } from "@/lib/fuel-tracker";
import type { VehicleRenewalAlert } from "@/lib/fuel-tracker/types";
import {
  getWarehouseDashboardSummary,
  listWarehousePaymentAlerts,
  type WarehouseDashboardSummary,
  type WarehousePaymentAlertRow,
} from "@/lib/warehouse/summary";
import { createAdminClient } from "@/lib/supabase/admin";
import { MetricCard, SectionCard } from "@/components/shared/DashboardUI";

const TIME_ZONE = "Asia/Kolkata";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hour12: false,
      timeZone: TIME_ZONE,
    }).format(now)
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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
  if (alert.daysUntilRenewal === 0) return "Due today";
  if (alert.daysUntilRenewal === 1) return "Due tomorrow";
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

function paymentDueText(dateValue: string, todayValue: string) {
  const due = new Date(`${dateValue}T00:00:00`);
  const today = new Date(`${todayValue}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (days <= 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function paymentDueClass(text: string) {
  return text === "Due today"
    ? "border-warning/25 bg-warning-soft text-warning-soft-fg"
    : "border-accent/25 bg-accent-soft text-accent-soft-fg";
}

type OutstandingLoan = {
  total_outstanding?: number;
  balance?: number;
};

async function getLoansOutstanding(): Promise<number | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_outstanding_loans");
    if (error || !Array.isArray(data)) return null;

    return (data as OutstandingLoan[]).reduce(
      (sum, loan) => sum + (loan.total_outstanding ?? loan.balance ?? 0),
      0
    );
  } catch {
    return null;
  }
}

function QuickAction({
  href,
  label,
  description,
  icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-edge bg-surface p-4 shadow-card transition-colors hover:border-accent/40 hover:bg-surface-2"
    >
      <span className="rounded-lg bg-accent-soft p-2 text-accent-soft-fg">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-fg">
          {label}
        </span>
        <span className="block truncate text-xs text-fg-muted">
          {description}
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export default async function HomeContent({ user }: { user: AppUser }) {
  const isAdmin = user.role === "admin";
  const now = new Date();
  const todayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
  }).format(now);

  const [alerts, warehouse, paymentAlerts, loansOutstanding] =
    await Promise.all([
      listVehicleRenewalAlerts().catch(
        () => [] as VehicleRenewalAlert[]
      ),
      isAdmin
        ? getWarehouseDashboardSummary().catch(
            () => null as WarehouseDashboardSummary | null
          )
        : Promise.resolve(null),
      isAdmin
        ? listWarehousePaymentAlerts().catch(
            () => [] as WarehousePaymentAlertRow[]
          )
        : Promise.resolve([] as WarehousePaymentAlertRow[]),
      isAdmin ? getLoansOutstanding() : Promise.resolve(null),
    ]);

  const displayName = user.fullName || user.username || user.email || "there";
  const shownAlerts = alerts.slice(0, 5);
  const shownPayments = paymentAlerts.slice(0, 5);

  return (
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Home
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">
            {greeting(now)}, {displayName}
          </h1>
          <p className="mt-1.5 text-sm text-fg-muted">
            {new Intl.DateTimeFormat("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: TIME_ZONE,
            }).format(now)}
          </p>
        </div>

        {isAdmin ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Warehouse Outstanding"
              value={
                warehouse ? formatCurrency(warehouse.totalOutstanding) : "—"
              }
              hint={
                warehouse ? `${warehouse.activePods} active PODs` : undefined
              }
              icon={<WarehouseIcon className="h-5 w-5" />}
            />
            <MetricCard
              label="Overdue / Pending"
              value={
                warehouse ? formatCurrency(warehouse.overduePending) : "—"
              }
              hint="Red status pod balances"
              icon={<AlertTriangle className="h-5 w-5" />}
            />
            <MetricCard
              label="Monthly Warehouse Charges"
              value={
                warehouse ? formatCurrency(warehouse.monthlyCharges) : "—"
              }
              hint="Current active rates"
              icon={<IndianRupee className="h-5 w-5" />}
            />
            <MetricCard
              label="Loans Outstanding"
              value={
                loansOutstanding === null
                  ? "—"
                  : formatCurrency(loansOutstanding)
              }
              hint="Current employee balances"
              icon={<HandCoins className="h-5 w-5" />}
            />
          </div>
        ) : null}

        <SectionCard
          title="Needs attention"
          description="Vehicle renewals due in the next 15 days or overdue."
          action={
            <Link
              href="/dashboard/fuel-tracker"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              Vehicle Tracker
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {shownAlerts.length === 0 ? (
            <div className="rounded-lg border border-success/25 bg-success-soft px-4 py-3 text-sm text-success-soft-fg">
              All clear — no vehicle renewals due in the next 15 days.
            </div>
          ) : (
            <ul className="space-y-2">
              {shownAlerts.map((alert) => (
                <li
                  key={`${alert.vehicleId}-${alert.renewalType}`}
                  className="flex flex-col gap-2 rounded-lg border border-edge bg-surface-2/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">
                      {alert.vehicleNo}
                      <span className="ml-2 font-normal text-fg-muted">
                        {alert.renewalLabel}
                      </span>
                    </p>
                    <p className="text-xs text-fg-muted">
                      {fmtDate(alert.renewalDate)}
                      {alert.renewalVendor ? ` · ${alert.renewalVendor}` : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${urgencyClass(
                      alert
                    )}`}
                  >
                    {urgencyText(alert)}
                  </span>
                </li>
              ))}
              {alerts.length > shownAlerts.length ? (
                <li className="px-1 pt-1 text-xs text-fg-muted">
                  +{alerts.length - shownAlerts.length} more in Vehicle
                  Tracker
                </li>
              ) : null}
            </ul>
          )}
        </SectionCard>

        {isAdmin ? (
          <SectionCard
            title="Upcoming warehouse payments"
            description="Pod payments due in the next 5 days."
            action={
              <Link
                href="/dashboard/warehouse"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                Payment Alerts
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {shownPayments.length === 0 ? (
              <div className="rounded-lg border border-success/25 bg-success-soft px-4 py-3 text-sm text-success-soft-fg">
                All clear — no pod payments due in the next 5 days.
              </div>
            ) : (
              <ul className="space-y-2">
                {shownPayments.map((row) => {
                  const dueText = paymentDueText(
                    row.next_payment_date,
                    todayIso
                  );

                  return (
                    <li
                      key={`${row.pod_id}-${row.next_payment_date}`}
                      className="flex flex-col gap-2 rounded-lg border border-edge bg-surface-2/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">
                          {row.name}
                          {row.company_name ? (
                            <span className="ml-2 font-normal text-fg-muted">
                              {row.company_name}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-fg-muted">
                          {fmtDate(row.next_payment_date)}
                          {row.location_name
                            ? ` · ${row.location_name}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums text-accent">
                          {formatCurrency(row.total_due)}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${paymentDueClass(
                            dueText
                          )}`}
                        >
                          {dueText}
                        </span>
                      </div>
                    </li>
                  );
                })}
                {paymentAlerts.length > shownPayments.length ? (
                  <li className="px-1 pt-1 text-xs text-fg-muted">
                    +{paymentAlerts.length - shownPayments.length} more in
                    Payment Alerts
                  </li>
                ) : null}
              </ul>
            )}
          </SectionCard>
        ) : null}

        <SectionCard
          title="Quick actions"
          description="Jump straight into the most common tasks."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <QuickAction
              href="/dashboard/domestic"
              label="Domestic quote"
              description="Household goods & vehicle transport"
              icon={<Calculator className="h-5 w-5" />}
            />
            <QuickAction
              href="/dashboard/international"
              label="International quote"
              description="Origin, freight & destination costs"
              icon={<Globe2 className="h-5 w-5" />}
            />
            <QuickAction
              href="/dashboard/fuel-tracker"
              label="Vehicle tracker"
              description="Fuel entries, expenses & renewals"
              icon={<Truck className="h-5 w-5" />}
            />
            {isAdmin ? (
              <>
                <QuickAction
                  href="/dashboard/warehouse"
                  label="Warehouse"
                  description="PODs, ledgers & payments"
                  icon={<WarehouseIcon className="h-5 w-5" />}
                />
                <QuickAction
                  href="/dashboard/loans"
                  label="Loans & advances"
                  description="Record a loan, advance, or repayment"
                  icon={<HandCoins className="h-5 w-5" />}
                />
              </>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

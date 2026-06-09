"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  Banknote,
  CalendarDays,
  CreditCard,
  IndianRupee,
  PackageCheck,
} from "lucide-react";
import { MetricCard } from "@/components/shared/DashboardUI";
import {
  listClosedWarehousePods,
  listWarehousePayments,
  listWarehousePods,
} from "@/lib/warehouse/pods";
import { getErrorMessage } from "@/lib/errors";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function LoadingValue({ width = "w-24" }: { width?: string }) {
  return (
    <span
      className={`block h-7 ${width} animate-pulse rounded bg-gray-100 dark:bg-gray-800`}
    />
  );
}

export default function WarehouseSummaryCards() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    activePods: 0,
    closedPods: 0,
    totalOutstanding: 0,
    monthlyCharges: 0,
    paymentsReceived: 0,
    overduePending: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [activePods, closedPods, payments] = await Promise.all([
          listWarehousePods({ status: "active", limit: 500 }),
          listClosedWarehousePods({ page: 1, pageSize: 1 }),
          listWarehousePayments({ page: 1, pageSize: 500 }),
        ]);

        if (cancelled) return;

        setSummary({
          activePods: activePods.length,
          closedPods: closedPods.meta.total,
          totalOutstanding: activePods.reduce(
            (sum, pod) => sum + Number(pod.total_due || 0),
            0
          ),
          monthlyCharges: activePods.reduce(
            (sum, pod) => sum + Number(pod.rate || 0),
            0
          ),
          paymentsReceived: payments.rows.reduce(
            (sum, row) => sum + Math.abs(Number(row.amount || 0)),
            0
          ),
          overduePending: activePods
            .filter((pod) => pod.severity_band === "red")
            .reduce((sum, pod) => sum + Math.max(Number(pod.total_due || 0), 0), 0),
        });
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(err) || "Unable to load warehouse summary");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Active PODs"
          value={loading ? <LoadingValue width="w-14" /> : summary.activePods}
          hint="Currently running storage"
          icon={<PackageCheck className="h-5 w-5" />}
        />
        <MetricCard
          label="Closed PODs"
          value={loading ? <LoadingValue width="w-14" /> : summary.closedPods}
          hint="Completed records"
          icon={<Archive className="h-5 w-5" />}
        />
        <MetricCard
          label="Total Outstanding"
          value={
            loading ? (
              <LoadingValue />
            ) : (
              formatCurrency(summary.totalOutstanding)
            )
          }
          hint="Active POD balances"
          icon={<IndianRupee className="h-5 w-5" />}
        />
        <MetricCard
          label="Monthly Charges"
          value={
            loading ? <LoadingValue /> : formatCurrency(summary.monthlyCharges)
          }
          hint="Current active rates"
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <MetricCard
          label="Payments Received"
          value={
            loading ? (
              <LoadingValue />
            ) : (
              formatCurrency(summary.paymentsReceived)
            )
          }
          hint="Latest payment records"
          icon={<CreditCard className="h-5 w-5" />}
        />
        <MetricCard
          label="Overdue / Pending"
          value={
            loading ? <LoadingValue /> : formatCurrency(summary.overduePending)
          }
          hint="Red status balances"
          icon={<Banknote className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}


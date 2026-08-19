"use client";

import { useEffect, useState } from "react";
import { IndianRupee, ReceiptText, TrendingDown, Users } from "lucide-react";
import { fetchLoanSummary } from "@/lib/loans-api";
import { MetricCard } from "@/components/shared/DashboardUI";
import { alertDanger } from "@/components/shared/ui";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function LoanSummaryCards() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalOutstanding: 0,
    activeEmployeesWithBalance: 0,
    totalGiven: 0,
    totalRepayments: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchLoanSummary();
        if (cancelled) return;
        setSummary({
          totalOutstanding: data.totalOutstanding,
          activeEmployeesWithBalance: data.activeEmployeesWithBalance,
          totalGiven: data.totalGiven,
          totalRepayments: data.totalRepayments,
        });
      } catch {
        if (!cancelled) setError("Unable to load loan summary");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = (amount: number) =>
    loading ? (
      <span className="block h-7 w-28 animate-pulse rounded bg-surface-2" />
    ) : (
      formatCurrency(amount)
    );

  return (
    <div className="space-y-3">
      {error ? (
        <div className={`${alertDanger} font-medium`}>
          {error}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Outstanding"
          value={value(summary.totalOutstanding)}
          hint="Current employee balance"
          icon={<IndianRupee className="h-5 w-5" />}
        />
        <MetricCard
          label="Active Employees with Balance"
          value={
            loading ? (
              <span className="block h-7 w-16 animate-pulse rounded bg-surface-2" />
            ) : (
              summary.activeEmployeesWithBalance
            )
          }
          hint="Employees with non-zero balance"
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          label="Total Loans/Advances Given"
          value={value(summary.totalGiven)}
          hint="Loan and advance entries"
          icon={<ReceiptText className="h-5 w-5" />}
        />
        <MetricCard
          label="Total Repayments Received"
          value={value(summary.totalRepayments)}
          hint="Repayment entries"
          icon={<TrendingDown className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}

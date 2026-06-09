"use client";

import { useEffect, useState } from "react";
import { IndianRupee, ReceiptText, TrendingDown, Users } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { MetricCard } from "@/components/shared/DashboardUI";

type OutstandingLoan = {
  total_outstanding?: number;
  balance?: number;
};

type TransactionRow = {
  amount: number;
  type: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getOutstandingValue(loan: OutstandingLoan) {
  return loan.total_outstanding ?? loan.balance ?? 0;
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

      const [outstandingResult, transactionsResult] = await Promise.all([
        supabase.rpc("get_outstanding_loans"),
        supabase.from("employee_loans").select("amount,type"),
      ]);

      if (cancelled) return;

      if (outstandingResult.error || transactionsResult.error) {
        setError("Unable to load loan summary");
        setLoading(false);
        return;
      }

      const outstandingRows =
        (outstandingResult.data as OutstandingLoan[] | null) ?? [];
      const transactions =
        (transactionsResult.data as TransactionRow[] | null) ?? [];

      setSummary({
        totalOutstanding: outstandingRows.reduce(
          (sum, row) => sum + getOutstandingValue(row),
          0
        ),
        activeEmployeesWithBalance: outstandingRows.filter(
          (row) => getOutstandingValue(row) !== 0
        ).length,
        totalGiven: transactions
          .filter((row) => row.type === "loan" || row.type === "advance")
          .reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0),
        totalRepayments: transactions
          .filter((row) => row.type === "repayment")
          .reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0),
      });

      setLoading(false);
    };

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = (amount: number) =>
    loading ? (
      <span className="block h-7 w-28 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
    ) : (
      formatCurrency(amount)
    );

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
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
              <span className="block h-7 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
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

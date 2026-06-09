"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import EmployeeHistoryView from "./EmployeeHistoryView";
import toast from "react-hot-toast";
import { Download, Eye, X } from "lucide-react";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  SectionCard,
} from "@/components/shared/DashboardUI";
import LoanSummaryCards from "./LoanSummaryCards";

interface EmployeeInfo {
  id: string;
  name: string;
  employee_code: string;
}

interface EmployeeLoanRow {
  id: string;
  employee_id: string;
  amount: number;
  type: string;
  remarks: string | null;
  created_at: string;
  payment_date: string;
  employee: EmployeeInfo | null;
}

type OutstandingLoan = {
  employee_id: string;
  name: string;
  employee_code: string;
  total_outstanding?: number;
  balance?: number;
  txn_count?: number;
  first_txn_date?: string;
  last_txn_date?: string;
};

export default function OutstandingLoansList() {
  const [loans, setLoans] = useState<OutstandingLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] =
    useState<OutstandingLoan | null>(null);

  // Download modal state
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchOutstandingLoans = async () => {
      setLoading(true);

      const { data, error } = await supabase.rpc("get_outstanding_loans");

      if (error) {
        console.error(error);
        toast.error("Error fetching loans");
      } else {
        setLoans((data || []) as OutstandingLoan[]);
      }

      setLoading(false);
    };

    fetchOutstandingLoans();
  }, []);

  // Helper to get numeric outstanding per employee regardless of field name
  const getOutstandingValue = (loan: OutstandingLoan) =>
    loan.total_outstanding ?? loan.balance ?? 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString("en-IN") : "-";

  // Download CSV of ALL transactions from employee_loans for date range
  const handleDownloadCsv = async () => {
    if (!fromDate || !toDate) {
      toast.error("Please select both From and To dates");
      return;
    }

    if (fromDate > toDate) {
      toast.error("From date cannot be after To date");
      return;
    }

    try {
      setIsDownloading(true);

      const { data, error } = await supabase
        .from("employee_loans")
        .select(
          `
          id,
          employee_id,
          amount,
          type,
          remarks,
          created_at,
          payment_date,
          employee:employee_id!inner (
            id,
            name,
            employee_code
          )
        `
        )

        .gte("payment_date", fromDate)
        .lte("payment_date", toDate)
        .order("payment_date", { ascending: true });

      if (error) {
        console.error(error);
        toast.error("Error fetching transactions for export");
        return;
      }

      const rows: EmployeeLoanRow[] = (data ??
        []) as unknown as EmployeeLoanRow[];

      if (rows.length === 0) {
        toast("No transactions found in this date range");
        return;
      }

      const header = [
        "Employee Code",
        "Employee Name",
        "Type",
        "Amount",
        "Payment Date",
        "Created At",
        "Remarks",
      ];

      const escapeCsv = (value: unknown): string => {
        if (value === null || value === undefined) return "";
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvLines = [
        header.join(","),
        ...rows.map((row) =>
          [
            row.employee?.employee_code ?? "",
            row.employee?.name ?? "",
            row.type,
            row.amount,
            row.payment_date,
            row.created_at,
            row.remarks ?? "",
          ]
            .map(escapeCsv)
            .join(",")
        ),
      ];

      const csvContent = csvLines.join("\n");
      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const filename = `employee_loans_${fromDate}_${toDate}.csv`;

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("CSV download started");
      setIsDownloadModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Unexpected error while generating CSV");
    } finally {
      setIsDownloading(false);
    }
  };

  if (selectedEmployee) {
    return (
      <EmployeeHistoryView
        employee={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <PageHeader
            eyebrow="Finance"
            title="Loans & Advances"
            subtitle="Track employee loans, advances, repayments, and outstanding balances."
          />
          <LoadingState label="Loading outstanding balances" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Finance"
          title="Loans & Advances"
          subtitle="Track employee loans, advances, repayments, and outstanding balances."
          action={
            <button
              type="button"
              onClick={() => setIsDownloadModalOpen(true)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
          }
        />

        <LoanSummaryCards />

        <SectionCard
          title="View Total Outstanding"
          description="Review each employee balance and open transaction history."
        >
          {loans.length === 0 ? (
            <EmptyState
              title="No outstanding balances"
              description="Employees with active loan or advance balances will appear here."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="min-w-[820px] w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                  <tr>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Employee Name
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold dark:border-gray-800">
                      Total Outstanding
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Last Transaction Date
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Transaction Count
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold dark:border-gray-800">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {loans.map((loan) => {
                    const outstanding = getOutstandingValue(loan);
                    return (
                      <tr
                        key={loan.employee_id}
                        className="bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-950 dark:text-gray-50">
                              {loan.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {loan.employee_code}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-semibold tabular-nums ${
                              outstanding > 0
                                ? "text-blue-700 dark:text-blue-300"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {formatCurrency(outstanding)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {formatDate(loan.last_txn_date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                            {loan.txn_count ?? 0} transactions
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedEmployee(loan)}
                            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            <Eye className="h-4 w-4" />
                            View History
                          </button>
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

      {/* Download modal */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-950">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
                  Download Transactions
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Export all transactions in a selected date range.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                disabled={isDownloading}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  From date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  To date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                disabled={isDownloading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDownloading}
              >
                <Download className="h-4 w-4" />
                {isDownloading ? "Downloading..." : "Download"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

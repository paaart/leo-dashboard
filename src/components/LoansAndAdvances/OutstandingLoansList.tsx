"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import EmployeeHistoryView from "./EmployeeHistoryView";
import toast from "react-hot-toast";

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

  // Total outstanding across all employees
  const totalOutstanding = loans.reduce(
    (sum, loan) => sum + getOutstandingValue(loan),
    0
  );

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen mx-auto p-8 bg-white dark:bg-[#23272f] rounded shadow relative">
      {/* Header: title + total + download */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold">Outstanding Loans</h2>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          {/* Total outstanding card */}
          <div className="rounded-lg bg-gray-100 dark:bg-gray-700 px-4 py-2 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">
              Total Outstanding
            </p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              ₹{totalOutstanding.toFixed(2)}
            </p>
          </div>

          {/* Download button */}
          <button
            onClick={() => setIsDownloadModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[#23272f]"
          >
            Download CSV
          </button>
        </div>
      </div>

      {loans.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">
          No outstanding loans.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {loans.map((loan) => {
            const outstanding = getOutstandingValue(loan);
            return (
              <li
                key={loan.employee_id}
                className="py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 px-2 rounded"
                onClick={() => setSelectedEmployee(loan)}
              >
                <div>
                  <p className="font-medium">
                    {loan.employee_code} - {loan.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-blue-600 dark:text-blue-400 font-semibold">
                    ₹{outstanding.toFixed(2)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Download modal */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-[#1f2933]">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Download Transactions (CSV)
            </h3>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600 dark:text-gray-300">
                  From date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-[#111827] dark:text-gray-100"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600 dark:text-gray-300">
                  To date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-[#111827] dark:text-gray-100"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                disabled={isDownloading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isDownloading}
              >
                {isDownloading ? "Downloading..." : "Download"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

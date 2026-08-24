"use client";

import { useEffect, useState } from "react";
import {
  fetchLoanTransactions,
  fetchOutstandingLoans,
} from "@/lib/loans-api";
import { EmployeeSearchSelect } from "@/lib/EmployeeSearchSelect";
import EmployeeHistoryView from "./EmployeeHistoryView";
import toast from "react-hot-toast";
import { Download, Eye, X } from "lucide-react";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  SectionCard,
} from "@/components/shared/DashboardUI";
import {
  badgeClass,
  buttonPrimary,
  buttonSecondary,
  iconButton,
  inputField,
  modalOverlay,
  modalPanel,
  modalTitle,
  tableHead,
  tableHeadCell,
  tableWrapper,
} from "@/components/shared/ui";
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
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] =
    useState<OutstandingLoan | null>(null);

  // Download modal state
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const loadOutstandingLoans = async () => {
      setLoading(true);

      try {
        const data = await fetchOutstandingLoans();
        setLoans(data as unknown as OutstandingLoan[]);
      } catch (error) {
        console.error(error);
        toast.error("Error fetching loans");
      } finally {
        setLoading(false);
      }
    };

    void loadOutstandingLoans();
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

  const filteredLoans = employeeFilter
    ? loans.filter((loan) => loan.employee_id === employeeFilter)
    : loans;

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

      const rows = (await fetchLoanTransactions({
        fromDate,
        toDate,
        limit: 5000,
        order: "asc",
      })) as unknown as EmployeeLoanRow[];

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
      <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
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
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Finance"
          title="Loans & Advances"
          subtitle="Track employee loans, advances, repayments, and outstanding balances."
          action={
            <button
              type="button"
              onClick={() => setIsDownloadModalOpen(true)}
              className={buttonSecondary}
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
            <>
              <div className="mb-5 max-w-xl">
                <EmployeeSearchSelect
                  employees={loans.map((loan) => ({
                    id: loan.employee_id,
                    name: loan.name,
                    employee_code: loan.employee_code,
                  }))}
                  value={employeeFilter}
                  onChange={setEmployeeFilter}
                  label="Search employee"
                  placeholder="Type an employee name or code..."
                  clearSelectionLabel="Show all employees"
                />
              </div>

              {filteredLoans.length === 0 ? (
                <EmptyState
                  title="No matching employees"
                  description="Try a different employee name or employee code."
                />
              ) : (
                <div className={tableWrapper}>
                  <table className="min-w-[820px] w-full text-sm">
                    <thead className={tableHead}>
                      <tr>
                        <th className={`${tableHeadCell} text-left`}>
                          Employee Name
                        </th>
                        <th className={`${tableHeadCell} text-right`}>
                          Total Outstanding
                        </th>
                        <th className={`${tableHeadCell} text-left`}>
                          Last Transaction Date
                        </th>
                        <th className={`${tableHeadCell} text-left`}>
                          Transaction Count
                        </th>
                        <th className={`${tableHeadCell} text-right`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-edge">
                      {filteredLoans.map((loan) => {
                        const outstanding = getOutstandingValue(loan);
                        return (
                          <tr
                            key={loan.employee_id}
                            className="bg-surface transition-colors hover:bg-surface-2/60"
                          >
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-fg">
                                  {loan.name}
                                </p>
                                <p className="text-xs text-fg-muted">
                                  {loan.employee_code}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`font-semibold tabular-nums ${
                                  outstanding > 0
                                    ? "text-accent"
                                    : "text-fg-muted"
                                }`}
                              >
                                {formatCurrency(outstanding)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-fg-muted">
                              {formatDate(loan.last_txn_date)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={badgeClass("neutral")}>
                                {loan.txn_count ?? 0} transactions
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedEmployee(loan)}
                                className={buttonSecondary}
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
            </>
          )}
        </SectionCard>
      </div>

      {/* Download modal */}
      {isDownloadModalOpen && (
        <div className={modalOverlay}>
          <div className={`${modalPanel} max-h-[90vh] max-w-md overflow-y-auto p-5`}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className={modalTitle}>
                  Download Transactions
                </h3>
                <p className="mt-1 text-sm text-fg-muted">
                  Export all transactions in a selected date range.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                disabled={isDownloading}
                className={`${iconButton} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg">
                  From date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={`${inputField} h-10`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg">
                  To date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={`${inputField} h-10`}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className={buttonSecondary}
                disabled={isDownloading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className={buttonPrimary}
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

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  deleteLoanEntry,
  fetchEmployee,
  fetchLoanTransactions,
} from "@/lib/loans-api";
import toast from "react-hot-toast";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  SectionCard,
} from "@/components/shared/DashboardUI";
import {
  buttonDangerSoft,
  buttonSecondary,
  tableHead,
  tableHeadCell,
  tableWrapper,
} from "@/components/shared/ui";

type Props = {
  employee: {
    employee_id: string; // employees.id
    name: string;
    employee_code: string;
  };
  onBack: () => void;
};

type Transaction = {
  id: string;
  amount: number;
  type: "loan" | "repayment" | "advance";
  remarks: string | null;
  payment_date: string;
  created_at: string;
};

type EmployeeData = {
  id: string;
  name: string;
  employee_code: string;
  company?: { name: string } | null;
  location?: { name: string } | null;
};

export default function EmployeeHistoryView({ employee, onBack }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // pagination
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // NEW: employee company/location
  const [empMeta, setEmpMeta] = useState<EmployeeData | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);

  // Load employee company/location once
  useEffect(() => {
    const fetchMeta = async () => {
      setMetaLoading(true);
      try {
        const data = await fetchEmployee(employee.employee_id);
        setEmpMeta(data as EmployeeData);
      } catch {
        toast.error("Failed to load employee details");
        setEmpMeta(null);
      } finally {
        setMetaLoading(false);
      }
    };

    fetchMeta();
  }, [employee.employee_id]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLoanTransactions({
        employeeId: employee.employee_id,
        limit: pageSize,
        offset: page * pageSize,
      });
      setTransactions(data as unknown as Transaction[]);
    } catch {
      toast.error("Error fetching loan history");
    } finally {
      setLoading(false);
    }
  }, [employee.employee_id, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    setDeletingId(id);

    const run = () => deleteLoanEntry(id);

    try {
      await toast.promise(run(), {
        loading: "Deleting...",
        success: "Transaction deleted",
        error: "Failed to delete transaction",
      });

      if (transactions.length === 1 && page > 0) setPage((p) => p - 1);
      else fetchHistory();
    } finally {
      setDeletingId(null);
    }
  };

  const companyName = empMeta?.company?.name ?? "—";
  const locationName = empMeta?.location?.name ?? "—";
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Math.abs(value));

  const typeBadgeClass = (type: Transaction["type"]) =>
    type === "repayment"
      ? "border-success/25 bg-success-soft text-success-soft-fg"
      : "border-accent/25 bg-accent-soft text-accent-soft-fg";

  return (
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Finance"
          title="Transaction History"
          subtitle={`${employee.employee_code} - ${employee.name}`}
          action={
            <button
              type="button"
              onClick={onBack}
              className={buttonSecondary}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          }
        />

        <SectionCard
          title="Employee Details"
          description="Company and location details for this employee."
        >
          <div className="flex flex-wrap items-center gap-2">
            {metaLoading ? (
              <span className="inline-flex rounded-full border border-edge bg-surface-2 px-3 py-1 text-sm text-fg-muted">
                Loading details...
              </span>
            ) : (
              <>
                <span className="inline-flex items-center rounded-full border border-edge bg-surface-2 px-3 py-1 text-xs font-medium text-fg-muted">
                  Company: {companyName}
                </span>
                <span className="inline-flex items-center rounded-full border border-edge bg-surface-2 px-3 py-1 text-xs font-medium text-fg-muted">
                  Location: {locationName}
                </span>
              </>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Transaction History"
          description="Loans and advances increase outstanding balance; repayments reduce it."
        >
          {loading ? (
            <LoadingState label="Loading transactions" />
          ) : transactions.length === 0 ? (
            <EmptyState
              title="No transactions"
              description="Loan, advance, and repayment entries for this employee will appear here."
            />
          ) : (
            <>
              <div className={tableWrapper}>
                <table className="min-w-[780px] w-full text-sm">
                  <thead className={tableHead}>
                    <tr>
                      <th className={`${tableHeadCell} text-left`}>
                        Date
                      </th>
                      <th className={`${tableHeadCell} text-left`}>
                        Employee
                      </th>
                      <th className={`${tableHeadCell} text-left`}>
                        Type
                      </th>
                      <th className={`${tableHeadCell} text-right`}>
                        Amount
                      </th>
                      <th className={`${tableHeadCell} text-left`}>
                        Remarks
                      </th>
                      <th className={`${tableHeadCell} text-right`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge">
                    {transactions.map((txn) => (
                      <tr
                        key={txn.id}
                        className="bg-surface transition-colors hover:bg-surface-2/60"
                      >
                        <td className="px-4 py-3 text-fg-muted">
                          {new Date(txn.payment_date).toLocaleDateString(
                            "en-IN",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-fg">
                            {employee.name}
                          </p>
                          <p className="text-xs text-fg-muted">
                            {employee.employee_code}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${typeBadgeClass(
                              txn.type
                            )}`}
                          >
                            {txn.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-semibold tabular-nums ${
                              txn.amount > 0
                                ? "text-accent"
                                : "text-success"
                            }`}
                          >
                            {formatCurrency(txn.amount)}
                          </span>
                        </td>
                        <td className="max-w-xs px-4 py-3 text-fg-muted">
                          <span className="line-clamp-2">
                            {txn.remarks || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(txn.id)}
                            disabled={deletingId === txn.id}
                            className={buttonDangerSoft}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingId === txn.id ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className={buttonSecondary}
                >
                  Previous
                </button>
                <span className="text-center text-sm text-fg-muted">
                  Page {page + 1}
                </span>
                <button
                  type="button"
                  disabled={transactions.length < pageSize}
                  onClick={() => setPage((p) => p + 1)}
                  className={buttonSecondary}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

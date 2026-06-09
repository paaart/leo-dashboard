"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  SectionCard,
} from "@/components/shared/DashboardUI";

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
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          id, name, employee_code,
          company:company_id ( name ),
          location:location_id ( name )
        `
        )
        .eq("id", employee.employee_id)
        .single();

      if (error) {
        toast.error("Failed to load employee details");
        setEmpMeta(null);
      } else {
        setEmpMeta(data as unknown as EmployeeData);
      }
      setMetaLoading(false);
    };

    fetchMeta();
  }, [employee.employee_id]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("employee_loans")
      .select("id, amount, type, remarks, payment_date, created_at")
      .eq("employee_id", employee.employee_id)
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (error) {
      toast.error("Error fetching loan history");
    } else {
      setTransactions(data ?? []);
    }
    setLoading(false);
  }, [employee.employee_id, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    setDeletingId(id);

    const run = async () => {
      const { error } = await supabase
        .from("employee_loans")
        .delete()
        .eq("id", id);
      if (error) throw error;
    };

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
      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300"
      : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";

  return (
    <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Finance"
          title="Transaction History"
          subtitle={`${employee.employee_code} - ${employee.name}`}
          action={
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
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
              <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                Loading details...
              </span>
            ) : (
              <>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                  Company: {companyName}
                </span>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
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
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="min-w-[780px] w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                    <tr>
                      <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                        Date
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                        Employee
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                        Type
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold dark:border-gray-800">
                        Amount
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                        Remarks
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold dark:border-gray-800">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {transactions.map((txn) => (
                      <tr
                        key={txn.id}
                        className="bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                      >
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
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
                          <p className="font-medium text-gray-950 dark:text-gray-50">
                            {employee.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
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
                                ? "text-blue-700 dark:text-blue-300"
                                : "text-green-700 dark:text-green-300"
                            }`}
                          >
                            {formatCurrency(txn.amount)}
                          </span>
                        </td>
                        <td className="max-w-xs px-4 py-3 text-gray-500 dark:text-gray-400">
                          <span className="line-clamp-2">
                            {txn.remarks || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(txn.id)}
                            disabled={deletingId === txn.id}
                            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
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
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Previous
                </button>
                <span className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Page {page + 1}
                </span>
                <button
                  type="button"
                  disabled={transactions.length < pageSize}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
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

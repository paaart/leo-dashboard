"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
// optional: a trash icon
import { Trash2 } from "lucide-react";

type Props = {
  employee: {
    employee_id: string;
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

export default function EmployeeHistoryView({ employee, onBack }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // pagination (you already added this earlier)
  const [page, setPage] = useState(0);
  const pageSize = 25;

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

  return (
    <div className="min-h-screen mx-auto p-8 bg-white dark:bg-[#23272f] rounded shadow">
      <button
        onClick={onBack}
        className="text-sm text-blue-600 hover:underline mb-4"
      >
        ← Back to Outstanding List
      </button>

      <h2 className="text-xl font-semibold mb-1">
        {employee.employee_code} - {employee.name}
      </h2>
      <p className="text-sm text-gray-500 mb-4">Loan History</p>

      {loading ? (
        <p className="text-gray-600 dark:text-gray-300">Loading...</p>
      ) : transactions.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">
          No transactions found.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((txn) => (
              <li
                key={txn.id}
                className="py-3 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium capitalize">{txn.type}</p>
                  {txn.remarks && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                      {txn.remarks}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        txn.amount > 0
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      ₹{Math.abs(txn.amount).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(txn.payment_date).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(txn.id)}
                    disabled={deletingId === txn.id}
                    className="shrink-0 inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 text-red-600 disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {deletingId === txn.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex justify-between mt-4">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="text-sm text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              disabled={transactions.length < pageSize}
              onClick={() => setPage((p) => p + 1)}
              className="text-sm text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

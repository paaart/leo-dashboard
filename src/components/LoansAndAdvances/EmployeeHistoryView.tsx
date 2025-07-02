"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

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
  type: "loan" | "repayment";
  remarks: string | null;
  created_at: string;
};

export default function EmployeeHistoryView({ employee, onBack }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("employee_loans")
        .select("id, amount, type, remarks, created_at")
        .eq("employee_id", employee.employee_id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Error fetching loan history");
      } else {
        setTransactions(data);
      }

      setLoading(false);
    };

    fetchHistory();
  }, [employee.employee_id]);

  return (
    <div className="min-h-screen mx-auto p-8 bg-white dark:bg-[#23272f] rounded shadow h">
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
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {transactions.map((txn) => (
            <li key={txn.id} className="py-3 flex justify-between items-start">
              <div>
                <p className="font-medium capitalize">{txn.type}</p>
                {txn.remarks && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {txn.remarks}
                  </p>
                )}
              </div>
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
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {new Date(txn.created_at).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

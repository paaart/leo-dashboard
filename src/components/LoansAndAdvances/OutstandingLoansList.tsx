"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import EmployeeHistoryView from "./EmployeeHistoryView";
import toast from "react-hot-toast";

type OutstandingLoan = {
  employee_id: string;
  name: string;
  employee_code: string;
  total_outstanding: number;
};

export default function OutstandingLoansList() {
  const [loans, setLoans] = useState<OutstandingLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] =
    useState<OutstandingLoan | null>(null);

  useEffect(() => {
    const fetchOutstandingLoans = async () => {
      setLoading(true);

      const { data, error } = await supabase.rpc("get_outstanding_loans");

      if (error) {
        toast.error("Error fetching loans");
      } else {
        setLoans(data);
      }

      setLoading(false);
    };

    fetchOutstandingLoans();
  }, []);

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
    <div className="min-h-screen mx-auto p-8 bg-white dark:bg-[#23272f] rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Outstanding Loans</h2>

      {loading ? (
        <p className="text-gray-600 dark:text-gray-300">Loading...</p>
      ) : loans.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">
          No outstanding loans.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {loans.map((loan) => (
            <li
              key={loan.employee_id}
              className="py-3 flex justify-between items-center  cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 px-2 rounded"
              onClick={() => setSelectedEmployee(loan)}
            >
              <div>
                <p className="font-medium">
                  {loan.employee_code} - {loan.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-blue-600 dark:text-blue-400 font-semibold">
                  ₹{loan.total_outstanding.toFixed(2)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

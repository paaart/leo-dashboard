"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { EmployeeSearchSelect } from "@/lib/EmployeeSearchSelect";
import { PageHeader, SectionCard } from "@/components/shared/DashboardUI";
import LoanSummaryCards from "./LoanSummaryCards";

// ✅ keep the same Employee type as above
type Employee = {
  id: string;
  name: string;
  employee_code: string;
};

export default function LoanEntryForm() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [type, setType] = useState<"loan" | "repayment" | "advance">("loan");
  const [remarks, setRemarks] = useState("");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, employee_code")
        .eq("display", true)
        .order("created_at", { ascending: true });

      if (data) setEmployees(data);
      if (error) console.error("Error fetching employees", error);
    };

    fetchEmployees();
  }, []);

  const handleSubmit = async () => {
    if (!selectedEmployee || !amount || isNaN(Number(amount))) {
      setValidationError("Please select an employee and enter a valid amount.");
      return;
    }

    setValidationError(null);
    setLoading(true);

    const numericAmount =
      type === "loan" || type === "advance" ? Number(amount) : -Number(amount);

    const { error } = await supabase.from("employee_loans").insert({
      employee_id: selectedEmployee,
      amount: numericAmount,
      type,
      remarks,
      payment_date: date,
    });

    console.log("Submitting data:", {
      selectedEmployee,
      amount,
      type,
      remarks,
      date,
    });

    if (error) {
      toast.error("Failed to record entry");
    } else {
      toast.success(`Successfully recorded ${type}.`);
      setAmount("");
      setType("loan");
      setRemarks("");
      setDate(new Date().toISOString().split("T")[0]);
      // I’m leaving selectedEmployee as-is so they can add multiple entries
    }

    setLoading(false);
  };

  return (
    <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Finance"
          title="Loans & Advances"
          subtitle="Track employee loans, advances, repayments, and outstanding balances."
        />

        <LoanSummaryCards />

        {validationError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {validationError}
          </div>
        ) : null}

        <SectionCard
          title="Create Loan / Advance Entry"
          description="Record a loan, advance, or repayment against an employee ledger."
        >
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <EmployeeSearchSelect
                employees={employees}
                value={selectedEmployee}
                onChange={setSelectedEmployee}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                  Remarks
                </label>
                <textarea
                  className="min-h-28 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-500"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional context for this transaction"
                />
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                  Transaction Type
                </label>
                <div className="grid gap-3">
                  {(["loan", "advance", "repayment"] as const).map(
                    (option) => (
                      <label
                        key={option}
                        className="flex min-h-12 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm font-medium capitalize text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                      >
                        <input
                          type="radio"
                          name="type"
                          value={option}
                          checked={type === option}
                          onChange={() => setType(option)}
                          className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-700"
                        />
                        {option}
                      </label>
                    )
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                    Amount
                  </label>
                  <input
                    type="number"
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                    Date
                  </label>
                  <input
                    type="date"
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Repayments are recorded using the existing negative amount
              behavior.
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Submit Entry"}
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

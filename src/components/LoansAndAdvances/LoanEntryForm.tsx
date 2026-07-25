"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { EmployeeSearchSelect } from "@/lib/EmployeeSearchSelect";
import { PageHeader, SectionCard } from "@/components/shared/DashboardUI";
import {
  alertDanger,
  buttonPrimary,
  inputField,
} from "@/components/shared/ui";
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
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Finance"
          title="Loans & Advances"
          subtitle="Track employee loans, advances, repayments, and outstanding balances."
        />

        <LoanSummaryCards />

        {validationError ? (
          <div className={`${alertDanger} font-medium`}>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-fg">
                    Amount
                  </label>
                  <input
                    type="number"
                    className={`${inputField} h-10`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-fg">
                    Date
                  </label>
                  <input
                    type="date"
                    className={`${inputField} h-10`}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-fg">
                  Remarks
                </label>
                <textarea
                  className={`${inputField} min-h-28`}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional context for this transaction"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-fg">
                Transaction Type
              </label>
              <div className="grid gap-3">
                {(["loan", "advance", "repayment"] as const).map(
                  (option) => (
                    <label
                      key={option}
                      className="flex min-h-12 items-center gap-3 rounded-lg border border-edge bg-surface-2 px-4 text-sm font-medium capitalize text-fg-muted"
                    >
                      <input
                        type="radio"
                        name="type"
                        value={option}
                        checked={type === option}
                        onChange={() => setType(option)}
                        className="h-4 w-4 border-edge-strong text-accent focus:ring-accent"
                      />
                      {option}
                    </label>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-edge pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-fg-muted">
              Repayments are recorded using the existing negative amount
              behavior.
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={buttonPrimary}
            >
              {loading ? "Saving..." : "Submit Entry"}
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

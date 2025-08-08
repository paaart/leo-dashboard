"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

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
    if (!selectedEmployee || !amount || isNaN(Number(amount))) return;

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
    }

    setLoading(false);
  };

  return (
    <div className="mx-auto bg-white dark:bg-[#23272f] p-6 rounded shadow min-h-screen">
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Create Loan / Repayment</h2>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Employee</label>
          <select
            className="w-full p-2 border rounded bg-white dark:bg-gray-800"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="">-- Select Employee --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.employee_code} - {emp.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Amount (₹)</label>
          <input
            type="number"
            className="w-full p-2 border rounded bg-white dark:bg-gray-800"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Type</label>
          <div className="flex gap-4">
            <label>
              <input
                type="radio"
                name="type"
                value="loan"
                checked={type === "loan"}
                onChange={() => setType("loan")}
                className="mr-1"
              />
              Loan
            </label>
            <label>
              <input
                type="radio"
                name="type"
                value="advance"
                checked={type === "advance"}
                onChange={() => setType("advance")}
                className="mr-1"
              />
              Advance
            </label>
            <label>
              <input
                type="radio"
                name="type"
                value="repayment"
                checked={type === "repayment"}
                onChange={() => setType("repayment")}
                className="mr-1"
              />
              Repayment
            </label>
          </div>
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Date</label>
          <input
            type="date"
            className="w-full p-2 border rounded bg-white dark:bg-gray-800"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]} // optional: prevent future dates
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Remarks (optional)</label>
          <textarea
            className="w-full p-2 border rounded bg-white dark:bg-gray-800"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          {loading ? "Saving..." : "Submit"}
        </button>
      </div>
    </div>
  );
}

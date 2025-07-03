"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

type Employee = {
  id: string;
  name: string;
  employee_code: string;
  created_at: string;
};

export default function ManageEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Error fetching employees");
      } else {
        setEmployees(data);
      }
      setLoading(false);
    };

    fetchEmployees();
  }, [refresh]);

  const handleAdd = async () => {
    if (!name.trim()) return;

    const promise = async () => {
      const { error } = await supabase.from("employees").insert({
        name,
        employee_code: employeeCode,
      });
      if (error) throw new Error("Insert failed");
      return true;
    };

    toast
      .promise(promise(), {
        loading: "Adding employee...",
        success: "Employee added successfully",
        error: "Error adding employee",
      })
      .then(() => {
        setName("");
        setEmployeeCode("");
        setRefresh((r) => r + 1);
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 opacity-20 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className=" mx-auto p-8 bg-white dark:bg-[#23272f] rounded shadow min-h-screen">
      <h2 className="text-xl font-semibold mb-4">Add New Employee</h2>

      <div className="mb-6">
        <label className="block mb-1 mt-1 font-medium">Name</label>
        <input
          type="text"
          className="w-full p-2 border rounded bg-white dark:bg-gray-800"
          placeholder="Employee Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="block mb-1 mt-1 font-medium">Employee Code</label>
        <input
          type="text"
          className="w-full p-2 border rounded bg-white dark:bg-gray-800"
          placeholder="e.g. EMP015"
          value={employeeCode}
          onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
        />
        <button
          onClick={handleAdd}
          disabled={loading || !name.trim() || !employeeCode.trim()}
          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-30"
        >
          {loading ? "Adding..." : "Add Employee"}
        </button>
      </div>

      <h3 className="text-lg font-semibold mb-2">Current Employees</h3>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {employees.map((emp) => (
          <li key={emp.id} className="py-2 flex justify-between items-center">
            <div>
              <p className="font-medium">{emp.name}</p>
              <p className="text-sm text-gray-500">{emp.employee_code}</p>
            </div>
            <p className="text-xs text-gray-400">
              {new Date(emp.created_at).toLocaleDateString("en-IN")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

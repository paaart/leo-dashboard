"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

type Option = { id: number; name: string; is_active?: boolean };

type Employee = {
  id: string;
  name: string;
  employee_code: string;
  created_at: string;
  company_id: number | null;
  location_id: number | null;
  company?: { id: number; name: string } | null;
  location?: { id: number; name: string } | null;
};

export default function ManageEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);

  // Add form
  const [name, setName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [companyId, setCompanyId] = useState<number | "">("");
  const [locationId, setLocationId] = useState<number | "">("");

  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);

  // For quick per-row saving state
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      // Load fixed lists
      const [{ data: comp, error: compErr }, { data: loc, error: locErr }] =
        await Promise.all([
          supabase
            .from("companies")
            .select("id,name,is_active")
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("locations")
            .select("id,name,is_active")
            .eq("is_active", true)
            .order("name"),
        ]);

      if (compErr || locErr) {
        toast.error("Failed to load dropdown options");
      } else {
        setCompanies((comp ?? []) as Option[]);
        setLocations((loc ?? []) as Option[]);
      }

      // Load employees with relation labels (requires FKs)
      const { data: emps, error: empErr } = await supabase
        .from("employees")
        .select(
          `
          id, name, employee_code, created_at, company_id, location_id,
          company:company_id ( id, name ),
          location:location_id ( id, name )
        `
        )
        .eq("display", true)
        .order("created_at", { ascending: false });

      if (empErr) {
        toast.error("Error fetching employees");
        setEmployees([]);
      } else {
        setEmployees((emps ?? []) as unknown as Employee[]);
      }

      setLoading(false);
    };

    fetchAll();
  }, [refresh]);

  const codeExists = useMemo(() => {
    const set = new Set(employees.map((e) => e.employee_code));
    return (code: string) => set.has(code);
  }, [employees]);

  const handleAdd = async () => {
    if (!name.trim() || !employeeCode.trim()) return;

    const normalizedCode = employeeCode.toUpperCase().trim();

    const promise = async () => {
      // Frontend duplicate check for nicer UX
      // Also trust DB UNIQUE constraint as final guard
      if (codeExists(normalizedCode)) {
        throw new Error("Employee code already exists");
      }

      // Server-side check (optional extra)
      const { data: existing, error: fetchError } = await supabase
        .from("employees")
        .select("id")
        .eq("employee_code", normalizedCode)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw new Error("Error checking employee code");
      }
      if (existing) throw new Error("Employee code already exists");

      const payload = {
        name: name.trim(),
        employee_code: normalizedCode,
        company_id: companyId === "" ? null : Number(companyId),
        location_id: locationId === "" ? null : Number(locationId),
      };

      const { error: insertError } = await supabase
        .from("employees")
        .insert(payload);
      if (insertError) throw new Error(insertError.message || "Insert failed");

      return true;
    };

    toast
      .promise(promise(), {
        loading: "Adding employee...",
        success: "Employee added successfully",
        error: (err) => err.message || "Error adding employee",
      })
      .then(() => {
        setName("");
        setEmployeeCode("");
        setCompanyId("");
        setLocationId("");
        setRefresh((r) => r + 1);
      });
  };

  const saveRow = async (row: Employee) => {
    setSavingRowId(row.id);
    const { error } = await supabase
      .from("employees")
      .update({
        company_id: row.company_id,
        location_id: row.location_id,
      })
      .eq("id", row.id);

    setSavingRowId(null);
    if (error) {
      toast.error(error.message || "Failed to update employee");
    } else {
      toast.success("Updated");
      setRefresh((r) => r + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#23272f] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto p-8 bg-white dark:bg-[#23272f] rounded shadow min-h-screen">
      <h2 className="text-xl font-semibold mb-4">Add New Employee</h2>

      <div className="mb-6 grid gap-2 max-w-xl">
        <label className="block font-medium">Name</label>
        <input
          type="text"
          className="w-full p-2 border rounded bg-white dark:bg-gray-800"
          placeholder="Employee Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="block font-medium mt-2">Employee Code</label>
        <input
          type="text"
          className="w-full p-2 border rounded bg-white dark:bg-gray-800"
          placeholder="e.g. EMP015"
          value={employeeCode}
          onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
        />

        <label className="block font-medium mt-2">Company</label>
        <select
          className="w-full p-2 border rounded bg-white dark:bg-gray-800"
          value={companyId}
          onChange={(e) =>
            setCompanyId(e.target.value ? Number(e.target.value) : "")
          }
        >
          <option value="">Select company</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <label className="block font-medium mt-2">Location</label>
        <select
          className="w-full p-2 border rounded bg-white dark:bg-gray-800"
          value={locationId}
          onChange={(e) =>
            setLocationId(e.target.value ? Number(e.target.value) : "")
          }
        >
          <option value="">Select location</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleAdd}
          disabled={loading || !name.trim() || !employeeCode.trim()}
          className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-30"
        >
          Add Employee
        </button>
      </div>

      <h3 className="text-lg font-semibold mb-2">Current Employees</h3>

      <div className="overflow-auto">
        <table className="min-w-[820px] w-full border border-gray-200 dark:border-gray-700 rounded">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Code</th>
              <th className="p-2 text-left">Company</th>
              <th className="p-2 text-left">Location</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {employees.map((emp, idx) => (
              <tr key={emp.id}>
                <td className="p-2 font-medium">{emp.name}</td>
                <td className="p-2 text-sm text-gray-600 dark:text-gray-300">
                  {emp.employee_code}
                </td>
                <td className="p-2">
                  <select
                    className="w-full p-1 border rounded bg-white dark:bg-gray-800"
                    value={emp.company_id ?? ""}
                    onChange={(e) => {
                      const v = e.target.value ? Number(e.target.value) : null;
                      setEmployees((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, company_id: v } : row
                        )
                      );
                    }}
                  >
                    <option value="">Select</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <select
                    className="w-full p-1 border rounded bg-white dark:bg-gray-800"
                    value={emp.location_id ?? ""}
                    onChange={(e) => {
                      const v = e.target.value ? Number(e.target.value) : null;
                      setEmployees((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, location_id: v } : row
                        )
                      );
                    }}
                  >
                    <option value="">Select</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2 text-xs text-gray-500">
                  {new Date(emp.created_at).toLocaleDateString("en-IN")}
                </td>
                <td className="p-2">
                  <button
                    onClick={() => saveRow(emp)}
                    disabled={savingRowId === emp.id}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
                  >
                    {savingRowId === emp.id ? "Saving..." : "Save"}
                  </button>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td className="p-4 text-sm text-gray-500" colSpan={6}>
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

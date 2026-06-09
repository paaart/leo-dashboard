"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  SectionCard,
} from "@/components/shared/DashboardUI";
import LoanSummaryCards from "./LoanSummaryCards";

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
      <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <PageHeader
            eyebrow="Finance"
            title="Loans & Advances"
            subtitle="Track employee loans, advances, repayments, and outstanding balances."
          />
          <LoadingState label="Loading employees" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Finance"
          title="Loans & Advances"
          subtitle="Track employee loans, advances, repayments, and outstanding balances."
        />

        <LoanSummaryCards />

        <SectionCard
          title="Manage Employees"
          description="Add employees and maintain company or location assignment for loan tracking."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                Name
              </label>
              <input
                type="text"
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-500"
                placeholder="Employee name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                Employee Code
              </label>
              <input
                type="text"
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-500"
                placeholder="e.g. EMP015"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                Company
              </label>
              <select
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
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
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                Location
              </label>
              <select
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
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
            </div>
          </div>

          <div className="mt-5 flex justify-end border-t border-gray-200 pt-5 dark:border-gray-800">
            <button
              type="button"
              onClick={handleAdd}
              disabled={loading || !name.trim() || !employeeCode.trim()}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add Employee
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Employee List"
          description="Review active employees and update their company or location."
        >
          {employees.length === 0 ? (
            <EmptyState
              title="No employees"
              description="Add employees to start recording loans, advances, and repayments."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="min-w-[920px] w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                  <tr>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Employee
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Status
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Company
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Location
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                      Created
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold dark:border-gray-800">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {employees.map((emp, idx) => (
                    <tr
                      key={emp.id}
                      className="bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-950 dark:text-gray-50">
                          {emp.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {emp.employee_code}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                          value={emp.company_id ?? ""}
                          onChange={(e) => {
                            const v = e.target.value
                              ? Number(e.target.value)
                              : null;
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
                      <td className="px-4 py-3">
                        <select
                          className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                          value={emp.location_id ?? ""}
                          onChange={(e) => {
                            const v = e.target.value
                              ? Number(e.target.value)
                              : null;
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
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {new Date(emp.created_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => saveRow(emp)}
                          disabled={savingRowId === emp.id}
                          className="inline-flex min-h-9 items-center justify-center rounded-md bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingRowId === emp.id ? "Saving..." : "Save"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

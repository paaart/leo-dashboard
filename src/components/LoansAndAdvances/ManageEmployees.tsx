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
import {
  badgeClass,
  buttonPrimary,
  inputField,
  selectField,
  tableCellMuted,
  tableHead,
  tableHeadCell,
  tableWrapper,
} from "@/components/shared/ui";
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
      <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
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
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
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
              <label className="block text-sm font-medium text-fg">
                Name
              </label>
              <input
                type="text"
                className={`${inputField} h-10`}
                placeholder="Employee name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-fg">
                Employee Code
              </label>
              <input
                type="text"
                className={`${inputField} h-10`}
                placeholder="e.g. EMP015"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-fg">
                Company
              </label>
              <select
                className={`${selectField} h-10`}
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
              <label className="block text-sm font-medium text-fg">
                Location
              </label>
              <select
                className={`${selectField} h-10`}
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

          <div className="mt-5 flex justify-end border-t border-edge pt-5">
            <button
              type="button"
              onClick={handleAdd}
              disabled={loading || !name.trim() || !employeeCode.trim()}
              className={buttonPrimary}
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
            <div className={tableWrapper}>
              <table className="min-w-[920px] w-full text-sm">
                <thead className={tableHead}>
                  <tr>
                    <th className={`${tableHeadCell} text-left`}>
                      Employee
                    </th>
                    <th className={`${tableHeadCell} text-left`}>
                      Status
                    </th>
                    <th className={`${tableHeadCell} text-left`}>
                      Company
                    </th>
                    <th className={`${tableHeadCell} text-left`}>
                      Location
                    </th>
                    <th className={`${tableHeadCell} text-left`}>
                      Created
                    </th>
                    <th className={`${tableHeadCell} text-right`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {employees.map((emp, idx) => (
                    <tr
                      key={emp.id}
                      className="bg-surface transition-colors hover:bg-surface-2/60"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-fg">
                          {emp.name}
                        </p>
                        <p className="text-xs text-fg-muted">
                          {emp.employee_code}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={badgeClass("success")}>
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="h-9 w-full rounded-lg border border-edge bg-surface px-2 text-sm text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25"
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
                          className="h-9 w-full rounded-lg border border-edge bg-surface px-2 text-sm text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25"
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
                      <td className={tableCellMuted}>
                        {new Date(emp.created_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => saveRow(emp)}
                          disabled={savingRowId === emp.id}
                          className={buttonPrimary}
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

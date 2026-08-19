import { db } from "@/lib/db";

type EmployeeInput = {
  name: string;
  employeeCode: string;
  companyId: number | null;
  locationId: number | null;
};

function optionalId(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : NaN;
}

export function validateEmployeeInput(input: unknown):
  | { ok: true; value: EmployeeInput }
  | { ok: false; error: string } {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Invalid employee" };
  }
  const body = input as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const employeeCode = typeof body.employeeCode === "string"
    ? body.employeeCode.trim().toUpperCase()
    : "";
  const companyId = optionalId(body.companyId);
  const locationId = optionalId(body.locationId);

  if (!name) return { ok: false, error: "name is required" };
  if (!employeeCode) return { ok: false, error: "employeeCode is required" };
  if (Number.isNaN(companyId) || Number.isNaN(locationId)) {
    return { ok: false, error: "companyId and locationId must be valid IDs" };
  }
  return { ok: true, value: { name, employeeCode, companyId, locationId } };
}

export async function listEmployeeReferences() {
  const [companies, locations] = await Promise.all([
    db.query("select id, name, is_active from public.companies where is_active = true order by name"),
    db.query("select id, name, is_active from public.locations where is_active = true order by name"),
  ]);
  return { companies: companies.rows, locations: locations.rows };
}

export async function listEmployees() {
  const result = await db.query(
    `
      select e.id, e.name, e.employee_code, e.created_at, e.company_id, e.location_id,
             c.id as company_ref_id, c.name as company_name,
             l.id as location_ref_id, l.name as location_name
      from public.employees e
      left join public.companies c on c.id = e.company_id
      left join public.locations l on l.id = e.location_id
      where e.display = true
      order by e.created_at desc
    `
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    employee_code: row.employee_code,
    created_at: row.created_at,
    company_id: row.company_id,
    location_id: row.location_id,
    company: row.company_ref_id ? { id: row.company_ref_id, name: row.company_name } : null,
    location: row.location_ref_id ? { id: row.location_ref_id, name: row.location_name } : null,
  }));
}

export async function createEmployee(input: EmployeeInput) {
  const result = await db.query(
    `
      insert into public.employees (name, employee_code, company_id, location_id)
      values ($1, $2, $3, $4)
      returning id, name, employee_code, created_at, company_id, location_id
    `,
    [input.name, input.employeeCode, input.companyId, input.locationId]
  );
  return result.rows[0];
}

export async function updateEmployeeAssignment(
  id: string,
  input: Pick<EmployeeInput, "companyId" | "locationId">
) {
  const result = await db.query(
    `
      update public.employees
      set company_id = $2, location_id = $3
      where id = $1 and display = true
      returning id, name, employee_code, company_id, location_id
    `,
    [id, input.companyId, input.locationId]
  );
  return result.rows[0] ?? null;
}

export async function getEmployee(id: string) {
  const result = await db.query(
    `
      select e.id, e.name, e.employee_code,
             c.name as company_name, l.name as location_name
      from public.employees e
      left join public.companies c on c.id = e.company_id
      left join public.locations l on l.id = e.location_id
      where e.id = $1 and e.display = true
    `,
    [id]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    employee_code: row.employee_code,
    company: row.company_name ? { name: row.company_name } : null,
    location: row.location_name ? { name: row.location_name } : null,
  };
}

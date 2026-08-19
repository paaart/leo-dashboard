async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = (await response.json()) as
    | { ok: true; data: T }
    | { ok: false; error: string };
  if (!response.ok || !json.ok) {
    throw new Error(json.ok ? "Request failed" : json.error);
  }
  return json.data;
}

export function fetchEmployees() {
  return request<{
    employees: Array<Record<string, unknown>>;
    companies: Array<{ id: number; name: string; is_active?: boolean }>;
    locations: Array<{ id: number; name: string; is_active?: boolean }>;
  }>("/api/employees");
}

export function createEmployee(payload: {
  name: string;
  employeeCode: string;
  companyId: number | null;
  locationId: number | null;
}) {
  return request("/api/employees", { method: "POST", body: JSON.stringify(payload) });
}

export function updateEmployee(id: string, payload: { companyId: number | null; locationId: number | null }) {
  return request(`/api/employees/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function fetchEmployee(id: string) {
  return request<{
    id: string;
    name: string;
    employee_code: string;
    company: { name: string } | null;
    location: { name: string } | null;
  }>(`/api/employees/${id}`);
}

export function fetchLoanSummary() {
  return request<{
    totalOutstanding: number;
    activeEmployeesWithBalance: number;
    totalGiven: number;
    totalRepayments: number;
  }>("/api/loans?view=summary");
}

export function fetchOutstandingLoans() {
  return request<Array<Record<string, unknown>>>("/api/loans?view=outstanding");
}

export function fetchLoanTransactions(params: {
  employeeId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
  order?: "asc" | "desc";
}) {
  const query = new URLSearchParams({ view: "transactions" });
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  return request<Array<Record<string, unknown>>>(`/api/loans?${query}`);
}

export function createLoanEntry(payload: {
  employeeId: string;
  amount: number;
  type: "loan" | "advance" | "repayment";
  remarks: string;
  paymentDate: string;
}) {
  return request("/api/loans", { method: "POST", body: JSON.stringify(payload) });
}

export function deleteLoanEntry(id: string) {
  return request<{ id: string }>(`/api/loans/${id}`, { method: "DELETE" });
}

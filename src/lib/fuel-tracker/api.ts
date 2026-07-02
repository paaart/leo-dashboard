import type {
  CreateFuelEntryPayload,
  CreateVehicleExpenseInvoicePaymentPayload,
  CreateVehicleExpenseInvoicePayload,
  CreateVehicleExpensePaymentBatchPayload,
  CreateVehicleExpensePaymentPayload,
  CreateVehicleExpensePayload,
  CreateVehiclePayload,
  UpdateFuelEntryPayload,
  UpdateVehicleExpenseInvoicePayload,
  UpdateVehiclePayload,
  UpdateVehicleExpensePayload,
  FuelApiResponse,
  FuelDashboardAnalytics,
  FuelDashboardSummary,
  FuelEntry,
  Vehicle,
  VehicleExpense,
  VehicleExpenseInvoiceAnalytics,
  VehicleExpenseInvoice,
  VehicleExpensePaymentBatch,
  VehicleExpensePayment,
} from "./types";

async function requestJson<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const json = (await response.json()) as FuelApiResponse<T>;

  if (!response.ok || !json.ok) {
    throw new Error(json.ok ? "Request failed" : json.error);
  }

  return json.data;
}

export function fetchVehicles() {
  return requestJson<Vehicle[]>("/api/vehicles");
}

export function createVehicle(payload: CreateVehiclePayload) {
  return requestJson<Vehicle>("/api/vehicles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateVehicle(id: string, payload: UpdateVehiclePayload) {
  return requestJson<Vehicle>(`/api/vehicles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function fetchFuelEntries() {
  return requestJson<FuelEntry[]>("/api/fuel-entries");
}

export function createFuelEntry(payload: CreateFuelEntryPayload) {
  return requestJson<FuelEntry>("/api/fuel-entries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateFuelEntry(id: string, payload: UpdateFuelEntryPayload) {
  return requestJson<FuelEntry>(`/api/fuel-entries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteFuelEntry(id: string) {
  return requestJson<{ id: string }>(`/api/fuel-entries/${id}`, {
    method: "DELETE",
  });
}

export function fetchVehicleExpenses(filters?: {
  vehicleId?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const params = new URLSearchParams();

  if (filters?.vehicleId && filters.vehicleId !== "all") {
    params.set("vehicleId", filters.vehicleId);
  }
  if (filters?.fromDate) params.set("fromDate", filters.fromDate);
  if (filters?.toDate) params.set("toDate", filters.toDate);

  const query = params.toString();

  return requestJson<VehicleExpense[]>(
    `/api/vehicle-expenses${query ? `?${query}` : ""}`
  );
}

export function createVehicleExpense(payload: CreateVehicleExpensePayload) {
  return requestJson<VehicleExpense>("/api/vehicle-expenses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateVehicleExpense(
  id: string,
  payload: UpdateVehicleExpensePayload
) {
  return requestJson<VehicleExpense>(`/api/vehicle-expenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteVehicleExpense(id: string) {
  return requestJson<{ id: string }>(`/api/vehicle-expenses/${id}`, {
    method: "DELETE",
  });
}

export function fetchVehicleExpensePayments(filters?: {
  fromDate?: string;
  toDate?: string;
  paymentMode?: string;
}) {
  const params = new URLSearchParams();

  if (filters?.fromDate) params.set("fromDate", filters.fromDate);
  if (filters?.toDate) params.set("toDate", filters.toDate);
  if (filters?.paymentMode) params.set("paymentMode", filters.paymentMode);

  const query = params.toString();

  return requestJson<VehicleExpensePayment[]>(
    `/api/vehicle-expense-payments${query ? `?${query}` : ""}`
  );
}

export function createVehicleExpensePayment(
  payload: CreateVehicleExpensePaymentPayload
) {
  return requestJson<VehicleExpensePayment>("/api/vehicle-expense-payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchVehicleExpenseInvoices(filters?: {
  status?: string;
  vendorName?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const params = new URLSearchParams();

  if (filters?.status) params.set("status", filters.status);
  if (filters?.vendorName) params.set("vendorName", filters.vendorName);
  if (filters?.fromDate) params.set("fromDate", filters.fromDate);
  if (filters?.toDate) params.set("toDate", filters.toDate);

  const query = params.toString();

  return requestJson<VehicleExpenseInvoice[]>(
    `/api/vehicle-expense-invoices${query ? `?${query}` : ""}`
  );
}

export function fetchVehicleExpenseInvoice(id: string) {
  return requestJson<VehicleExpenseInvoice>(
    `/api/vehicle-expense-invoices/${id}`
  );
}

export function fetchVehicleExpenseInvoiceAnalytics() {
  return requestJson<VehicleExpenseInvoiceAnalytics>(
    "/api/vehicle-expense-invoices/analytics"
  );
}

export function createVehicleExpenseInvoice(
  payload: CreateVehicleExpenseInvoicePayload
) {
  return requestJson<VehicleExpenseInvoice>("/api/vehicle-expense-invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateVehicleExpenseInvoice(
  id: string,
  payload: UpdateVehicleExpenseInvoicePayload
) {
  return requestJson<VehicleExpenseInvoice>(
    `/api/vehicle-expense-invoices/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export function deleteVehicleExpenseInvoice(id: string) {
  return requestJson<{ id: string }>(`/api/vehicle-expense-invoices/${id}`, {
    method: "DELETE",
  });
}

export function createVehicleExpenseInvoicePayment(
  invoiceId: string,
  payload: CreateVehicleExpenseInvoicePaymentPayload
) {
  return requestJson<VehicleExpenseInvoice>(
    `/api/vehicle-expense-invoices/${invoiceId}/payments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function deleteVehicleExpenseInvoicePayment(
  invoiceId: string,
  paymentId: string
) {
  return requestJson<VehicleExpenseInvoice>(
    `/api/vehicle-expense-invoices/${invoiceId}/payments/${paymentId}`,
    {
      method: "DELETE",
    }
  );
}

export function fetchVehicleExpensePaymentBatches(filters?: {
  vendorName?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const params = new URLSearchParams();

  if (filters?.vendorName) params.set("vendorName", filters.vendorName);
  if (filters?.fromDate) params.set("fromDate", filters.fromDate);
  if (filters?.toDate) params.set("toDate", filters.toDate);

  const query = params.toString();

  return requestJson<VehicleExpensePaymentBatch[]>(
    `/api/vehicle-expense-payment-batches${query ? `?${query}` : ""}`
  );
}

export function fetchVehicleExpensePaymentBatch(id: string) {
  return requestJson<VehicleExpensePaymentBatch>(
    `/api/vehicle-expense-payment-batches/${id}`
  );
}

export function createVehicleExpensePaymentBatch(
  payload: CreateVehicleExpensePaymentBatchPayload
) {
  return requestJson<VehicleExpensePaymentBatch>(
    "/api/vehicle-expense-payment-batches",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function deleteVehicleExpensePaymentBatch(id: string) {
  return requestJson<{ id: string }>(
    `/api/vehicle-expense-payment-batches/${id}`,
    {
      method: "DELETE",
    }
  );
}

export function fetchFuelDashboard() {
  return requestJson<FuelDashboardSummary[]>("/api/fuel-dashboard");
}

export function fetchFuelDashboardAnalytics(filters: {
  vehicleId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const params = new URLSearchParams();

  if (filters.vehicleId && filters.vehicleId !== "all") {
    params.set("vehicleId", filters.vehicleId);
  }
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);

  const query = params.toString();

  return requestJson<FuelDashboardAnalytics>(
    `/api/fuel-dashboard/analytics${query ? `?${query}` : ""}`
  );
}

import type {
  CreateFuelEntryPayload,
  CreateVehicleExpensePaymentPayload,
  CreateVehicleExpensePayload,
  CreateVehiclePayload,
  UpdateVehiclePayload,
  FuelApiResponse,
  FuelDashboardAnalytics,
  FuelDashboardSummary,
  FuelEntry,
  Vehicle,
  VehicleExpense,
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

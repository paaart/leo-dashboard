import type {
  CreateFuelEntryPayload,
  CreateVehiclePayload,
  FuelApiResponse,
  FuelDashboardAnalytics,
  FuelDashboardSummary,
  FuelEntry,
  Vehicle,
} from "../types/fuelTracker.types";

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

export function fetchFuelEntries() {
  return requestJson<FuelEntry[]>("/api/fuel-entries");
}

export function createFuelEntry(payload: CreateFuelEntryPayload) {
  return requestJson<FuelEntry>("/api/fuel-entries", {
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

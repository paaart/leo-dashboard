// src/lib/warehouse/pods.ts
import type {
  WarehousePodSummary,
  WarehouseCycle,
  BillingInterval,
  InsuranceProvider,
} from "./types";
import { fetchJson } from "./api";

export async function accrueWarehouseCharges(podId?: string): Promise<void> {
  const url = podId
    ? `/api/warehouse/pods/accrue?podId=${encodeURIComponent(podId)}`
    : `/api/warehouse/pods/accrue`;

  await fetchJson<void>(url, { method: "POST" });
}

export async function listWarehousePods(args?: {
  status?: "active" | "closed" | "all";
  limit?: number;
  offset?: number;
}): Promise<WarehousePodSummary[]> {
  const status = args?.status ?? "active";
  const limit = args?.limit ?? 500;
  const offset = args?.offset ?? 0;

  const url = `/api/warehouse/pods?status=${encodeURIComponent(
    status
  )}&limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(
    String(offset)
  )}`;

  const data = await fetchJson<{
    rows: WarehousePodSummary[];
    meta?: unknown;
  }>(url, { method: "GET" });

  return data.rows ?? [];
}

export type CreatePodBody = {
  name: string;
  email?: string | null;
  contact: string;

  company_id?: number | null;
  location_id: number;

  start_date: string; // YYYY-MM-DD
  billing_start_date: string; // YYYY-MM-DD

  duration_months: number;
  billing_interval: BillingInterval;
  rate: number;

  mode_of_payment?: string | null;

  insurance_provider: InsuranceProvider;
  insurance_value: number;
  insurance_idv?: number | null;

  old_outstanding?: number | null;
};

export async function createWarehousePod(
  body: CreatePodBody
): Promise<{ id: string; client_id: string }> {
  const data = await fetchJson<{ id: string; client_id: string }>(
    `/api/warehouse/pods/create`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  return data;
}

export async function fetchPodCycles(podId: string): Promise<WarehouseCycle[]> {
  const url = `/api/warehouse/pods/cycles?podId=${encodeURIComponent(podId)}`;
  const data = await fetchJson<{ rows: WarehouseCycle[] }>(url, {
    method: "GET",
  });
  return data.rows ?? [];
}

export async function fetchActiveCycleIdOrThrow(
  podId: string
): Promise<string> {
  const cycles = await fetchPodCycles(podId);
  const active = cycles.find((c) => c.status === "active");
  if (!active?.id) throw new Error("No active cycle found for this pod.");
  return active.id;
}

export async function deleteWarehousePod(podId: string): Promise<void> {
  const res = await fetch(
    `/api/warehouse/pods/delete?podId=${encodeURIComponent(podId)}`,
    {
      method: "DELETE",
      cache: "no-store",
    }
  );

  const json = await res.json();

  if (!res.ok || !json.ok) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }
}

export type WarehousePaymentRow = {
  id: string;
  pod_id: string;
  cycle_id: string | null;
  pod_name: string;
  client_id: string | null;
  company_name: string | null;
  location_name: string | null;
  mode_of_payment: string | null;
  amount: number;
  tx_date: string;
  title: string;
  note: string | null;
  created_at: string | null;
};

export type WarehousePaymentsFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  fromDate?: string;
  toDate?: string;
  locationName?: string;
  modeOfPayment?: string;
};

export type WarehousePaymentsMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export async function listWarehousePayments(
  filters: WarehousePaymentsFilters = {}
): Promise<{ rows: WarehousePaymentRow[]; meta: WarehousePaymentsMeta }> {
  const params = new URLSearchParams();

  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 50));

  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);

  if (filters.locationName?.trim()) {
    params.set("locationName", filters.locationName.trim());
  }

  if (filters.modeOfPayment?.trim()) {
    params.set("modeOfPayment", filters.modeOfPayment.trim());
  }

  const res = await fetch(`/api/warehouse/pods/payments?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const json = (await res.json()) as {
    ok: boolean;
    data?: {
      rows: WarehousePaymentRow[];
      meta: WarehousePaymentsMeta;
    };
    error?: string;
  };

  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }

  return json.data;
}

export type WarehouseClosedPodRow = {
  id: string;
  client_id: string | null;
  name: string;
  email: string | null;
  contact: string;
  company_name: string | null;
  location_name: string | null;
  mode_of_payment: string | null;
  rate: number;
  billing_interval: string;
  start_date: string | null;
  billing_start_date: string | null;
  closed_at: string | null;
  final_due: number;
};

export type WarehouseClosedPodsFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type WarehouseClosedPodsMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export async function listClosedWarehousePods(
  filters: WarehouseClosedPodsFilters = {}
): Promise<{ rows: WarehouseClosedPodRow[]; meta: WarehouseClosedPodsMeta }> {
  const params = new URLSearchParams();

  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 50));

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  const res = await fetch(`/api/warehouse/pods/closed?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const json = (await res.json()) as {
    ok: boolean;
    data?: {
      rows: WarehouseClosedPodRow[];
      meta: WarehouseClosedPodsMeta;
    };
    error?: string;
  };

  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }

  return json.data;
}

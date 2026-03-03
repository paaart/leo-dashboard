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

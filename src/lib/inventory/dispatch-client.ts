import { fetchJson } from "@/lib/warehouse/api";
import type {
  InventoryDispatch,
  InventoryCountRequest,
  InventoryReconciliation,
  InventoryAnalyticsResponse,
} from "./types";
export function loadDispatches(status?: string) {
  return fetchJson<InventoryDispatch[]>(
    `/api/inventory/dispatches${status ? `?status=${status}` : ""}`,
    { cache: "no-store" },
  );
}
export function createDispatch(input: Record<string, unknown>) {
  return fetchJson<{ id: string }>("/api/inventory/dispatches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
export function receiveDispatch(id: string, quantityReceived: number) {
  return fetchJson<InventoryDispatch>(
    `/api/inventory/dispatches/${id}/receive`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantityReceived }),
    },
  );
}
export function deleteDispatch(id: string) {
  return fetchJson<{ deleted: boolean }>(`/api/inventory/dispatches/${id}`, {
    method: "DELETE",
  });
}
export function loadCountRequests(pending = true) {
  return fetchJson<InventoryCountRequest[]>(
    `/api/inventory/count-requests?pending=${pending ? "1" : "0"}`,
    { cache: "no-store" },
  );
}
export function createCountRequest(input: Record<string, unknown>) {
  return fetchJson<{ id: string }>("/api/inventory/count-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
export function completeCountRequest(id: string) {
  return fetchJson<InventoryCountRequest>(
    `/api/inventory/count-requests/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
  );
}
export function deleteCountRequest(id: string) {
  return fetchJson<{ deleted: boolean }>(
    `/api/inventory/count-requests/${id}`,
    { method: "DELETE" },
  );
}
export function loadReconciliation(month: string) {
  return fetchJson<InventoryReconciliation[]>(
    `/api/inventory/reconciliation?month=${month}`,
    { cache: "no-store" },
  );
}
export function loadInventoryAnalytics(mode: "cy" | "fy", year: number) {
  return fetchJson<InventoryAnalyticsResponse>(
    `/api/inventory/analytics?mode=${mode}&year=${year}`,
    { cache: "no-store" },
  );
}

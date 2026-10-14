// src/lib/inventory/client.ts
// Browser-side helpers for the Inventory Management routes.
import { fetchJson } from "@/lib/warehouse/api";
import type {
  InventoryAssignment,
  InventoryBranch,
  InventoryMaterial,
} from "./types";

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/* ---------- Branches ---------- */

export function listInventoryBranches(opts?: { includeInactive?: boolean }) {
  const qs = opts?.includeInactive ? "?includeInactive=1" : "";
  return fetchJson<InventoryBranch[]>(`/api/inventory/branches${qs}`);
}

export function createInventoryBranch(input: { name: string }) {
  return fetchJson<InventoryBranch>(
    "/api/inventory/branches",
    jsonInit("POST", input)
  );
}

export function updateInventoryBranch(
  id: string,
  patch: { name?: string; isActive?: boolean; isCentral?: boolean }
) {
  return fetchJson<InventoryBranch>(
    `/api/inventory/branches/${encodeURIComponent(id)}`,
    jsonInit("PATCH", patch)
  );
}

/* ---------- Materials ---------- */

export function listInventoryMaterials(opts?: { includeInactive?: boolean }) {
  const qs = opts?.includeInactive ? "?includeInactive=1" : "";
  return fetchJson<InventoryMaterial[]>(`/api/inventory/materials${qs}`);
}

export function createInventoryMaterial(input: {
  name: string;
  unit: string;
  minStock: number | null;
}) {
  return fetchJson<InventoryMaterial>(
    "/api/inventory/materials",
    jsonInit("POST", input)
  );
}

export function updateInventoryMaterial(
  id: string,
  patch: {
    name?: string;
    unit?: string;
    minStock?: number | null;
    isActive?: boolean;
  }
) {
  return fetchJson<InventoryMaterial>(
    `/api/inventory/materials/${encodeURIComponent(id)}`,
    jsonInit("PATCH", patch)
  );
}

/* ---------- Assignments ---------- */

export function listInventoryAssignments() {
  return fetchJson<InventoryAssignment[]>("/api/inventory/assignments");
}

export function setInventoryAssignments(profileId: string, branchIds: string[]) {
  return fetchJson<InventoryAssignment>(
    `/api/inventory/assignments/${encodeURIComponent(profileId)}`,
    jsonInit("PUT", { branchIds })
  );
}

export function loadInventoryStock(date?: string) {
  return fetchJson<import('./types').StockData>(`/api/inventory/counts${date ? `?date=${encodeURIComponent(date)}` : ''}`, { cache: 'no-store' });
}
export function saveInventoryCounts(branchId: string, date: string, entries: import('./types').CountInput[]) {
  return fetchJson<{ saved: boolean }>('/api/inventory/counts', jsonInit('POST', { branchId, date, entries }));
}
export function loadInventoryHistory(materialId: string, branchId: string, offset = 0) {
  const params = new URLSearchParams({ materialId, offset: String(offset) });
  if (branchId) params.set('branchId', branchId);
  return fetchJson<import('./types').CountEdit[]>(`/api/inventory/counts/history?${params}`, { cache: 'no-store' });
}

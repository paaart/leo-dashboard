import { fetchJson } from "@/lib/warehouse/api";
import type {
  InventoryPurchase,
  InventoryVendor,
  InventoryBranch,
  InventoryMaterial,
} from "./types";
export type PurchaseData = {
  branches: InventoryBranch[];
  materials: InventoryMaterial[];
  vendors: InventoryVendor[];
  purchases: InventoryPurchase[];
};
export function loadPurchaseData() {
  return fetchJson<PurchaseData>("/api/inventory/purchases", {
    cache: "no-store",
  });
}
export function saveVendor(input: Record<string, unknown>) {
  return fetchJson<InventoryVendor>("/api/vendors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
export function savePurchase(input: Record<string, unknown>) {
  return fetchJson<{ id: string }>("/api/inventory/purchases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
export async function uploadInvoice(file: File) {
  const form = new FormData();
  form.append("file", file);
  return fetchJson<{ path: string }>("/api/inventory/purchases/upload", {
    method: "POST",
    body: form,
  });
}
export function invoiceUrl(path: string) {
  return `/api/inventory/purchases/upload?path=${encodeURIComponent(path)}`;
}

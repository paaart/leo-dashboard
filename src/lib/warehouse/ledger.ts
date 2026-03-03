// src/lib/warehouse/ledger.ts
import type { WarehouseTxn, WarehouseTxnType } from "./types";
import { fetchJson } from "./api";

export async function fetchPodTransactions(
  podId: string
): Promise<WarehouseTxn[]> {
  const url = `/api/warehouse/pods/transactions?podId=${encodeURIComponent(
    podId
  )}`;
  const data = await fetchJson<{ rows: WarehouseTxn[] }>(url, {
    method: "GET",
  });
  return data.rows ?? [];
}

export async function fetchCycleTransactions(
  cycleId: string
): Promise<WarehouseTxn[]> {
  const url = `/api/warehouse/pods/transactions?cycleId=${encodeURIComponent(
    cycleId
  )}`;
  const data = await fetchJson<{ rows: WarehouseTxn[] }>(url, {
    method: "GET",
  });
  return data.rows ?? [];
}

export async function addWarehouseTransaction(args: {
  podId: string;
  type: Exclude<WarehouseTxnType, "payment">; // "charge" | "adjustment"
  amount: number; // POSITIVE in UI
  gstRate?: number; // percent, default 18
  txDate: string; // YYYY-MM-DD
  title: string;
  note?: string | null;
}): Promise<void> {
  if (!Number.isFinite(args.amount) || args.amount <= 0) {
    throw new Error("Amount must be > 0");
  }

  const payload = {
    podId: args.podId,
    type: args.type,
    amount: Math.abs(args.amount),
    gstRate: Number.isFinite(args.gstRate) ? Number(args.gstRate) : 18,
    txDate: args.txDate,
    title: args.title,
    note: args.note ?? null,
  };

  await fetchJson<void>(`/api/warehouse/pods/transactions/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function recordWarehousePayment(args: {
  podId: string;
  amount: number; // POSITIVE in UI
  txDate: string; // YYYY-MM-DD
  title?: string;
  note?: string | null;
}): Promise<void> {
  if (!Number.isFinite(args.amount) || args.amount <= 0) {
    throw new Error("Payment amount must be > 0");
  }

  const payload = {
    podId: args.podId,
    amount: Math.abs(args.amount),
    txDate: args.txDate,
    title: args.title ?? "Payment",
    note: args.note ?? null,
  };

  await fetchJson<void>(`/api/warehouse/pods/transactions/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateWarehouseTransaction(args: {
  id: string;
  amount: number; // SIGNED
  gst_rate: number; // percent (0 for payments)
  tx_date: string; // YYYY-MM-DD
  title: string;
  note?: string | null;
}): Promise<void> {
  const payload = {
    id: args.id,
    amount: args.amount,
    gst_rate: args.gst_rate,
    tx_date: args.tx_date,
    title: args.title,
    note: args.note ?? null,
  };

  // If your route uses POST instead of PATCH, change this one word.
  await fetchJson<void>(`/api/warehouse/pods/transactions/update`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteWarehouseTransaction(id: string): Promise<void> {
  const url = `/api/warehouse/pods/transactions/delete?id=${encodeURIComponent(
    id
  )}`;
  await fetchJson<{ id: string }>(url, { method: "DELETE" });
}

export async function applyMidCycleRateChange(args: {
  podId: string;
  oldRate: number;
  newRate: number;
  effectiveDate: string; // YYYY-MM-DD
  addExtraChargeNow?: boolean;
  extraDays?: number;
  gstRate?: number; // percent
  note?: string | null;
}): Promise<void> {
  await fetchJson<void>(`/api/warehouse/pods/rate-change`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
}

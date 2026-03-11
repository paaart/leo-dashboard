// src/lib/warehouse/ledger.ts
import type { WarehouseTxn, WarehouseTxnType } from "./types";
import { fetchJson } from "./api";

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
  type: Exclude<WarehouseTxnType, "payment">;
  amount: number;
  gstRate?: number;
  txDate: string;
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
  cycleId?: string;
  amount: number;
  txDate: string;
  title?: string;
  note?: string | null;
}): Promise<void> {
  if (!Number.isFinite(args.amount) || args.amount <= 0) {
    throw new Error("Payment amount must be > 0");
  }

  const payload = {
    podId: args.podId,
    cycleId: args.cycleId ?? undefined,
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
  amount: number;
  gst_rate: number;
  tx_date: string;
  title: string;
  note?: string | null;
  last_known_updated_at?: string | null;
  last_known_created_at: string;
}): Promise<{ id: string; updated_at?: string | null }> {
  const payload = {
    id: args.id,
    amount: args.amount,
    gst_rate: args.gst_rate,
    tx_date: args.tx_date,
    title: args.title,
    note: args.note ?? null,
    last_known_updated_at: args.last_known_updated_at ?? null,
    last_known_created_at: args.last_known_created_at,
  };

  return fetchJson<{ id: string; updated_at?: string | null }>(
    `/api/warehouse/pods/transactions/update`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export async function closeWarehouseCycle(podId: string): Promise<string> {
  const data = await fetchJson<{ cycleId: string }>(
    `/api/warehouse/pods/cycles/close`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ podId }),
    }
  );

  return data.cycleId;
}

export async function applyMidCycleRateChange(args: {
  podId: string;
  oldRate: number;
  newRate: number;
  effectiveDate: string;
  addExtraChargeNow?: boolean;
  extraDays?: number;
  gstRate?: number;
  note?: string | null;
}): Promise<void> {
  await fetchJson<void>(`/api/warehouse/pods/rate-change`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
}

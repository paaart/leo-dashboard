// Backward-compatible Warehouse API wrappers. All data access stays behind
// authenticated Next.js routes; this module is retained for legacy imports.
import type {
  WarehouseCycle,
  WarehousePodSummary,
  WarehouseTxn,
} from "./warehouse/types";
import {
  accrueWarehouseCharges as accrue,
  fetchPodCycles,
  listWarehousePods,
} from "./warehouse/pods";
import {
  addWarehouseTransaction as addTransaction,
  applyMidCycleRateChange as applyRateChange,
  fetchCycleTransactions,
  recordWarehousePayment as recordPayment,
} from "./warehouse/ledger";

export type { WarehouseCycle, WarehousePodSummary, WarehouseTxn };
export type SeverityBand = "green" | "yellow" | "red";
export type WarehouseTxnType = "charge" | "payment" | "adjustment";

export async function accrueWarehouseCharges(podId?: string) {
  return accrue(podId);
}

export async function listWarehousePodsLegacy(): Promise<WarehousePodSummary[]> {
  return listWarehousePods({ status: "active" });
}

export async function fetchPodTransactions(
  podId: string
): Promise<WarehouseTxn[]> {
  const cycles = await fetchPodCycles(podId);
  const active = cycles.find((cycle) => cycle.status === "active");
  return active ? fetchCycleTransactions(active.id) : [];
}

export async function addWarehouseTransaction(args: {
  podId: string;
  type: "charge" | "adjustment";
  amount: number;
  gstRate?: number;
  txDate: string;
  title: string;
  note?: string | null;
}) {
  return addTransaction(args);
}

export async function recordWarehousePayment(args: {
  podId: string;
  amount: number;
  txDate: string;
  title?: string;
  note?: string | null;
}) {
  return recordPayment(args);
}

export async function recordPodPayment(args: {
  podId: string;
  amount: number;
  date: string;
  note?: string;
}) {
  return recordPayment({
    podId: args.podId,
    amount: args.amount,
    txDate: args.date,
    title: "Payment",
    note: args.note ?? null,
  });
}

export async function fetchPodCyclesLegacy(
  podId: string
): Promise<WarehouseCycle[]> {
  return fetchPodCycles(podId);
}

export async function fetchCycleTransactionsLegacy(
  cycleId: string
): Promise<WarehouseTxn[]> {
  return fetchCycleTransactions(cycleId);
}

export async function fetchActiveCycleIdOrThrow(podId: string) {
  const cycles = await fetchPodCycles(podId);
  const active = cycles.find((cycle) => cycle.status === "active");
  if (!active) throw new Error("No active cycle found for this pod.");
  return active.id;
}

export async function updatePodRate(args: {
  podId: string;
  newRate: number;
}) {
  const pods = await listWarehousePods({ status: "active" });
  const pod = pods.find((item) => item.id === args.podId);
  if (!pod) throw new Error("Pod not found");
  return applyRateChange({
    podId: args.podId,
    oldRate: Number(pod.rate),
    newRate: args.newRate,
    effectiveDate: new Date().toISOString().slice(0, 10),
    addExtraChargeNow: false,
  });
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
}) {
  return applyRateChange(args);
}

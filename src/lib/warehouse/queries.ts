import type {
  WarehousePodSummary,
  WarehouseTxn,
  WarehouseRenewalRow,
} from "./types";
import {
  accrueDueWarehousePods,
  accrueWarehouseCharges,
  fetchWarehouseRenewals,
} from "./pods";
import { fetchCycleTransactions } from "./ledger";

export async function accrueAllWarehousePods() {
  return accrueDueWarehousePods();
}

export async function accrueWarehousePod(podId: string) {
  await accrueWarehouseCharges(podId);
}

export async function fetchActivePodSummaries(): Promise<
  WarehousePodSummary[]
> {
  const { listWarehousePods } = await import("./pods");
  return listWarehousePods({ status: "active" });
}

export async function fetchPodTransactions(
  podId: string
): Promise<WarehouseTxn[]> {
  const { fetchPodCycles } = await import("./pods");
  const cycles = await fetchPodCycles(podId);
  const active = cycles.find((cycle) => cycle.status === "active");
  if (!active) return [];
  return fetchCycleTransactions(active.id);
}

export async function fetchRenewalsThisMonth(): Promise<WarehouseRenewalRow[]> {
  return fetchWarehouseRenewals();
}

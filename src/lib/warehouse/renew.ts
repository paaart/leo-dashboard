import { fetchJson } from "./api";

type RenewWarehousePodPayload = {
  podId: string;
  newRate: number;
  newDurationMonths: number;
  newInsuranceProvider: "none" | "leo";
  newInsuranceValue: number;
  newInsuranceIdv: number;
};

type RenewWarehousePodResponse = {
  ok: boolean;
  data?: {
    oldCycleId: string;
    newCycleId: string;
    cycleStart: string;
    cycleEnd: string;
    nextChargeDate: string | null;
    totalDebitGross: number;
    totalCreditAbs: number;
    closingOutstanding: number;
  };
  error?: string;
};

export async function renewWarehousePod(
  payload: RenewWarehousePodPayload
): Promise<NonNullable<RenewWarehousePodResponse["data"]>> {
  return fetchJson<NonNullable<RenewWarehousePodResponse["data"]>>(
    "/api/warehouse/pods/cycles/renew",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );
}

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
  const res = await fetch("/api/warehouse/pods/cycles/renew", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = (await res.json()) as RenewWarehousePodResponse;

  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }

  return json.data;
}

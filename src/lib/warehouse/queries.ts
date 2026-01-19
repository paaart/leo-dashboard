import { supabase } from "@/lib/supabaseClient";
import type {
  WarehousePodSummary,
  WarehouseTxn,
  WarehouseRenewalRow,
} from "./types";
// import { endDateFromStart } from "./billing";

export async function accrueAllWarehousePods() {
  const { error } = await supabase.rpc("warehouse_accrue_charges", {
    p_pod_id: null,
  });
  if (error) throw error;
}

export async function accrueWarehousePod(podId: string) {
  const { error } = await supabase.rpc("warehouse_accrue_charges", {
    p_pod_id: podId,
  });
  if (error) throw error;
}

export async function fetchActivePodSummaries(): Promise<
  WarehousePodSummary[]
> {
  await accrueAllWarehousePods();

  const { data, error } = await supabase
    .from("warehouse_pod_summaries")
    .select("*")
    .eq("status", "active")
    .order("next_charge_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WarehousePodSummary[];
}

export async function fetchPodTransactions(
  podId: string
): Promise<WarehouseTxn[]> {
  const { data, error } = await supabase
    .from("warehouse_pod_transactions")
    .select("id,pod_id,type,amount,tx_date,note,created_at")
    .eq("pod_id", podId)
    .order("tx_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as WarehouseTxn[];
}

export async function fetchRenewalsThisMonth(): Promise<WarehouseRenewalRow[]> {
  const { data, error } = await supabase
    .from("warehouse_pod_cycles")
    .select(
      `
      id,
      pod_id,
      cycle_start,
      cycle_end,
      duration_months,
      rate_at_start,
      insurance_provider_at_start,
      insurance_value_at_start,
      status,
      warehouse_pods:pod_id (
        id,
        client_id,
        name,
        contact,
        location_id,
        locations:location_id ( name )
      )
    `
    )
    .eq("status", "active")
    .order("cycle_end", { ascending: true });

  if (error) throw error;

  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth();

  const out: WarehouseRenewalRow[] = [];

  for (const c of data ?? []) {
    const end_date = c.cycle_end as string;
    const ed = new Date(end_date + "T00:00:00");

    if (ed.getFullYear() === curY && ed.getMonth() === curM) {
      const pod = Array.isArray(c.warehouse_pods)
        ? c.warehouse_pods[0]
        : c.warehouse_pods;

      out.push({
        pod_id: c.pod_id,
        client_id: pod?.client_id ?? "(missing)",
        name: pod?.name ?? "(missing)",
        contact: pod?.contact ?? "(missing)",
        location_name: pod?.locations?.[0]?.name ?? null,

        start_date: c.cycle_start as string,
        duration_months: Number(c.duration_months),
        end_date,

        rate: Number(c.rate_at_start),

        insurance_provider: (c.insurance_provider_at_start ?? "none") as
          | "none"
          | "leo",
        insurance_value: Number(c.insurance_value_at_start ?? 0),
      });
    }
  }

  out.sort((a, b) => a.end_date.localeCompare(b.end_date));
  return out;
}

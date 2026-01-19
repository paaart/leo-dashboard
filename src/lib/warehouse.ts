import { supabase } from "@/lib/supabaseClient";
import { WarehouseCycle } from "./warehouse/types";

export type SeverityBand = "green" | "yellow" | "red";

export type WarehousePodSummary = {
  id: string;
  client_id: string | null;

  name: string;
  email: string | null;
  contact: string;

  start_date: string;
  duration_months: number;

  billing_interval: "monthly" | "quarterly" | "half_yearly" | "yearly";
  rate: number;
  mode_of_payment: string | null;

  next_charge_date: string;
  next_payment_date: string;

  status: "active" | "closed";

  company_name: string | null;
  location_name: string | null;

  insurance_provider: "none" | "leo";
  insurance_value: number;

  total_due: number;
  total_charged: number;
  total_paid: number;

  payment_ratio: number;
  severity_ratio: number;
  severity_band: SeverityBand;

  last_charge_date: string | null;
  last_payment_date: string | null;
};

export type WarehouseTxnType = "charge" | "payment" | "adjustment";

export type WarehouseTxn = {
  id: string;
  pod_id: string;
  cycle_id: string;

  type: WarehouseTxnType;
  amount: number;

  tx_date: string;

  title: string;
  gst_rate: number;
  note: string | null;

  created_at: string;
};

/** INTERNAL: find active cycle_id for pod (or throw) */
async function getActiveCycleIdOrThrow(podId: string): Promise<string> {
  const { data, error } = await supabase
    .from("warehouse_pod_cycles")
    .select("id")
    .eq("pod_id", podId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  if (!data?.id) throw new Error("No active cycle found for this pod.");
  return data.id;
}

export async function accrueWarehouseCharges(podId?: string): Promise<void> {
  const { error } = await supabase.rpc("warehouse_accrue_charges", {
    p_pod_id: podId ?? null,
  });
  if (error) throw error;
}

export async function listWarehousePods(): Promise<WarehousePodSummary[]> {
  const { data, error } = await supabase
    .from("warehouse_pod_summaries")
    .select("*")
    .eq("status", "active")
    .order("next_payment_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WarehousePodSummary[];
}

export async function fetchPodTransactions(
  podId: string
): Promise<WarehouseTxn[]> {
  const { data, error } = await supabase
    .from("warehouse_pod_transactions")
    .select(
      "id,pod_id,cycle_id,type,amount,gst_rate,tx_date,title,note,created_at"
    )
    .eq("pod_id", podId)
    .order("tx_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WarehouseTxn[];
}

/**
 * Add a manual ledger row (charge/adjustment).
 * - amount is POSITIVE in UI.
 * - charge will be stored as +amount
 * - adjustment will be stored as +amount (use negative adjustment via "Edit row" if needed)
 */
export async function addWarehouseTransaction(args: {
  podId: string;
  type: "charge" | "adjustment";
  amount: number; // positive
  gstRate?: number; // percent, default 18
  txDate: string; // YYYY-MM-DD
  title: string;
  note?: string | null;
}): Promise<void> {
  if (!args.amount || Number.isNaN(args.amount) || args.amount <= 0) {
    throw new Error("Amount must be > 0");
  }

  const cycleId = await getActiveCycleIdOrThrow(args.podId);

  const gstRate = Number.isFinite(args.gstRate) ? Number(args.gstRate) : 18;

  const payload = {
    pod_id: args.podId,
    cycle_id: cycleId,
    type: args.type,
    amount: Math.abs(args.amount), // positive
    gst_rate: Math.max(0, gstRate),
    tx_date: args.txDate,
    title: args.title?.trim() || "Transaction",
    note: args.note?.trim() ? args.note.trim() : null,
  };

  const { error } = await supabase
    .from("warehouse_pod_transactions")
    .insert(payload);

  if (error) throw error;
}

/**
 * Record payment via RPC (recommended).
 * amount is POSITIVE in UI, stored as NEGATIVE by function.
 */
export async function recordWarehousePayment(args: {
  podId: string;
  amount: number; // positive
  txDate: string; // YYYY-MM-DD
  title?: string;
  note?: string | null;
}): Promise<void> {
  if (!args.amount || Number.isNaN(args.amount) || args.amount <= 0) {
    throw new Error("Payment amount must be > 0");
  }

  const { error } = await supabase.rpc("warehouse_record_payment", {
    p_pod_id: args.podId,
    p_amount: Math.abs(args.amount),
    p_tx_date: args.txDate,
    p_title: args.title?.trim() || "Payment",
    p_note: args.note?.trim() ? args.note.trim() : null,
    p_gst_rate: 0,
  });

  if (error) throw error;
}

/**
 * Backward compatible wrapper for your existing usage.
 * (Calls the same RPC; keeps your old function name so nothing breaks.)
 */
export async function recordPodPayment(args: {
  podId: string;
  amount: number; // positive
  date: string; // yyyy-mm-dd
  note?: string;
}): Promise<void> {
  return recordWarehousePayment({
    podId: args.podId,
    amount: args.amount,
    txDate: args.date,
    title: "Payment",
    note: args.note ?? null,
  });
}

export async function fetchPodCycles(podId: string): Promise<WarehouseCycle[]> {
  const { data, error } = await supabase
    .from("warehouse_pod_cycles")
    .select("id,pod_id,cycle_start,cycle_end,status,created_at")
    .eq("pod_id", podId)
    .order("cycle_start", { ascending: false });

  if (error) throw error;
  return (data ?? []) as WarehouseCycle[];
}

export async function fetchCycleTransactions(
  cycleId: string
): Promise<WarehouseTxn[]> {
  const { data, error } = await supabase
    .from("warehouse_pod_transactions")
    .select(
      "id,pod_id,cycle_id,type,amount,gst_rate,tx_date,title,note,created_at"
    )
    .eq("cycle_id", cycleId)
    .order("tx_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WarehouseTxn[];
}

export async function fetchActiveCycleIdOrThrow(
  podId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("warehouse_pod_cycles")
    .select("id")
    .eq("pod_id", podId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  if (!data?.id) throw new Error("No active cycle found for this pod.");
  return data.id;
}

export async function updatePodRate(args: {
  podId: string;
  newRate: number;
}): Promise<void> {
  if (!args.newRate || Number.isNaN(args.newRate) || args.newRate <= 0) {
    throw new Error("New rate must be > 0");
  }

  const { error } = await supabase
    .from("warehouse_pods")
    .update({ rate: args.newRate })
    .eq("id", args.podId);

  if (error) throw error;
}

/**
 * Business rule:
 * - If newRate > oldRate: charge extra (default 15 days) immediately + update rate.
 * - If newRate <= oldRate: no refund/negative proration; only update rate.
 */
export async function applyMidCycleRateChange(args: {
  podId: string;

  oldRate: number;
  newRate: number;

  effectiveDate: string; // YYYY-MM-DD

  // optional extra charge policy
  addExtraChargeNow?: boolean; // default true for increase
  extraDays?: number; // default 15
  gstRate?: number; // default 18

  note?: string | null;
}): Promise<void> {
  const oldRate = Number(args.oldRate);
  const newRate = Number(args.newRate);

  if (!newRate || Number.isNaN(newRate) || newRate <= 0) {
    throw new Error("New rate must be > 0");
  }

  const isIncrease = newRate > oldRate;

  const extraDays = Number.isFinite(args.extraDays)
    ? Number(args.extraDays)
    : 15;
  const gstRate = Number.isFinite(args.gstRate) ? Number(args.gstRate) : 18;

  // Default: charge extra only when rate increases
  const addExtra =
    typeof args.addExtraChargeNow === "boolean"
      ? args.addExtraChargeNow
      : isIncrease;

  // 1) If increase and policy says charge extra: create one-time charge row
  if (isIncrease && addExtra) {
    const deltaMonthly = newRate - oldRate;

    // 15-day policy = (deltaMonthly / 30) * extraDays
    const extraCharge = (deltaMonthly / 30) * extraDays;

    // Avoid tiny noise rows
    const roundedExtra = Math.round((extraCharge + Number.EPSILON) * 100) / 100;

    if (roundedExtra > 0) {
      await addWarehouseTransaction({
        podId: args.podId,
        type: "adjustment", // can be 'charge' too; adjustment reads better
        amount: roundedExtra, // positive
        gstRate,
        txDate: args.effectiveDate,
        title: `Additional items (mid-cycle) • ${extraDays} days`,
        note: args.note?.trim()
          ? args.note.trim()
          : `Rate changed from ₹${oldRate} to ₹${newRate}. Charged partial difference for ${extraDays} days.`,
      });
    }
  }

  // 2) Update recurring rate (affects next auto-charge)
  await updatePodRate({ podId: args.podId, newRate });
}

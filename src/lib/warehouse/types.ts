export type BillingInterval =
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "yearly";

export type PodStatus = "active" | "closed";
export type TxType = "charge" | "payment" | "adjustment";
export type SeverityBand = "green" | "yellow" | "red";
export type InsuranceProvider = "none" | "leo";

export type WarehousePod = {
  id: string;

  client_id: string | null;

  name: string;
  email: string | null;
  contact: string;

  company_id: number | null;
  location_id: number | null;

  start_date: string;
  duration_months: number;

  billing_interval: BillingInterval;
  rate: number;

  mode_of_payment: string | null;

  last_charge_date: string | null;
  next_charge_date: string;

  status: PodStatus;

  created_at: string;
  updated_at: string;

  insurance_provider: InsuranceProvider;
  insurance_value: number;
};

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

  title: string; // ✅ add
  gst_rate: number; // ✅ add
  note: string | null;

  created_at: string; // ✅ add (helpful for sorting)
};

export type WarehouseRenewalRow = {
  pod_id: string;
  client_id: string;
  name: string;
  contact: string;
  location_name: string | null;
  start_date: string;
  duration_months: number;
  end_date: string;
  rate: number;
  insurance_provider: InsuranceProvider;
  insurance_value: number;
};

export type WarehouseCycleStatus = "active" | "closed";

export type WarehouseCycle = {
  id: string;
  pod_id: string;
  cycle_start: string; // YYYY-MM-DD
  cycle_end: string; // YYYY-MM-DD
  status: WarehouseCycleStatus;
  created_at: string;
};

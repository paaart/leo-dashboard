// src/app/api/warehouse/pods/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type PodStatus = "active" | "closed";
type SeverityBand = "green" | "yellow" | "red";

export type WarehousePodSummary = {
  id: string;
  client_id: string | null;

  name: string;
  email: string | null;
  contact: string;

  start_date: string; // YYYY-MM-DD
  duration_months: number;

  billing_interval: "monthly" | "quarterly" | "half_yearly" | "yearly";
  rate: number;
  mode_of_payment: string | null;

  next_charge_date: string;
  next_payment_date: string;

  status: PodStatus;

  company_name: string | null;
  location_name: string | null;

  insurance_provider: "none" | "leo";
  insurance_value: number;
  insurance_idv: number;

  total_due: number; // GST-inclusive due for charges/adjustments + payments (negative)
  total_charged: number; // GST-inclusive charges/adjustments
  total_paid: number; // absolute of payments

  payment_ratio: number; // 0..1
  severity_ratio: number; // 0..1
  severity_band: SeverityBand;

  last_charge_date: string | null;
  last_payment_date: string | null;

  billing_start_date: string;
};

function toBand(paymentRatio: number): SeverityBand {
  if (paymentRatio >= 0.7) return "green";
  if (paymentRatio >= 0.3) return "yellow";
  return "red";
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const statusParam = (
    url.searchParams.get("status") ?? "active"
  ).toLowerCase();
  const status: PodStatus | "all" =
    statusParam === "all"
      ? "all"
      : statusParam === "closed"
      ? "closed"
      : "active";

  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 500), 1),
    2000
  );
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  const client = await db.connect();

  try {
    const whereStatusSql =
      status === "all" ? "" : `where p.status = $1::warehouse_pod_status`;

    const params: unknown[] =
      status === "all" ? [limit, offset] : [status, limit, offset];

    const limitParam = status === "all" ? 1 : 2;
    const offsetParam = status === "all" ? 2 : 3;

    // NOTE:
    // - Charges/adjustments are stored as +amount and may have gst_rate (default 18)
    // - Payments are stored as -amount and should have gst_rate = 0
    // - Totals here are GST-inclusive per row for charge/adjustment:
    //   gross = amount * (1 + gst_rate/100)
    const sql = `
      with pod_base as (
        select
          p.id,
          p.client_id,
          p.name,
          p.email,
          p.contact,
          p.start_date,
          p.billing_start_date,
          p.duration_months,
          p.billing_interval,
          p.rate,
          p.mode_of_payment,
          p.next_charge_date,
          p.next_payment_date,
          p.status,
          p.insurance_provider,
          p.insurance_value,
          p.insurance_idv,
          p.created_at,                  -- ✅ add this so pb.created_at exists
          c.name as company_name,
          l.name as location_name
        from public.warehouse_pods p
        left join public.companies c on c.id = p.company_id
        left join public.locations l on l.id = p.location_id
        ${whereStatusSql}
      ),
      active_cycle as (
        select
          cy.id as cycle_id,
          cy.pod_id
        from public.warehouse_pod_cycles cy
        where cy.status = 'active'
      ),
      tx as (
        select
          t.cycle_id,
          t.type,
          t.amount,
          coalesce(t.gst_rate, 0) as gst_rate,
          t.tx_date
        from public.warehouse_pod_transactions t
      ),
      agg as (
        select
          ac.pod_id,

          -- GST-inclusive charges/adjustments:
          coalesce(
            sum(
              case
                when tx.type in ('charge','adjustment')
                  then tx.amount * (1 + (tx.gst_rate / 100.0))
                else 0
              end
            ),
          0)::numeric(12,2) as total_charged_gross,

          -- payments are negative amounts:
          abs(
            coalesce(
              sum(case when tx.type = 'payment' then tx.amount else 0 end),
            0)
          )::numeric(12,2) as total_paid_abs,

          -- due = charged_gross + payments(negative)
          coalesce(
            sum(
              case
                when tx.type in ('charge','adjustment')
                  then tx.amount * (1 + (tx.gst_rate / 100.0))
                else tx.amount
              end
            ),
          0)::numeric(12,2) as total_due_gross,

          max(case when tx.type in ('charge','adjustment') then tx.tx_date end) as last_charge_date,
          max(case when tx.type = 'payment' then tx.tx_date end) as last_payment_date

        from active_cycle ac
        left join tx on tx.cycle_id = ac.cycle_id
        group by ac.pod_id
      )
      select
        pb.*,
        coalesce(a.total_due_gross, 0)::numeric(12,2) as total_due,
        coalesce(a.total_charged_gross, 0)::numeric(12,2) as total_charged,
        coalesce(a.total_paid_abs, 0)::numeric(12,2) as total_paid,
        a.last_charge_date,
        a.last_payment_date
      from pod_base pb
      left join agg a on a.pod_id = pb.id
      order by
        pb.next_payment_date asc nulls last,
        pb.created_at asc nulls last,
        pb.id asc
      limit $${limitParam} offset $${offsetParam};
    `;

    const res = await client.query(sql, params);

    const rows: WarehousePodSummary[] = res.rows.map((r) => {
      const totalCharged = Number(r.total_charged ?? 0);
      const totalPaid = Number(r.total_paid ?? 0);
      const totalDue = Number(r.total_due ?? 0);

      const paymentRatio =
        totalCharged <= 0 ? 1 : Math.min(1, totalPaid / totalCharged);
      const severityRatio = 1 - paymentRatio;

      return {
        id: r.id,
        client_id: r.client_id,

        name: r.name,
        email: r.email,
        contact: r.contact,

        start_date: String(r.start_date),
        billing_start_date: String(r.billing_start_date),
        duration_months: Number(r.duration_months),

        billing_interval: r.billing_interval,
        rate: Number(r.rate),
        mode_of_payment: r.mode_of_payment,

        next_charge_date: String(r.next_charge_date),
        next_payment_date: String(r.next_payment_date),

        status: r.status,

        company_name: r.company_name,
        location_name: r.location_name,

        insurance_provider: r.insurance_provider,
        insurance_value: Number(r.insurance_value ?? 0),
        insurance_idv: Number(r.insurance_idv ?? 0),

        total_due: totalDue,
        total_charged: totalCharged,
        total_paid: totalPaid,

        payment_ratio: paymentRatio,
        severity_ratio: severityRatio,
        severity_band: toBand(paymentRatio),

        last_charge_date: r.last_charge_date
          ? String(r.last_charge_date)
          : null,
        last_payment_date: r.last_payment_date
          ? String(r.last_payment_date)
          : null,
      };
    });

    return NextResponse.json({
      ok: true,
      data: {
        rows,
        meta: { status, limit, offset, count: rows.length },
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to fetch pods";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

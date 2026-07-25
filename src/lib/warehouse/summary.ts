import { db } from "@/lib/db";
import { WAREHOUSE_ACTIVE_POD_BALANCE_CTES } from "./podBalanceSql";

export type WarehouseDashboardSummary = {
  activePods: number;
  closedPods: number;
  totalOutstanding: number;
  monthlyCharges: number;
  paymentsReceived: number;
  overduePending: number;
};

export type WarehousePaymentAlertRow = {
  pod_id: string;
  client_id: string | null;
  name: string;
  contact: string;
  company_name: string | null;
  location_name: string | null;
  next_payment_date: string;
  total_due: number;
};

export async function getWarehouseDashboardSummary(): Promise<WarehouseDashboardSummary> {
  const client = await db.connect();

  try {
    const res = await client.query<{
      active_pods: string;
      closed_pods: string;
      total_outstanding: string;
      monthly_charges: string;
      payments_received: string;
      overdue_pending: string;
    }>(`
      with pod_counts as (
        select
          count(*) filter (where status = 'active')::int as active_pods,
          count(*) filter (where status = 'closed')::int as closed_pods
        from public.warehouse_pods
      ),
      active_rate_totals as (
        select coalesce(sum(rate), 0)::numeric(14,2) as monthly_charges
        from public.warehouse_pods
        where status = 'active'
      ),
      pod_base as (
        select
          p.id,
          p.status
        from public.warehouse_pods p
        where p.status = 'active'
      ),
      ${WAREHOUSE_ACTIVE_POD_BALANCE_CTES},
      active_balance_totals as (
        select
          coalesce(sum(coalesce(a.total_due_gross, 0)), 0)::numeric(14,2) as total_outstanding,
          coalesce(
            sum(
              case
                when coalesce(a.total_charged_gross, 0) <= 0 then 0
                when abs(coalesce(a.total_paid_abs, 0)) / coalesce(a.total_charged_gross, 0) < 0.3
                  then greatest(coalesce(a.total_due_gross, 0), 0)
                else 0
              end
            ),
            0
          )::numeric(14,2) as overdue_pending
        from pod_base pb
        left join agg a on a.pod_id = pb.id
      ),
      payment_totals as (
        select coalesce(sum(abs(amount)), 0)::numeric(14,2) as payments_received
        from public.warehouse_pod_transactions
        where type = 'payment'::warehouse_tx_type
      )
      select
        pc.active_pods::text,
        pc.closed_pods::text,
        abt.total_outstanding::text,
        art.monthly_charges::text,
        pt.payments_received::text,
        abt.overdue_pending::text
      from pod_counts pc
      cross join active_rate_totals art
      cross join active_balance_totals abt
      cross join payment_totals pt
    `);

    const row = res.rows[0];

    return {
      activePods: Number(row?.active_pods ?? 0),
      closedPods: Number(row?.closed_pods ?? 0),
      totalOutstanding: Number(row?.total_outstanding ?? 0),
      monthlyCharges: Number(row?.monthly_charges ?? 0),
      paymentsReceived: Number(row?.payments_received ?? 0),
      overduePending: Number(row?.overdue_pending ?? 0),
    };
  } finally {
    client.release();
  }
}

export async function listWarehousePaymentAlerts(): Promise<
  WarehousePaymentAlertRow[]
> {
  const client = await db.connect();

  try {
    const res = await client.query<WarehousePaymentAlertRow>(
      `
      with ${WAREHOUSE_ACTIVE_POD_BALANCE_CTES}
      select
        p.id::text as pod_id,
        p.client_id,
        p.name,
        p.contact,
        c.name as company_name,
        l.name as location_name,
        p.next_payment_date::date::text as next_payment_date,
        coalesce(a.total_due_gross, 0)::numeric(12,2)::float8 as total_due
      from public.warehouse_pods p
      left join public.companies c on c.id = p.company_id
      left join public.locations l on l.id = p.location_id
      left join agg a on a.pod_id = p.id
      left join public.warehouse_payment_alert_dismissals d
        on d.pod_id = p.id
       and d.next_payment_date = p.next_payment_date::date
      where p.status = 'active'::warehouse_pod_status
        and p.next_payment_date is not null
        and p.next_payment_date::date >= current_date
        and p.next_payment_date::date <= current_date + interval '5 days'
        and coalesce(a.total_due_gross, 0) > 0
        and d.id is null
      order by
        p.next_payment_date desc,
        lower(p.name) asc,
        p.client_id asc nulls last,
        p.id asc
      `
    );

    return res.rows.map((row) => ({
      ...row,
      total_due: Number(row.total_due ?? 0),
    }));
  } finally {
    client.release();
  }
}

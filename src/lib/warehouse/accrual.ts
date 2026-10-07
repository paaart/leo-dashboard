import { db } from "@/lib/db";

export type WarehouseAccrualResult = {
  requested: number;
  chargesInserted: number;
  podsUpdated: number;
};

type AccrueWarehousePodsOptions = {
  podId?: string;
  batchSize?: number;
};

const DEFAULT_BATCH_SIZE = 200;
const MAX_BATCH_SIZE = 2000;

export async function accrueWarehousePods({
  podId,
  batchSize = DEFAULT_BATCH_SIZE,
}: AccrueWarehousePodsOptions = {}): Promise<WarehouseAccrualResult> {
  const safeBatchSize = Math.min(
    Math.max(Math.trunc(batchSize) || DEFAULT_BATCH_SIZE, 1),
    MAX_BATCH_SIZE,
  );
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<{
      requested: number;
      charges_inserted: number;
      pods_updated: number;
    }>(
      `
      with due as materialized (
        select
          p.id as pod_id,
          cy.id as cycle_id,
          p.billing_start_date::date as billing_start_date,
          p.rate::numeric as rate,
          case p.billing_interval::text
            when 'monthly' then 1
            when 'quarterly' then 3
            when 'half_yearly' then 6
            when 'yearly' then 12
            else 1
          end as step_months
        from public.warehouse_pods p
        join public.warehouse_pod_cycles cy
          on cy.pod_id = p.id
         and cy.status = 'active'
        where p.status = 'active'
          and (
            $1::uuid is not null
            or (
              p.next_charge_date is not null
              and p.next_charge_date <= current_date
            )
          )
          and ($1::uuid is null or p.id = $1::uuid)
        order by p.next_charge_date asc nulls first, p.created_at asc
        limit $2
        for update of p skip locked
      ),
      charge_schedule as (
        select
          d.pod_id,
          d.cycle_id,
          d.billing_start_date,
          d.rate,
          make_date(
            extract(year from month_start)::int,
            extract(month from month_start)::int,
            least(
              extract(day from d.billing_start_date)::int,
              extract(day from (month_start + interval '1 month - 1 day'))::int
            )
          )::date as tx_date
        from due d
        cross join lateral generate_series(
          date_trunc('month', d.billing_start_date)::date,
          date_trunc('month', current_date)::date,
          make_interval(months => d.step_months)
        ) as month_start
      ),
      inserted as (
        insert into public.warehouse_pod_transactions (
          pod_id,
          cycle_id,
          type,
          amount,
          gst_rate,
          tx_date,
          tx_month,
          title,
          note,
          created_at
        )
        select
          s.pod_id,
          s.cycle_id,
          'charge'::warehouse_tx_type,
          s.rate,
          18::numeric,
          s.tx_date,
          date_trunc('month', s.tx_date)::date,
          'Auto charge',
          null,
          now()
        from charge_schedule s
        where s.tx_date >= s.billing_start_date
          and s.tx_date <= current_date
        on conflict (cycle_id, tx_month)
          where title = 'Auto charge'
        do nothing
        returning pod_id
      ),
      future_schedule as (
        select
          d.pod_id,
          make_date(
            extract(year from month_start)::int,
            extract(month from month_start)::int,
            least(
              extract(day from d.billing_start_date)::int,
              extract(day from (month_start + interval '1 month - 1 day'))::int
            )
          )::date as candidate
        from due d
        cross join lateral generate_series(
          date_trunc('month', d.billing_start_date)::date,
          date_trunc('month', current_date + interval '24 months')::date,
          make_interval(months => d.step_months)
        ) as month_start
      ),
      next_dates as (
        select pod_id, min(candidate) as next_charge_date
        from future_schedule
        where candidate > current_date
        group by pod_id
      ),
      updated as (
        update public.warehouse_pods p
        set next_charge_date = n.next_charge_date,
            next_payment_date = n.next_charge_date,
            updated_at = now()
        from next_dates n
        where p.id = n.pod_id
        returning p.id
      )
      select
        (select count(*)::int from due) as requested,
        (select count(*)::int from inserted) as charges_inserted,
        (select count(*)::int from updated) as pods_updated
      `,
      [podId ?? null, safeBatchSize],
    );

    await client.query("COMMIT");

    const row = result.rows[0];
    return {
      requested: Number(row?.requested ?? 0),
      chargesInserted: Number(row?.charges_inserted ?? 0),
      podsUpdated: Number(row?.pods_updated ?? 0),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

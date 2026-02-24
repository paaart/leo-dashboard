// src/app/api/warehouse/pods/accrue/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const podIdRaw = searchParams.get("podId");
  const podId = podIdRaw && podIdRaw.trim() ? podIdRaw.trim() : null;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Pull what we need per active pod+cycle
    const cyclesRes = await client.query<{
      cycle_id: string;
      pod_id: string;
      billing_start_date: string;
      rate: string;
      billing_interval: "monthly" | "quarterly" | "half_yearly" | "yearly";
      gst_rate_default: string | null; // optional if you later store it
    }>(
      `
      select
        cy.id as cycle_id,
        p.id as pod_id,
        p.billing_start_date::date::text as billing_start_date,
        p.rate::text as rate,
        p.billing_interval::text as billing_interval,
        null::text as gst_rate_default
      from public.warehouse_pod_cycles cy
      join public.warehouse_pods p on p.id = cy.pod_id
      where cy.status = 'active'
        and p.status = 'active'
        and ($1::uuid is null or p.id = $1::uuid)
      `,
      [podId]
    );

    for (const row of cyclesRes.rows) {
      const billingStart = row.billing_start_date; // YYYY-MM-DD
      const rate = Number(row.rate);

      // You said default GST is 18%. Keep it here for auto-charge rows.
      const gstRate = 18;

      await client.query(
        `
        with cfg as (
          select
            $1::date as billing_start,
            extract(day from $1::date)::int as anchor_day,
            case $5::text
              when 'monthly' then 1
              when 'quarterly' then 3
              when 'half_yearly' then 6
              when 'yearly' then 12
              else 1
            end as step_months
        ),
        months as (
          -- Step by billing interval months (1/3/6/12), starting from billing_start month
          select generate_series(
            date_trunc('month', (select billing_start from cfg))::date,
            date_trunc('month', current_date)::date,
            make_interval(months => (select step_months from cfg))
          )::date as month_start
        ),
        computed as (
          -- Make an anchored date each cycle month (preserve day, clamp to last day of that month)
          select
            month_start,
            make_date(
              extract(year from month_start)::int,
              extract(month from month_start)::int,
              least(
                (select anchor_day from cfg),
                extract(day from (month_start + interval '1 month - 1 day'))::int
              )
            )::date as tx_date
          from months
        ),
        filtered as (
          select tx_date
          from computed
          where tx_date >= (select billing_start from cfg)
            and tx_date <= current_date
        )
        insert into public.warehouse_pod_transactions (
          pod_id, cycle_id, type, amount, gst_rate,
          tx_date, tx_month, title, note, created_at
        )
        select
          $2::uuid,
          $3::uuid,
          'charge'::warehouse_tx_type,
          $4::numeric,
          $6::numeric,
          f.tx_date,
          date_trunc('month', f.tx_date)::date,
          'Auto charge',
          null,
          now()
        from filtered f
        on conflict (cycle_id, title, tx_month) do nothing
        `,
        [
          billingStart,
          row.pod_id,
          row.cycle_id,
          rate,
          row.billing_interval,
          gstRate,
        ]
      );

      // ✅ Update next_charge_date to the *next* scheduled anchored date after today
      const nextChargeRes = await client.query<{ next_charge_date: string }>(
        `
        with cfg as (
          select
            $1::date as billing_start,
            extract(day from $1::date)::int as anchor_day,
            case $2::text
              when 'monthly' then 1
              when 'quarterly' then 3
              when 'half_yearly' then 6
              when 'yearly' then 12
              else 1
            end as step_months
        ),
        months as (
            select generate_series(
            date_trunc('month', (select billing_start from cfg))::date,
            date_trunc('month', current_date)::date,
            interval '1 month'
            )::date as month_start
        ),
        computed as (
          select make_date(
            extract(year from month_start)::int,
            extract(month from month_start)::int,
            least(
              (select anchor_day from cfg),
              extract(day from (month_start + interval '1 month - 1 day'))::int
            )
          )::date as candidate
          from months
        )
        select candidate::text as next_charge_date
        from computed
        where candidate > current_date
          and candidate >= (select billing_start from cfg)
        order by candidate asc
        limit 1
        `,
        [billingStart, row.billing_interval]
      );

      const nextChargeDate = nextChargeRes.rows[0]?.next_charge_date ?? null;

      if (nextChargeDate) {
        await client.query(
          `
          update public.warehouse_pods
          set next_charge_date = $2::date,
              updated_at = now()
          where id = $1::uuid
          `,
          [row.pod_id, nextChargeDate]
        );
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    const e = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { ok: false, error: e.message || "Failed to accrue charges" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

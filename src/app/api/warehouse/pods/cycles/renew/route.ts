import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type InsuranceProvider = "none" | "leo";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  let body: {
    podId?: string;
    newRate?: number;
    newDurationMonths?: number;
    newInsuranceProvider?: InsuranceProvider;
    newInsuranceValue?: number;
    newInsuranceIdv?: number;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("Invalid JSON body");
  }

  const podId = String(body.podId ?? "").trim();
  const newRate = Number(body.newRate);
  const newDurationMonths = Number(body.newDurationMonths);
  const newInsuranceProvider = (body.newInsuranceProvider ??
    "none") as InsuranceProvider;
  const newInsuranceValue = Number(body.newInsuranceValue ?? 0);
  const newInsuranceIdv = Number(body.newInsuranceIdv ?? 0);

  if (!podId) return bad("podId is required");
  if (!Number.isFinite(newRate) || newRate <= 0) {
    return bad("newRate must be > 0");
  }
  if (!Number.isFinite(newDurationMonths) || newDurationMonths < 1) {
    return bad("newDurationMonths must be >= 1");
  }
  if (newInsuranceProvider !== "none" && newInsuranceProvider !== "leo") {
    return bad("newInsuranceProvider must be none or leo");
  }
  if (!Number.isFinite(newInsuranceValue) || newInsuranceValue < 0) {
    return bad("newInsuranceValue must be >= 0");
  }
  if (!Number.isFinite(newInsuranceIdv) || newInsuranceIdv < 0) {
    return bad("newInsuranceIdv must be >= 0");
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const cycleRes = await client.query<{
      cycle_id: string;
      pod_id: string;
      billing_interval: "monthly" | "quarterly" | "half_yearly" | "yearly";
    }>(
      `
      select
        cy.id as cycle_id,
        p.id as pod_id,
        p.billing_interval::text as billing_interval
      from public.warehouse_pod_cycles cy
      join public.warehouse_pods p on p.id = cy.pod_id
      where cy.status = 'active'
        and p.status = 'active'
        and p.id = $1::uuid
      order by cy.created_at desc
      limit 1
      `,
      [podId]
    );

    if (cycleRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return bad("No active cycle found for this pod", 404);
    }

    const activeCycle = cycleRes.rows[0];
    const oldCycleId = activeCycle.cycle_id;
    const billingInterval = activeCycle.billing_interval;

    const totalsRes = await client.query<{
      total_debit_gross: string;
      total_credit_abs: string;
      closing_outstanding: string;
    }>(
      `
      select
        coalesce(
          sum(
            case
              when type in ('charge', 'adjustment')
                then amount * (1 + (coalesce(gst_rate, 0) / 100.0))
              else 0
            end
          ),
          0
        )::numeric(12,2) as total_debit_gross,

        abs(
          coalesce(
            sum(case when type = 'payment' then amount else 0 end),
            0
          )
        )::numeric(12,2) as total_credit_abs,

        coalesce(
          sum(
            case
              when type in ('charge', 'adjustment')
                then amount * (1 + (coalesce(gst_rate, 0) / 100.0))
              else amount
            end
          ),
          0
        )::numeric(12,2) as closing_outstanding
      from public.warehouse_pod_transactions
      where cycle_id = $1::uuid
      `,
      [oldCycleId]
    );

    const totalDebitGross = Number(totalsRes.rows[0]?.total_debit_gross ?? 0);
    const totalCreditAbs = Number(totalsRes.rows[0]?.total_credit_abs ?? 0);
    const closingOutstandingRaw = Number(
      totalsRes.rows[0]?.closing_outstanding ?? 0
    );
    const closingOutstanding =
      closingOutstandingRaw > 0 ? closingOutstandingRaw : 0;

    await client.query(
      `
      update public.warehouse_pod_cycles
      set status = 'closed',
          updated_at = now()
      where id = $1::uuid
      `,
      [oldCycleId]
    );

    const todayRes = await client.query<{
      cycle_start: string;
      cycle_end: string;
      next_charge_date: string | null;
    }>(
      `
      with cfg as (
        select
          current_date as cycle_start,
          extract(day from current_date)::int as anchor_day,
          $1::int as duration_months,
          case $2::text
            when 'monthly' then 1
            when 'quarterly' then 3
            when 'half_yearly' then 6
            when 'yearly' then 12
            else 1
          end as step_months
      ),
      cycle_calc as (
        select
          (select cycle_start from cfg) as cycle_start,
          (
            ((select cycle_start from cfg) + make_interval(months => (select duration_months from cfg)))
            - interval '1 day'
          )::date as cycle_end
      ),
      months as (
        select generate_series(
          date_trunc('month', (select cycle_start from cfg))::date,
          date_trunc('month', (select cycle_end from cycle_calc))::date,
          make_interval(months => (select step_months from cfg))
        )::date as month_start
      ),
      computed as (
        select
          make_date(
            extract(year from month_start)::int,
            extract(month from month_start)::int,
            least(
              (select anchor_day from cfg),
              extract(day from (month_start + interval '1 month - 1 day'))::int
            )
          )::date as candidate
        from months
      )
      select
        (select cycle_start from cycle_calc)::text as cycle_start,
        (select cycle_end from cycle_calc)::text as cycle_end,
        (
          select candidate::text
          from computed
          where candidate > current_date
            and candidate >= (select cycle_start from cycle_calc)
            and candidate <= (select cycle_end from cycle_calc)
          order by candidate asc
          limit 1
        ) as next_charge_date
      `,
      [newDurationMonths, billingInterval]
    );

    const cycleStart = todayRes.rows[0].cycle_start;
    const cycleEnd = todayRes.rows[0].cycle_end;
    const nextChargeDate = todayRes.rows[0].next_charge_date ?? null;

    const newCycleRes = await client.query<{ id: string }>(
      `
      insert into public.warehouse_pod_cycles (
        pod_id,
        cycle_start,
        cycle_end,
        status,
        duration_months,
        rate_at_start,
        billing_interval_at_start,
        insurance_provider_at_start,
        insurance_value_at_start,
        insurance_idv_at_start,
        created_at,
        updated_at
      )
      values (
        $1::uuid,
        $2::date,
        $3::date,
        'active',
        $4::int,
        $5::numeric,
        $6::warehouse_billing_interval,
        $7::warehouse_insurance_provider,
        $8::numeric,
        $9::numeric,
        now(),
        now()
      )
      returning id
      `,
      [
        podId,
        cycleStart,
        cycleEnd,
        newDurationMonths,
        newRate,
        billingInterval,
        newInsuranceProvider,
        newInsuranceValue,
        newInsuranceIdv,
      ]
    );

    const newCycleId = newCycleRes.rows[0].id;

    if (closingOutstanding > 0) {
      await client.query(
        `
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
          created_at,
          updated_at
        )
        values (
          $1::uuid,
          $2::uuid,
          'adjustment'::warehouse_tx_type,
          $3::numeric,
          0,
          $4::date,
          date_trunc('month', $4::date)::date,
          'Old Outstanding',
          'Carry forward from previous cycle',
          now(),
          now()
        )
        `,
        [podId, newCycleId, closingOutstanding, cycleStart]
      );
    }

    await client.query(
      `
      update public.warehouse_pods
      set
        billing_start_date = $2::date,
        duration_months = $3::int,
        rate = $4::numeric,
        insurance_provider = $5::warehouse_insurance_provider,
        insurance_value = $6::numeric,
        insurance_idv = $7::numeric,
        next_charge_date = $8::date,
        updated_at = now()
      where id = $1::uuid
      `,
      [
        podId,
        cycleStart,
        newDurationMonths,
        newRate,
        newInsuranceProvider,
        newInsuranceValue,
        newInsuranceIdv,
        nextChargeDate,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      ok: true,
      data: {
        oldCycleId,
        newCycleId,
        cycleStart,
        cycleEnd,
        nextChargeDate,
        totalDebitGross,
        totalCreditAbs,
        closingOutstanding,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    const e = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { ok: false, error: e.message || "Failed to renew pod" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type BillingInterval = "monthly" | "quarterly" | "half_yearly" | "yearly";
type InsuranceProvider = "none" | "leo";

type CreatePodBody = {
  name: string;
  email?: string | null;
  contact: string;

  company_id?: number | null;
  location_id: number;

  start_date: string; // YYYY-MM-DD
  billing_start_date: string; // YYYY-MM-DD

  duration_months: number;
  billing_interval: BillingInterval;
  rate: number;

  mode_of_payment?: string | null;

  insurance_provider: InsuranceProvider;
  insurance_value: number;
  insurance_idv?: number | null;

  old_outstanding?: number | null;
};

function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function monthsToAdd(interval: BillingInterval) {
  switch (interval) {
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "half_yearly":
      return 6;
    case "yearly":
      return 12;
  }
}

export async function POST(req: Request) {
  let body: CreatePodBody;

  try {
    body = (await req.json()) as CreatePodBody;
  } catch {
    return bad("Invalid JSON body");
  }

  // ---- validation ----
  const name = (body.name ?? "").trim();
  const contact = (body.contact ?? "").trim();

  if (!name) return bad("name is required");
  if (!contact) return bad("contact is required");

  const rate = Number(body.rate);
  if (!Number.isFinite(rate) || rate <= 0) return bad("rate must be > 0");

  if (!Number.isInteger(body.duration_months) || body.duration_months < 1)
    return bad("duration_months must be >= 1");

  if (!Number.isInteger(body.location_id) || body.location_id <= 0)
    return bad("location_id is required");

  const allowedIntervals: BillingInterval[] = [
    "monthly",
    "quarterly",
    "half_yearly",
    "yearly",
  ];
  if (!allowedIntervals.includes(body.billing_interval))
    return bad("billing_interval invalid");

  const allowedInsurance: InsuranceProvider[] = ["none", "leo"];
  if (!allowedInsurance.includes(body.insurance_provider))
    return bad("insurance_provider invalid");

  if (!isISODate(body.start_date)) return bad("start_date must be YYYY-MM-DD");
  if (!isISODate(body.billing_start_date))
    return bad("billing_start_date must be YYYY-MM-DD");

  const email = (body.email ?? "").trim() || null;
  const modeOfPayment = (body.mode_of_payment ?? "").trim() || null;

  const oldOutstanding = Number(body.old_outstanding ?? 0);
  if (!Number.isFinite(oldOutstanding) || oldOutstanding < 0)
    return bad("old_outstanding must be >= 0");

  let insuranceValue = Number(body.insurance_value ?? 0);
  let insuranceIdv = Number(body.insurance_idv ?? 0);

  if (body.insurance_provider === "leo") {
    if (!Number.isFinite(insuranceValue) || insuranceValue < 0)
      return bad("insurance_value must be >= 0");
    if (!Number.isFinite(insuranceIdv) || insuranceIdv < 0)
      return bad("insurance_idv must be >= 0");
  } else {
    insuranceValue = 0;
    insuranceIdv = 0;
  }

  const companyId = body.company_id ?? null;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // 1) Location code
    const locRes = await client.query<{ location_code: string }>(
      `
      select upper(substr(name, 1, 3)) as location_code
      from public.locations
      where id = $1
      `,
      [body.location_id]
    );

    if (locRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return bad("Invalid location_id");
    }

    const locationCode = locRes.rows[0].location_code || "LOC";

    // 2) name_code
    const nameCode = name
      .replace(/\s+/g, "")
      .slice(0, 3)
      .toUpperCase()
      .padEnd(3, "X");

    // 3) date_code DDMMYY
    const dateCodeRes = await client.query<{ date_code: string }>(
      `select to_char($1::date, 'DDMMYY') as date_code`,
      [body.start_date]
    );
    const dateCode = dateCodeRes.rows[0].date_code;

    // 4) seq per (location_id, start_date)
    const seqRes = await client.query<{ seq: number }>(
      `
      insert into public.warehouse_client_id_seq (location_id, start_date, seq)
      values ($1, $2::date, 1)
      on conflict (location_id, start_date)
      do update set seq = public.warehouse_client_id_seq.seq + 1
      returning seq
      `,
      [body.location_id, body.start_date]
    );

    const seq = seqRes.rows[0].seq;
    const seqPadded = String(seq).padStart(2, "0");
    const clientId = `${locationCode}-${dateCode}-${nameCode}-${seqPadded}`;

    // 5) next_payment_date = billing_start_date + interval months (this is correct)
    const payMonths = monthsToAdd(body.billing_interval);
    const nextPaymentRes = await client.query<{ next_payment_date: string }>(
      `select (($1::date + make_interval(months => $2))::date)::text as next_payment_date`,
      [body.billing_start_date, payMonths]
    );
    const nextPaymentDate = nextPaymentRes.rows[0].next_payment_date;

    // 6) Insert pod (temporarily set next_charge_date = billing_start_date; we'll update after)
    const podRes = await client.query<{ id: string; client_id: string }>(
      `
      insert into public.warehouse_pods (
        client_id, name, email, contact,
        company_id, location_id,
        start_date, billing_start_date,
        duration_months, billing_interval, rate,
        mode_of_payment,
        old_outstanding,
        insurance_provider, insurance_value, insurance_idv,
        next_charge_date, next_payment_date,
        status,
        created_at, updated_at
      )
      values (
        $1, $2, $3, $4,
        $5, $6,
        $7::date, $8::date,
        $9, $10::warehouse_billing_interval, $11,
        $12,
        $13,
        $14::warehouse_insurance_provider, $15, $16,
        $17::date, $18::date,
        'active'::warehouse_pod_status,
        now(), now()
      )
      returning id, client_id
      `,
      [
        clientId,
        name,
        email,
        contact,
        companyId,
        body.location_id,
        body.start_date,
        body.billing_start_date,
        body.duration_months,
        body.billing_interval,
        rate,
        modeOfPayment,
        oldOutstanding,
        body.insurance_provider,
        insuranceValue,
        insuranceIdv,
        body.billing_start_date, // placeholder; corrected below
        nextPaymentDate,
      ]
    );

    const podId = podRes.rows[0].id;

    // 7) Create active cycle snapshot
    const cycleRes = await client.query<{ id: string; cycle_end: string }>(
      `
      insert into public.warehouse_pod_cycles (
        pod_id, cycle_start, cycle_end, status,
        duration_months,
        rate_at_start,
        billing_interval_at_start,
        insurance_provider_at_start,
        insurance_value_at_start,
        insurance_idv_at_start,
        created_at
      )
      values (
        $1,
        $2::date,
        (($2::date + make_interval(months => $3))::date - 1)::date,
        'active',
        $3,
        $4,
        $5::warehouse_billing_interval,
        $6::warehouse_insurance_provider,
        $7,
        $8,
        now()
      )
      returning id, cycle_end::text as cycle_end
      `,
      [
        podId,
        body.start_date,
        body.duration_months,
        rate,
        body.billing_interval,
        body.insurance_provider,
        insuranceValue,
        insuranceIdv,
      ]
    );

    const cycleId = cycleRes.rows[0].id;
    const cycleEnd = cycleRes.rows[0].cycle_end; // string YYYY-MM-DD

    // 8) Opening outstanding (one-time) — idempotent
    if (oldOutstanding > 0) {
      await client.query(
        `
        insert into public.warehouse_pod_transactions (
          pod_id, cycle_id, type, amount, gst_rate,
          tx_date, tx_month, title, note, created_at
        )
        select
          $1, $2,
          'charge'::warehouse_tx_type,
          $3, 0,
          $4::date,
          date_trunc('month', $4::date)::date,
          'Opening outstanding',
          'Migration: Net outstanding before billing start',
          now()
        where not exists (
          select 1
          from public.warehouse_pod_transactions t
          where t.cycle_id = $2
            and t.title = 'Opening outstanding'
        )
        `,
        [podId, cycleId, oldOutstanding, body.billing_start_date]
      );
    }

    // 9) Insurance one-time — idempotent
    if (body.insurance_provider === "leo" && insuranceValue > 0) {
      await client.query(
        `
        insert into public.warehouse_pod_transactions (
          pod_id, cycle_id, type, amount, gst_rate,
          tx_date, tx_month, title, note, created_at
        )
        select
          $1, $2,
          'charge'::warehouse_tx_type,
          $3, 0,
          $4::date,
          date_trunc('month', $4::date)::date,
          'Leo insurance',
          'One-time charge',
          now()
        where not exists (
          select 1
          from public.warehouse_pod_transactions t
          where t.cycle_id = $2
            and t.title = 'Leo insurance'
        )
        `,
        [podId, cycleId, insuranceValue, body.billing_start_date]
      );
    }

    // 10) Accrue interval-based auto-charges from billing_start_date up to current_date (idempotent)
    await client.query(
      `
      with cfg as (
        select
          $1::date as billing_start,
          $6::date as cycle_end,
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
        select generate_series(
          date_trunc('month', (select billing_start from cfg))::date,
          date_trunc('month', least(current_date, (select cycle_end from cfg)))::date,
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
          )::date as tx_date
        from months
      ),
      filtered as (
        select tx_date
        from computed
        where tx_date >= (select billing_start from cfg)
          and tx_date <= least(current_date, (select cycle_end from cfg))
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
        18,
        f.tx_date,
        date_trunc('month', f.tx_date)::date,
        'Auto charge',
        null,
        now()
      from filtered f
      where not exists (
        select 1
        from public.warehouse_pod_transactions t
        where t.cycle_id = $3
          and t.title = 'Auto charge'
          and t.tx_month = date_trunc('month', f.tx_date)::date
      )
      `,
      [
        body.billing_start_date,
        podId,
        cycleId,
        rate,
        body.billing_interval,
        cycleEnd,
      ]
    );

    // 11) Compute next_charge_date based on billing interval + anchor day (NOT 1st of next month)
    const nextChargeRes = await client.query<{ next_charge_date: string }>(
      `
      with cfg as (
        select
          $1::date as billing_start,
          $2::date as cycle_end,
          extract(day from $1::date)::int as anchor_day,
          case $3::text
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
          date_trunc('month', (select cycle_end from cfg))::date,
          make_interval(months => (select step_months from cfg))
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
        and candidate <= (select cycle_end from cfg)
      order by candidate asc
      limit 1
      `,
      [body.billing_start_date, cycleEnd, body.billing_interval]
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
        [podId, nextChargeDate]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      ok: true,
      data: { id: podId, client_id: clientId },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: msg || "Failed to create client" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

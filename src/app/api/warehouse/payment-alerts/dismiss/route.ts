import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function isISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

type DismissedPodRow = {
  id: string;
  next_payment_date: string;
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  let body: { podId?: unknown; nextPaymentDate?: unknown };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("Invalid JSON body");
  }

  const podId = String(body.podId ?? "").trim();
  const nextPaymentDate = body.nextPaymentDate;

  if (!podId) return bad("podId is required");
  if (!isISODate(nextPaymentDate)) {
    return bad("nextPaymentDate must be YYYY-MM-DD");
  }

  const client = await db.connect();

  try {
    await client.query("begin");

    const pod = await client.query<DismissedPodRow>(
      `
      with recursive pod as (
        select
          id,
          billing_interval::text as billing_interval,
          next_payment_date::date as old_next_payment_date
        from public.warehouse_pods
        where id = $1::uuid
          and status = 'active'::warehouse_pod_status
          and next_payment_date::date = $2::date
        for update
      ),
      cfg as (
        select
          id,
          old_next_payment_date,
          case billing_interval
            when 'quarterly' then 3
            when 'half_yearly' then 6
            when 'yearly' then 12
            else 1
          end as step_months
        from pod
      ),
      recursive_dates as (
        select
          id,
          old_next_payment_date as next_payment_date,
          step_months
        from cfg

        union all

        select
          id,
          (next_payment_date + make_interval(months => step_months))::date,
          step_months
        from recursive_dates
        where next_payment_date < current_date
      ),
      recalculated as (
        select
          id,
          min(next_payment_date)::date as next_payment_date
        from recursive_dates
        where next_payment_date >= current_date
        group by id
      )
      update public.warehouse_pods p
      set next_payment_date = r.next_payment_date
      from recalculated r
      where p.id = r.id
      returning p.id::text as id, p.next_payment_date::date::text as next_payment_date
      `,
      [podId, nextPaymentDate]
    );

    if (pod.rowCount === 0) {
      await client.query("rollback");
      return bad("No active alert found for this pod and payment date", 404);
    }

    const newNextPaymentDate = pod.rows[0].next_payment_date;

    await client.query(
      `
      insert into public.warehouse_payment_alert_dismissals (
        pod_id, next_payment_date, dismissed_by, dismissed_at, created_at
      )
      values ($1::uuid, $2::date, $3::uuid, now(), now())
      on conflict (pod_id, next_payment_date)
      do update set dismissed_at = excluded.dismissed_at,
                    dismissed_by = excluded.dismissed_by
      `,
      [podId, nextPaymentDate, auth.user.id]
    );

    await client.query("commit");

    return NextResponse.json({
      ok: true,
      data: {
        dismissed: true,
        pod_id: podId,
        dismissed_next_payment_date: nextPaymentDate,
        next_payment_date: newNextPaymentDate,
      },
    });
  } catch (e: unknown) {
    try {
      await client.query("rollback");
    } catch {
      // Ignore rollback errors so the original failure is returned.
    }

    const msg =
      e instanceof Error ? e.message : "Failed to dismiss payment alert";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

import { NextResponse, type NextRequest } from "next/server";
import type { PoolClient } from "pg";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function isISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function ensureDismissalsTable(client: PoolClient) {
  await client.query(`
    create table if not exists public.warehouse_payment_alert_dismissals (
      id uuid primary key default gen_random_uuid(),
      pod_id uuid not null,
      next_payment_date date not null,
      dismissed_by uuid null,
      dismissed_at timestamptz default now(),
      created_at timestamptz default now(),
      unique (pod_id, next_payment_date)
    )
  `);
}

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
    await ensureDismissalsTable(client);

    const pod = await client.query<{ id: string }>(
      `
      select id
      from public.warehouse_pods
      where id = $1::uuid
        and status = 'active'::warehouse_pod_status
        and next_payment_date::date = $2::date
      limit 1
      `,
      [podId, nextPaymentDate]
    );

    if (pod.rowCount === 0) {
      return bad("No active alert found for this pod and payment date", 404);
    }

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

    return NextResponse.json({ ok: true, data: { dismissed: true } });
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : "Failed to dismiss payment alert";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

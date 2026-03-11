import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const podId = (searchParams.get("podId") ?? "").trim();
  const cycleId = (searchParams.get("cycleId") ?? "").trim();

  if (!cycleId && !podId) {
    return bad("cycleId or podId is required");
  }

  const client = await db.connect();

  try {
    let resolvedCycleId = cycleId;

    if (!resolvedCycleId) {
      const cy = await client.query<{ id: string }>(
        `
        select id
        from public.warehouse_pod_cycles
        where pod_id = $1::uuid and status = 'active'
        order by created_at desc
        limit 1
        `,
        [podId]
      );

      if (cy.rowCount === 0) {
        return bad("No active cycle found for this pod", 404);
      }

      resolvedCycleId = cy.rows[0].id;
    }

    const res = await client.query(
      `
      select
        id,
        pod_id,
        cycle_id,
        type,
        amount::text as amount,
        gst_rate::text as gst_rate,
        tx_date::text as tx_date,
        tx_month::text as tx_month,
        title,
        note,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.warehouse_pod_transactions
      where cycle_id = $1::uuid
      order by tx_date asc, created_at asc
      `,
      [resolvedCycleId]
    );

    return NextResponse.json({
      ok: true,
      data: { cycle_id: resolvedCycleId, rows: res.rows },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to fetch transactions";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

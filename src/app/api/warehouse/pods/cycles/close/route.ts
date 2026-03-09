// src/app/api/warehouse/cycles/close/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: Request) {
  let body: { podId: string };

  try {
    body = (await req.json()) as { podId: string };
  } catch {
    return bad("Invalid JSON body");
  }

  const podId = String(body?.podId ?? "").trim();
  if (!podId) return bad("podId is required");
  const client = await db.connect();

  try {
    await client.query("BEGIN");

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
      await client.query("ROLLBACK");
      return bad("No active cycle found for this pod", 404);
    }

    const cycleId = cy.rows[0].id;

    await client.query(
      `
      update public.warehouse_pod_cycles
      set status = 'closed', updated_at = now()
      where id = $1::uuid
      `,
      [cycleId]
    );

    // stop future accrual triggers/UI hints
    await client.query(
      `
      update public.warehouse_pods
      set next_charge_date = null,
          updated_at = now()
      where id = $1::uuid
      `,
      [podId]
    );

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, data: { cycleId } });
  } catch (e: unknown) {
    await client.query("ROLLBACK");
    const msg = e instanceof Error ? e.message : "Failed to close cycle";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

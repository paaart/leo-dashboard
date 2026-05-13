import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: Request) {
  let body: {
    podId: string;
    cycleId?: string;
    amount: number; // UI sends positive
    txDate: string; // YYYY-MM-DD
    title?: string;
    note?: string | null;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("Invalid JSON body");
  }

  const podId = String(body?.podId ?? "").trim();
  const cycleIdRaw = String(body?.cycleId ?? "").trim();
  const amount = Number(body?.amount);
  const txDate = body?.txDate;
  const title = String(body?.title ?? "Payment").trim() || "Payment";
  const note = body?.note ? String(body.note).trim() : null;

  if (!podId) return bad("podId is required");
  if (!Number.isFinite(amount) || amount < 0) return bad("amount must be > 0");
  if (!isISODate(txDate)) return bad("txDate must be YYYY-MM-DD");

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    let cycleId = cycleIdRaw;

    if (cycleId) {
      const validCycle = await client.query<{ id: string }>(
        `
        select id
        from public.warehouse_pod_cycles
        where id = $1::uuid
          and pod_id = $2::uuid
        limit 1
        `,
        [cycleId, podId]
      );

      if (validCycle.rowCount === 0) {
        await client.query("ROLLBACK");
        return bad("cycleId does not belong to this pod", 404);
      }
    } else {
      const cy = await client.query<{ id: string }>(
        `
        select id
        from public.warehouse_pod_cycles
        where pod_id = $1::uuid
        order by
          case when status = 'active' then 0 else 1 end,
          created_at desc
        limit 1
        `,
        [podId]
      );

      if (cy.rowCount === 0) {
        await client.query("ROLLBACK");
        return bad("No cycle found for this pod", 404);
      }

      cycleId = cy.rows[0].id;
    }

    const signed = -Math.abs(amount);

    const ins = await client.query<{ id: string }>(
      `
      insert into public.warehouse_pod_transactions (
        pod_id, cycle_id, type, amount, gst_rate,
        tx_date, tx_month, title, note, created_at
      )
      values (
        $1::uuid, $2::uuid, 'payment'::warehouse_tx_type, $3::numeric, 0,
        $4::date, date_trunc('month', $4::date)::date, $5::text, $6::text, now()
      )
      returning id
      `,
      [podId, cycleId, signed, txDate, title, note]
    );

    await client.query("COMMIT");
    return NextResponse.json({
      ok: true,
      data: { id: ins.rows[0].id, cycleId },
    });
  } catch (e: unknown) {
    await client.query("ROLLBACK");
    const msg = e instanceof Error ? e.message : "Failed to record payment";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

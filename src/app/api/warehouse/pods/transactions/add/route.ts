import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type TxType = "charge" | "adjustment";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: Request) {
  let body: {
    podId: string;
    type: TxType;
    amount: number; // UI sends positive
    gstRate?: number; // percent (18)
    txDate: string; // YYYY-MM-DD
    title: string;
    note?: string | null;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("Invalid JSON body");
  }

  const podId = String(body?.podId ?? "").trim();
  const type = body?.type;
  const amount = Number(body?.amount);
  const gstRate = Number.isFinite(body?.gstRate) ? Number(body.gstRate) : 18;
  const txDate = body?.txDate;
  const title = String(body?.title ?? "Transaction").trim();
  const note = body?.note ? String(body.note).trim() : null;

  if (!podId) return bad("podId is required");
  if (type !== "charge" && type !== "adjustment")
    return bad("type must be charge|adjustment");
  if (!Number.isFinite(amount) || amount <= 0) return bad("amount must be > 0");
  if (!Number.isFinite(gstRate) || gstRate < 0)
    return bad("gstRate must be >= 0");
  if (!isISODate(txDate)) return bad("txDate must be YYYY-MM-DD");
  if (!title) return bad("title is required");

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // active cycle id
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

    // Insert: amount is positive. gst_rate is percent. tx_month auto via trigger.
    const ins = await client.query<{ id: string }>(
      `
      insert into public.warehouse_pod_transactions (
        pod_id, cycle_id, type, amount, gst_rate,
        tx_date, title, note, created_at, tx_month
      )
      values (
        $1::uuid, $2::uuid, $3::warehouse_tx_type, $4::numeric, $5::numeric,
        $6::date, $7::text, $8::text, now(), date_trunc('month', $6::date)::date
      )
      returning id
      `,
      [podId, cycleId, type, amount, gstRate, txDate, title, note]
    );

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, data: { id: ins.rows[0].id } });
  } catch (e: unknown) {
    await client.query("ROLLBACK");
    const msg = e instanceof Error ? e.message : "Failed to add transaction";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

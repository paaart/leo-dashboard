import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function PATCH(req: Request) {
  let body: {
    id: string;
    amount: number; // signed
    gst_rate: number; // percent
    title: string;
    note?: string | null;
    tx_date: string; // YYYY-MM-DD
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("Invalid JSON body");
  }

  const id = String(body?.id ?? "").trim();
  const amount = Number(body?.amount);
  const gstRate = Number(body?.gst_rate);
  const title = String(body?.title ?? "").trim();
  const note = body?.note ? String(body.note).trim() : null;
  const txDate = body?.tx_date;

  if (!id) return bad("id is required");
  if (!Number.isFinite(amount) || amount === 0)
    return bad("amount must be non-zero");
  if (!Number.isFinite(gstRate) || gstRate < 0)
    return bad("gst_rate must be >= 0");
  if (!title) return bad("title is required");
  if (!isISODate(txDate)) return bad("tx_date must be YYYY-MM-DD");

  const client = await db.connect();

  try {
    // Enforce payment rules:
    // - payment => amount must be negative AND gst_rate must be 0
    // - charge => amount positive
    // - adjustment => either sign
    const row = await client.query<{ type: string }>(
      `select type::text as type from public.warehouse_pod_transactions where id = $1::uuid`,
      [id]
    );
    if (row.rowCount === 0) return bad("Transaction not found", 404);

    const type = row.rows[0].type;

    if (type === "payment") {
      if (amount >= 0) return bad("payment amount must be negative");
      if (gstRate !== 0) return bad("payment gst_rate must be 0");
    }
    if (type === "charge" && amount <= 0)
      return bad("charge amount must be positive");

    const upd = await client.query(
      `
      update public.warehouse_pod_transactions
      set
        amount = $2::numeric,
        gst_rate = $3::numeric,
        title = $4::text,
        note = $5::text,
        tx_date = $6::date
      where id = $1::uuid
      returning id
      `,
      [id, amount, gstRate, title, note, txDate]
    );

    return NextResponse.json({ ok: true, data: { id: upd.rows[0].id } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update transaction";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

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
    last_known_updated_at?: string | null;
    last_known_created_at: string;
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

  const lastKnownUpdatedAt =
    body?.last_known_updated_at == null
      ? null
      : String(body.last_known_updated_at).trim();

  const lastKnownCreatedAt = String(body?.last_known_created_at ?? "").trim();

  if (!id) return bad("id is required");
  if (!Number.isFinite(amount) || amount === 0) {
    return bad("amount must be non-zero");
  }
  if (!Number.isFinite(gstRate) || gstRate < 0) {
    return bad("gst_rate must be >= 0");
  }
  if (!title) return bad("title is required");
  if (!isISODate(txDate)) return bad("tx_date must be YYYY-MM-DD");
  if (!lastKnownCreatedAt) {
    return bad("last_known_created_at is required");
  }

  const client = await db.connect();

  try {
    const row = await client.query<{
      type: string;
    }>(
      `
      select type::text as type
      from public.warehouse_pod_transactions
      where id = $1::uuid
      `,
      [id]
    );

    if (row.rowCount === 0) return bad("Transaction not found", 404);

    const type = row.rows[0].type;

    if (type === "payment") {
      if (amount >= 0) return bad("payment amount must be negative");
      if (gstRate !== 0) return bad("payment gst_rate must be 0");
    }

    if (type === "charge" && amount <= 0) {
      return bad("charge amount must be positive");
    }

    const upd = await client.query(
      `
      update public.warehouse_pod_transactions
      set
        amount = $2::numeric,
        gst_rate = $3::numeric,
        title = $4::text,
        note = $5::text,
        tx_date = $6::date,
        updated_at = now()
      where id = $1::uuid
        and (
          (
            $7::text is not null
            and updated_at::text = $7::text
          )
          or
          (
            $7::text is null
            and updated_at is null
            and created_at::text = $8::text
          )
          or
          (
            $7::text is null
            and created_at::text = $8::text
          )
        )
      returning id, updated_at::text as updated_at
      `,
      [
        id,
        amount,
        gstRate,
        title,
        note,
        txDate,
        lastKnownUpdatedAt,
        lastKnownCreatedAt,
      ]
    );

    if (upd.rowCount === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This transaction was updated by someone else. Please refresh and try again.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: upd.rows[0].id,
        updated_at: upd.rows[0].updated_at,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update transaction";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

type Body = {
  podId: string;
  oldRate: number;
  newRate: number;
  effectiveDate: string; // YYYY-MM-DD

  addExtraChargeNow?: boolean;
  extraDays?: number;
  gstRate?: number; // percent (18)
  note?: string | null;
};

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("Invalid JSON body");
  }

  const podId = (body.podId ?? "").trim();
  if (!podId) return bad("podId is required");

  const oldRate = Number(body.oldRate);
  const newRate = Number(body.newRate);
  if (!Number.isFinite(oldRate) || oldRate < 0) return bad("oldRate invalid");
  if (!Number.isFinite(newRate) || newRate <= 0) return bad("newRate invalid");

  const effectiveDate = (body.effectiveDate ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
    return bad("effectiveDate must be YYYY-MM-DD");
  }

  const isIncrease = newRate > oldRate;

  const extraDays = Number.isFinite(Number(body.extraDays))
    ? Number(body.extraDays)
    : 15;

  const gstRate = Number.isFinite(Number(body.gstRate))
    ? Number(body.gstRate)
    : 18;

  const addExtra =
    typeof body.addExtraChargeNow === "boolean"
      ? body.addExtraChargeNow
      : isIncrease;

  const note = body.note?.trim() ? body.note.trim() : null;

  const client = await db.connect();

  try {
    await client.query("begin");

    // 1) Get active cycle
    const cycleRes = await client.query<{ id: string }>(
      `
      select id
      from public.warehouse_pod_cycles
      where pod_id = $1::uuid and status = 'active'
      order by created_at desc
      limit 1
      `,
      [podId]
    );

    const cycleId = cycleRes.rows[0]?.id;
    if (!cycleId) {
      await client.query("rollback");
      return bad("No active cycle found for this pod.", 404);
    }

    // 2) Optional: create adjustment for increase
    if (isIncrease && addExtra) {
      const deltaMonthly = newRate - oldRate;
      const extraCharge = (deltaMonthly / 30) * extraDays;
      const roundedExtra = round2(extraCharge);

      if (roundedExtra > 0) {
        const title = `Additional items (mid-cycle) • ${extraDays} days`;
        const defaultNote = `Rate changed from ₹${oldRate} to ₹${newRate}. Charged partial difference for ${extraDays} days.`;

        await client.query(
          `
          insert into public.warehouse_pod_transactions
            (pod_id, cycle_id, type, amount, gst_rate, tx_date, title, note)
          values
            ($1::uuid, $2::uuid, 'adjustment', $3::numeric, $4::numeric, $5::date, $6::text, $7::text)
          `,
          [
            podId,
            cycleId,
            roundedExtra, // POSITIVE
            gstRate, // percent (18)
            effectiveDate,
            title,
            note ?? defaultNote,
          ]
        );
      }
    }

    // 3) Update recurring rate
    await client.query(
      `
      update public.warehouse_pods
      set rate = $2::numeric
      where id = $1::uuid
      `,
      [podId, newRate]
    );

    await client.query("commit");
    return NextResponse.json({ ok: true, data: { podId, newRate } });
  } catch (e: unknown) {
    await client.query("rollback");
    const msg = e instanceof Error ? e.message : "Failed to apply rate change";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const podId = (searchParams.get("podId") ?? "").trim();

  if (!podId) return bad("podId is required");

  const client = await db.connect();
  try {
    const res = await client.query(
      `
      select
        id,
        pod_id,
        cycle_start::text as cycle_start,
        cycle_end::text as cycle_end,
        status,
        duration_months,
        rate_at_start::text as rate_at_start,
        billing_interval_at_start,
        insurance_provider_at_start,
        insurance_value_at_start::text as insurance_value_at_start,
        insurance_idv_at_start::text as insurance_idv_at_start,
        created_at::text as created_at
      from public.warehouse_pod_cycles
      where pod_id = $1::uuid
      order by cycle_start desc, created_at desc
      `,
      [podId]
    );

    return NextResponse.json({ ok: true, data: { rows: res.rows } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to fetch cycles";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

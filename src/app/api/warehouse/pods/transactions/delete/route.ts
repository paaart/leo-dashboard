import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") ?? "").trim();
  if (!id) return bad("id is required");

  const client = await db.connect();
  try {
    const del = await client.query(
      `delete from public.warehouse_pod_transactions where id = $1::uuid returning id`,
      [id]
    );
    if (del.rowCount === 0) return bad("Transaction not found", 404);
    return NextResponse.json({ ok: true, data: { id: del.rows[0].id } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to delete transaction";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

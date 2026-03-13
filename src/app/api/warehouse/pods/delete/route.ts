import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const podId = String(searchParams.get("podId") ?? "").trim();

  if (!podId) {
    return bad("podId is required");
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `delete from public.warehouse_pod_transactions where pod_id = $1::uuid`,
      [podId]
    );

    await client.query(
      `delete from public.warehouse_pod_cycles where pod_id = $1::uuid`,
      [podId]
    );

    const podRes = await client.query(
      `delete from public.warehouse_pods where id = $1::uuid returning id`,
      [podId]
    );

    if (podRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return bad("Pod not found", 404);
    }

    await client.query("COMMIT");

    return NextResponse.json({
      ok: true,
      data: { id: podRes.rows[0].id },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    const e = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { ok: false, error: e.message || "Failed to delete pod" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

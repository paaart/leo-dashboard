import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function PATCH(req: Request) {
  let body: {
    podId?: string;
    name?: string;
    email?: string | null;
    contact?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("Invalid JSON body");
  }

  const podId = String(body.podId ?? "").trim();
  const name = String(body.name ?? "").trim();
  const email =
    body.email == null || String(body.email).trim() === ""
      ? null
      : String(body.email).trim();
  const contact = String(body.contact ?? "").trim();

  if (!podId) return bad("podId is required");
  if (!name) return bad("name is required");
  if (!contact) return bad("contact is required");

  const client = await db.connect();

  try {
    const res = await client.query(
      `
      update public.warehouse_pods
      set
        name = $2::text,
        email = $3::text,
        contact = $4::text,
        updated_at = now()
      where id = $1::uuid
      returning
        id,
        name,
        email,
        contact,
        updated_at::text as updated_at
      `,
      [podId, name, email, contact]
    );

    if (res.rowCount === 0) {
      return bad("Pod not found", 404);
    }

    return NextResponse.json({
      ok: true,
      data: res.rows[0],
    });
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { ok: false, error: e.message || "Failed to update client" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

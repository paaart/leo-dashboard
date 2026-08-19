import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const [companies, locations] = await Promise.all([
      db.query(
        "select id, name, is_active from public.companies where is_active = true order by name"
      ),
      db.query(
        "select id, name, is_active from public.locations where is_active = true order by name"
      ),
    ]);
    return NextResponse.json({
      ok: true,
      data: { companies: companies.rows, locations: locations.rows },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load options" },
      { status: 500 }
    );
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const status = req.nextUrl.searchParams.get("status");
  const admin = createAdminClient();

  let query = admin
    .from("profiles")
    .select(
      "id, auth_user_id, full_name, username, email, phone, role, status, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Could not load users" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data });
}

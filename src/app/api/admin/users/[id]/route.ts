import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Role = "user" | "admin";
type Status = "pending" | "active" | "inactive" | "rejected";

type UpdateBody = {
  role?: unknown;
  status?: unknown;
};

const validRoles: Role[] = ["user", "admin"];
const validStatuses: Status[] = ["pending", "active", "inactive", "rejected"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: UpdateBody;

  try {
    body = (await req.json()) as UpdateBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const updates: { role?: Role; status?: Status } = {};

  if (body.role !== undefined) {
    if (typeof body.role !== "string" || !validRoles.includes(body.role as Role)) {
      return NextResponse.json(
        { ok: false, error: "Invalid role" },
        { status: 400 }
      );
    }
    updates.role = body.role as Role;
  }

  if (body.status !== undefined) {
    if (
      typeof body.status !== "string" ||
      !validStatuses.includes(body.status as Status)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid status" },
        { status: 400 }
      );
    }
    updates.status = body.status as Status;
  }

  if (!updates.role && !updates.status) {
    return NextResponse.json(
      { ok: false, error: "No updates provided" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select(
      "id, auth_user_id, full_name, username, email, phone, role, status, created_at, updated_at"
    )
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: "Could not update user" },
      { status: error ? 500 : 404 }
    );
  }

  return NextResponse.json({ ok: true, data });
}

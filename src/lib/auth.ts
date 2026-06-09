import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteClient } from "@/lib/supabase/route";

export type AppRole = "user" | "admin";
export type AppStatus = "pending" | "active" | "inactive" | "rejected";

export type AppUser = {
  id: string;
  authUserId: string;
  email: string;
  username: string;
  fullName: string | null;
  role: AppRole;
  status: "active";
};

type ProfileRow = {
  id: string;
  auth_user_id: string;
  email: string;
  username: string;
  full_name: string | null;
  role: AppRole;
  status: AppStatus;
};

type AuthResult =
  | { ok: true; user: AppUser }
  | { ok: false; response: NextResponse };

export async function getCurrentSupabaseUser(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteClient(request, response);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;
  return data.user;
}

export async function getCurrentAppUser(
  request: NextRequest
): Promise<AppUser | null> {
  const authUser = await getCurrentSupabaseUser(request);
  if (!authUser) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, auth_user_id, email, username, full_name, role, status")
    .eq("auth_user_id", authUser.id)
    .maybeSingle<ProfileRow>();

  if (error || !data || data.status !== "active") return null;

  return {
    id: data.id,
    authUserId: data.auth_user_id,
    email: data.email,
    username: data.username,
    fullName: data.full_name,
    role: data.role,
    status: "active",
  };
}

function authError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const user = await getCurrentAppUser(request);

  if (!user) {
    return { ok: false, response: authError("Unauthorized", 401) };
  }

  return { ok: true, user };
}

export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;

  if (auth.user.role !== "admin") {
    return { ok: false, response: authError("Forbidden", 403) };
  }

  return auth;
}

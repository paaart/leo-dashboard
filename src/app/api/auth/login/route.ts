import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteClient } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });

  function jsonWithAuthCookies(
    body: Record<string, unknown>,
    init?: ResponseInit
  ) {
    const nextResponse = NextResponse.json(body, init);

    response.cookies.getAll().forEach((cookie) => {
      nextResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return nextResponse;
  }

  try {
    const body = await request.json();
    const identifier = String(body?.username ?? body?.identifier ?? "")
      .trim()
      .toLowerCase();
    const password = String(body?.password ?? "");

    if (!identifier || !password) {
      return NextResponse.json(
        { ok: false, error: "Missing username or password" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, auth_user_id, email, username, full_name, role, status")
      .eq("username", identifier)
      .limit(10);

    const profile = profiles?.find(
      (candidate) => candidate.username.toLowerCase() === identifier
    );

    if (profileError || !profile) {
      return NextResponse.json(
        { ok: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    if (profile.status !== "active") {
      return NextResponse.json(
        { ok: false, error: "Account is not active. Please contact admin." },
        { status: 403 }
      );
    }

    const supabase = createRouteClient(request, response);

    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (signInErr) {
      return NextResponse.json(
        { ok: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    if (!data.user) {
      await supabase.auth.signOut();
      return jsonWithAuthCookies(
        { ok: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    if (data.user.id !== profile.auth_user_id) {
      await supabase.auth.signOut();
      return jsonWithAuthCookies(
        { ok: false, error: "Account profile mismatch" },
        { status: 403 }
      );
    }

    return jsonWithAuthCookies(
      {
        ok: true,
        user: {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          fullName: profile.full_name,
          role: profile.role,
          status: profile.status,
        },
      }
    );
  } catch (err) {
    console.error("LOGIN ROUTE CRASH:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

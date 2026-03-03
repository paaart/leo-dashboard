import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteClient } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const isDev = process.env.NODE_ENV !== "production";

  try {
    if (isDev) {
      console.log("HIT /api/auth/login");
      console.log("ENV CHECK", {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      });
    }

    const body = await request.json();
    const employeeCode = String(body?.employeeCode ?? "").trim();
    const password = String(body?.password ?? "");

    if (!employeeCode || !password) {
      return NextResponse.json(
        { ok: false, error: "Missing employee code or password" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: emp, error: empErr } = await admin
      .from("employees")
      .select("email")
      .eq("employee_code", employeeCode)
      .maybeSingle();

    if (empErr) {
      return NextResponse.json(
        { ok: false, error: `Employee lookup failed: ${empErr.message}` },
        { status: 500 }
      );
    }

    if (!emp?.email) {
      return NextResponse.json(
        { ok: false, error: "Invalid employee code" },
        { status: 401 }
      );
    }

    const supabase = createRouteClient(request, response);

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: emp.email,
      password,
    });

    if (signInErr) {
      return NextResponse.json(
        { ok: false, error: `Login failed: ${signInErr.message}` },
        { status: 401 }
      );
    }

    return response;
  } catch (err) {
    console.error("LOGIN ROUTE CRASH:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

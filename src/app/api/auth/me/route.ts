import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ ok: true });

  const supabase = createRouteClient(request, response);
  const { data, error } = await supabase.auth.getUser();

  console.log(data.user);

  if (error || !data?.user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: { id: data.user.id, email: data.user.email ?? null },
  });
}

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicRoute } from "@/lib/auth-routes";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    isPublicRoute(pathname)
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Hard 24h session limit: the marker cookie is set at login with a 24h
  // maxAge and its timestamp is validated here, so sessions cannot outlive
  // it via Supabase token refresh.
  const sessionStart = request.cookies.get(SESSION_START_COOKIE)?.value;
  const startedAt = Number(sessionStart);

  if (
    !sessionStart ||
    !Number.isFinite(startedAt) ||
    Date.now() - startedAt > SESSION_MAX_AGE_MS
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("expired", "1");

    const redirect = NextResponse.redirect(url);
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith("sb-")) redirect.cookies.delete(name);
    });
    redirect.cookies.delete(SESSION_START_COOKIE);
    return redirect;
  }

  return response;
}

const SESSION_START_COOKIE = "leo_session_start";
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

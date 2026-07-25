import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/*
  Read-only Supabase client for React Server Components. Cookie writes are
  a no-op here — token refresh happens in middleware, which runs on every
  page request before the RSC render.
*/
export async function createServerComponentClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* read-only in server components */
        },
      },
    }
  );
}

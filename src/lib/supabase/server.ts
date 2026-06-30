// Supabase server client (Server Components, Server Actions, Route Handlers).
// Reads the auth session from the request cookies via @supabase/ssr and uses
// the anon key, so Row-Level Security applies to every query made through it.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // `set` throws when called from a Server Component (read-only cookie
          // store). That's fine: the session is refreshed by proxy.ts and in
          // Server Actions / Route Handlers, where setting cookies is allowed.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // ignore — see comment above
          }
        },
      },
    },
  );
}

// Data Access Layer — centralizes auth verification (per the Next.js auth guide).
// `server-only` + React `cache()` so the session is checked at most once per
// render pass and can never leak into a Client Component. RLS is the real
// security boundary; this is defense-in-depth and the source of the owner's
// identity for the dashboard.
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * The authenticated user, or null. Uses `getUser()` (not `getSession()`) so the
 * JWT is validated against the Supabase auth server, not just decoded from the
 * cookie. Safe to call anywhere; does not redirect.
 */
export const getOptionalUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Require an authenticated owner. Redirects to /login when there is no session.
 * Use at the top of protected pages, Server Actions, and Route Handlers — never
 * rely on proxy.ts redirects alone (those are optimistic only).
 */
export const verifySession = cache(async (): Promise<User> => {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
});

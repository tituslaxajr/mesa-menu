// Supabase service-role client — BYPASSES Row-Level Security.
// `server-only` guarantees this can never be imported into a Client Component
// and shipped to the browser. Use ONLY for trusted server paths that must skip
// RLS: the PayMongo webhook (writing accounts.plan) and admin/seed scripts.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

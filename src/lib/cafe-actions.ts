"use server";
// Owner onboarding: create the first café for the logged-in owner's account.
// Re-verifies the session and resolves the account server-side (never trusts the
// client); RLS (cafes_owner_insert / brand_kits + menu_tags manage) is the real
// guard. Slug uniqueness is enforced by the DB unique constraint — we catch the
// violation rather than racing a pre-check (and unpublished collisions aren't
// even visible to a SELECT under RLS).
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { DIET_TAGS, type PlanId } from "@/lib/data";

const PLAN_IDS: PlanId[] = ["starter", "brew", "roast"];

const RESERVED = new Set([
  "demo", "demo-starter", "dashboard", "api", "m", "login", "signup", "admin", "new", "app", "www",
]);

/** Lowercase, hyphenate, strip junk; cap length. Mirrors a URL-safe café slug. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export interface CafeFormState {
  error?: string;
}

export async function createCafe(
  _prev: CafeFormState | undefined,
  formData: FormData,
): Promise<CafeFormState> {
  const user = await verifySession();
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  const planRaw = String(formData.get("plan") ?? "");
  const plan: PlanId = (PLAN_IDS as string[]).includes(planRaw) ? (planRaw as PlanId) : "starter";

  if (!name) return { error: "Please enter your café's name." };
  if (!slug) return { error: "Please enter a link using letters and numbers." };
  if (RESERVED.has(slug)) return { error: `“${slug}” is reserved — please pick another link.` };

  const supabase = await createClient();

  const { data: mem } = await supabase
    .from("cafe_members")
    .select("account_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!mem) return { error: "No account is linked to your login. Try signing out and back in." };
  const accountId = (mem as { account_id: string }).account_id;

  // Apply the chosen tier first — the RPC only allows it before any café exists,
  // which enforces "tier is picked at registration, not switched later".
  const planRes = await supabase.rpc("set_account_plan", { p_plan: plan });
  if (planRes.error) return { error: planRes.error.message };

  const { data: cafe, error } = await supabase
    .from("cafes")
    .insert({
      account_id: accountId,
      slug,
      name,
      theme: "warm",
      published: true,
      accepting_orders: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: `The link “/m/${slug}” is taken — try another.` };
    return { error: error.message };
  }

  const cafeId = (cafe as { id: string }).id;
  // Brand kit (defaults) + the preset dietary tags, so the menu editor has them.
  await supabase.from("brand_kits").insert({ cafe_id: cafeId });
  await supabase.from("menu_tags").insert(
    DIET_TAGS.map((t) => ({
      cafe_id: cafeId,
      key: t.id,
      label: t.label,
      emoji: t.emoji,
      is_preset: true,
    })),
  );

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

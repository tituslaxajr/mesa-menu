"use server";
// Owner onboarding ("Day One"): create the first café for the logged-in
// owner's account. Re-verifies the session and resolves the account
// server-side (never trusts the client); RLS (cafes_owner_insert /
// brand_kits + menu_tags manage) is the real guard. Slug uniqueness is
// enforced by the DB unique constraint — we catch the violation rather than
// racing a pre-check (and unpublished collisions aren't even visible to a
// SELECT under RLS).
//
// Instead of redirecting, a successful create returns { createdSlug } so the
// client can show the magic moment — the real QR, live right now — before
// entering the dashboard.
import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { DIET_TAGS, MENU, STARTER_CATALOG, THEMES, type MenuItem, type ThemeKey } from "@/lib/data";
import { hoursDisplay, DEFAULT_HOURS } from "@/lib/day-phase";
import { saveMenu } from "@/lib/studio-actions";

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
  /** Set on success — the client shows the live-QR magic moment. */
  createdSlug?: string;
}

/** Picked chips from the onboarding menu builder. */
interface PickedItem {
  name: string;
  price: number;
  cat: string;
}

export async function createCafe(
  _prev: CafeFormState | undefined,
  formData: FormData,
): Promise<CafeFormState> {
  const user = await verifySession();
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  const themeRaw = String(formData.get("theme") ?? "warm");
  const theme: ThemeKey = THEMES.some((t) => t.key === themeRaw) ? (themeRaw as ThemeKey) : "warm";
  const start = String(formData.get("start") ?? "picker");

  // Structured hours from the "When are you open?" step; defaults guard junk.
  const openMin = Number(formData.get("openMin"));
  const closeMin = Number(formData.get("closeMin"));
  const hours =
    Number.isInteger(openMin) && Number.isInteger(closeMin) &&
    openMin >= 0 && openMin <= 1439 && closeMin >= 0 && closeMin <= 1439 && closeMin > openMin
      ? { openMin, closeMin }
      : DEFAULT_HOURS;

  // Chip-picked items (JSON), validated server-side.
  let picked: PickedItem[] = [];
  if (start === "picker") {
    try {
      const raw = JSON.parse(String(formData.get("items") ?? "[]")) as unknown;
      if (Array.isArray(raw)) {
        picked = raw
          .map((r) => ({
            name: String((r as PickedItem).name ?? "").slice(0, 60).trim(),
            price: Math.max(0, Math.min(100000, Number((r as PickedItem).price) || 0)),
            cat: String((r as PickedItem).cat ?? "Menu").slice(0, 40).trim() || "Menu",
          }))
          .filter((r) => r.name)
          .slice(0, 60);
      }
    } catch {
      /* malformed picker payload → treated as empty; validated below */
    }
  }

  if (!name) return { error: "Please enter your café's name." };
  if (!slug) return { error: "Please enter a link using letters and numbers." };
  if (RESERVED.has(slug)) return { error: `“${slug}” is reserved — please pick another link.` };
  if (start === "picker" && !picked.length) return { error: "Tap at least one item you sell — or load the sample menu." };

  const supabase = await createClient();

  const { data: mem } = await supabase
    .from("cafe_members")
    .select("account_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!mem) return { error: "No account is linked to your login. Try signing out and back in." };
  const accountId = (mem as { account_id: string }).account_id;

  // Everyone starts on Brew (beta): the full experience with no picker
  // friction at onboarding. Testers switch tiers any time in Plan.
  const planRes = await supabase.rpc("set_account_plan", { p_plan: "brew" });
  if (planRes.error) return { error: planRes.error.message };

  const { data: cafe, error } = await supabase
    .from("cafes")
    .insert({
      account_id: accountId,
      slug,
      name,
      theme,
      hours: hoursDisplay(hours),
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
  // Structured hours are best-effort until migration 0010 is applied — the
  // display string above is already saved, so the phase engine still works
  // (it parses the text as a fallback).
  await supabase.from("cafes").update({ open_min: hours.openMin, close_min: hours.closeMin }).eq("id", cafeId);
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

  // Seed the menu: chip-picked items (the default path), the full sample, or
  // blank. Non-fatal if it fails — the café exists; the owner can add items
  // or use the empty-menu "Start with a sample menu" action in the dashboard.
  if (start === "picker" && picked.length) {
    const items: MenuItem[] = picked.map((p, i) => {
      const stock = STARTER_CATALOG.find((s) => s.name === p.name);
      return { id: `item-${i}`, cat: p.cat, name: p.name, price: p.price, desc: "", img: stock?.img ?? "" };
    });
    const cats = ["All", ...Array.from(new Set(items.map((m) => m.cat)))];
    await saveMenu(cafeId, cats, items);
  } else if (start === "sample") {
    const sampleCategories = ["All", ...Array.from(new Set(MENU.map((m) => m.cat)))];
    await saveMenu(cafeId, sampleCategories, MENU);
  }

  // No revalidatePath here: /dashboard is dynamic (rendered on demand), and
  // revalidating would re-render /dashboard/new mid-action — whose server
  // redirect would skip the live-QR magic moment this action's return powers.
  return { createdSlug: slug };
}

"use server";
// Studio persistence — Server Actions the owner dashboard calls (debounced) to
// save edits to Supabase. Each re-verifies the session; authorization is RLS
// (manage policies) / the save_cafe_menu ownership check. cafeId comes from the
// client but a non-owner simply can't write (RLS), so it's IDOR-safe.
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { BrandKit, Cafe, MenuItem, PlanId, Promo, ThemeKey } from "@/lib/data";

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveBrand(cafeId: string, brand: BrandKit): Promise<SaveResult> {
  await verifySession();
  const supabase = await createClient();
  const { error } = await supabase
    .from("brand_kits")
    .update({
      logo: brand.logo,
      accent: brand.accent,
      palette_id: brand.paletteId,
      heading_font: brand.headingFont,
      body_font: brand.bodyFont,
      pairing_id: brand.pairingId,
      color_mode: brand.colorMode,
      surface: brand.surface,
      surface_id: brand.surfaceId,
      shape: brand.shape,
    })
    .eq("cafe_id", cafeId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function saveCafeProfile(
  cafeId: string,
  cafe: Pick<Cafe, "name" | "tagline" | "intro" | "hours" | "openMin" | "closeMin" | "acceptingOrders" | "orderMode">,
  theme: ThemeKey,
): Promise<SaveResult> {
  await verifySession();
  const supabase = await createClient();
  const { error } = await supabase
    .from("cafes")
    .update({
      name: cafe.name,
      tagline: cafe.tagline,
      intro: cafe.intro,
      hours: cafe.hours,
      open_min: cafe.openMin ?? null,
      close_min: cafe.closeMin ?? null,
      theme,
      order_mode: cafe.orderMode ?? null,
      accepting_orders: cafe.acceptingOrders ?? true,
    })
    .eq("id", cafeId);
  if (!error) revalidatePath(`/m/[slug]`, "page");
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function savePromos(cafeId: string, promos: Promo[]): Promise<SaveResult> {
  await verifySession();
  const supabase = await createClient();
  // Small set; replace wholesale (RLS scopes both ops to this café).
  const del = await supabase.from("promos").delete().eq("cafe_id", cafeId);
  if (del.error) return { ok: false, error: del.error.message };
  if (promos.length) {
    const { error } = await supabase.from("promos").insert(
      promos.map((p, i) => ({
        cafe_id: cafeId,
        title: p.title,
        descr: p.desc,
        period: p.period,
        active: p.active,
        tone: p.tone,
        position: i,
      })),
    );
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

// BETA: switch the owner's account to any tier (no payment). See migration 0009.
export async function setPlan(plan: PlanId): Promise<SaveResult> {
  await verifySession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_account_plan", { p_plan: plan });
  if (!error) revalidatePath("/dashboard");
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function saveMenu(
  cafeId: string,
  categories: string[],
  items: MenuItem[],
): Promise<SaveResult> {
  await verifySession();
  const supabase = await createClient();
  const p_categories = categories.filter((c) => c !== "All");
  const p_items = items.map((it) => ({
    name: it.name,
    price: Number(it.price) || 0,
    descr: it.desc ?? "",
    img: it.img ?? "",
    badge: it.badge ?? "",
    sold_out: !!it.soldOut,
    best: !!it.best,
    cat: it.cat,
    options: (it.options ?? []).map((g) => ({
      label: g.label,
      required: !!g.required,
      multi: !!g.multi,
      choices: (g.choices ?? []).map((c) => ({ label: c.label, price_delta: c.priceDelta ?? 0 })),
    })),
    tags: (it.tags ?? []).map((t) => ({ key: t.id, label: t.label, emoji: t.emoji ?? null })),
  }));

  const { error } = await supabase.rpc("save_cafe_menu", {
    p_cafe_id: cafeId,
    p_categories,
    p_items,
  });
  if (!error) revalidatePath(`/m/[slug]`, "page");
  return error ? { ok: false, error: error.message } : { ok: true };
}

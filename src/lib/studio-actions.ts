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
  cafe: Pick<Cafe, "name" | "tagline" | "intro" | "hours" | "cover" | "openMin" | "closeMin" | "acceptingOrders" | "orderMode" | "recordSales" | "posEnabled" | "serviceChargeRate">,
  theme: ThemeKey,
): Promise<SaveResult> {
  await verifySession();
  const supabase = await createClient();
  const base = {
    name: cafe.name,
    tagline: cafe.tagline,
    intro: cafe.intro,
    hours: cafe.hours,
    // Empty string (owner removed the cover) persists as NULL so the public
    // menu falls back to its placeholder instead of a broken <img>.
    cover: cafe.cover || null,
    theme,
    order_mode: cafe.orderMode ?? null,
    accepting_orders: cafe.acceptingOrders ?? true,
  };
  const extended = {
    ...base,
    open_min: cafe.openMin ?? null,
    close_min: cafe.closeMin ?? null,
    record_sales: cafe.recordSales ?? false,
    pos_enabled: cafe.posEnabled ?? false,
    service_charge_rate: cafe.serviceChargeRate ?? 0,
  };
  let { error } = await supabase.from("cafes").update(extended).eq("id", cafeId);
  // Pre-migration DBs (0010 hours / 0011 record_sales / 0016 POS) miss the new
  // columns — retry without them so profile saves keep working (hours text
  // still saves, and the phase engine falls back to parsing it).
  if (error && /open_min|close_min|record_sales|pos_enabled|service_charge_rate/.test(error.message)) {
    ({ error } = await supabase.from("cafes").update(base).eq("id", cafeId));
  }
  if (!error) revalidatePath(`/m/[slug]`, "page");
  return error ? { ok: false, error: error.message } : { ok: true };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function savePromos(cafeId: string, promos: Promo[]): Promise<SaveResult> {
  await verifySession();
  const supabase = await createClient();
  // Upsert by id so promo ids stay stable across saves — discounts snapshot
  // promo titles onto orders, and stable ids keep edits from churning rows.
  // Legacy client ids ("promo-<ts>") aren't uuids; give them one here.
  const rows = promos.map((p, i) => ({
    id: UUID_RE.test(p.id) ? p.id : crypto.randomUUID(),
    cafe_id: cafeId,
    title: p.title,
    descr: p.desc,
    period: p.period,
    active: p.active,
    tone: p.tone,
    position: i,
    discount_type: p.discount?.type ?? "none",
    discount_value: p.discount?.value ?? 0,
    applies_to: p.discount?.appliesTo ?? "all",
    target_categories: p.discount?.targetCategories ?? [],
    target_items: p.discount?.targetItems ?? [],
    days_of_week: p.schedule?.daysOfWeek ?? null,
    start_min: p.schedule?.startMin ?? null,
    end_min: p.schedule?.endMin ?? null,
    start_date: p.schedule?.startDate ?? null,
    end_date: p.schedule?.endDate ?? null,
  }));
  if (rows.length) {
    let { error } = await supabase.from("promos").upsert(rows, { onConflict: "id" });
    // Pre-0014 DBs miss the discount/schedule columns — retry with the legacy
    // shape so banner edits keep saving (same pattern as saveCafeProfile).
    if (error && /discount_type|applies_to|days_of_week/.test(error.message)) {
      const legacy = rows.map(({ id, cafe_id, title, descr, period, active, tone, position }) =>
        ({ id, cafe_id, title, descr, period, active, tone, position }));
      ({ error } = await supabase.from("promos").upsert(legacy, { onConflict: "id" }));
    }
    if (error) return { ok: false, error: error.message };
  }
  // Drop promos the owner deleted (RLS scopes this to their café).
  const del = rows.length
    ? await supabase.from("promos").delete().eq("cafe_id", cafeId)
        .not("id", "in", `(${rows.map((r) => r.id).join(",")})`)
    : await supabase.from("promos").delete().eq("cafe_id", cafeId);
  if (del.error) return { ok: false, error: del.error.message };
  revalidatePath(`/m/[slug]`, "page");
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

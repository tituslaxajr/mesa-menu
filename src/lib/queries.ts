// ============================================================================
// Mesa — server-side read path (the live BACKEND SEAM)
// Reads café content from Supabase via the anon client, so Row-Level Security
// applies (only PUBLISHED cafés are visible to guests). Everything is mapped
// back into the exact DTO shapes the UI already expects (see src/lib/data.ts),
// so MenuBrowser and the themes are unchanged. Timestamps → epoch-ms; storage
// paths → public URLs are handled where relevant.
// ============================================================================
import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_BRAND,
  type BrandKit,
  type Cafe,
  type MenuItem,
  type MenuTag,
  type OptionGroup,
  type PlanId,
  type Promo,
  type ThemeKey,
} from "@/lib/data";

// Neutral 8×6 beige block for missing cover/item photos — avoids `<img src="">`,
// which makes the browser re-fetch the whole page in a loop. Reads as "no photo
// yet" until the owner adds one.
const IMG_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="6"><rect width="8" height="6" fill="#ece2d4"/></svg>');

// One menu item + its nested options & tags. Shared by the public read path and
// the owner dashboard read so the shapes never drift.
const MENU_SELECT =
  "id, name, price, descr, img, badge, sold_out, best, position, category:categories(name), option_groups(id, label, required, multi, position, option_choices(id, label, price_delta, position)), menu_item_tags(menu_tags(key, label, emoji))";

/** All the content the guest menu page needs for one café, in one fetch. */
export interface CafeData {
  cafe: Cafe;
  menu: MenuItem[];
  categories: string[];
  brand: BrandKit;
  promos: Promo[];
}

// ---- row → DTO mappers -----------------------------------------------------

interface CafeRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  intro: string;
  hours: string;
  cover: string | null;
  theme: ThemeKey;
  order_mode: Cafe["orderMode"] | null;
  accepting_orders: boolean;
  plan: Cafe["plan"];
}

function toCafe(r: CafeRow): Cafe {
  return {
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    intro: r.intro,
    hours: r.hours,
    cover: r.cover || IMG_PLACEHOLDER,
    plan: r.plan,
    theme: r.theme,
    orderMode: r.order_mode ?? undefined,
    acceptingOrders: r.accepting_orders,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toMenuItem(r: any): MenuItem {
  const options: OptionGroup[] | undefined = (r.option_groups ?? [])
    .slice()
    .sort((a: any, b: any) => a.position - b.position)
    .map((g: any) => ({
      id: g.id,
      label: g.label,
      required: g.required || undefined,
      multi: g.multi || undefined,
      choices: (g.option_choices ?? [])
        .slice()
        .sort((a: any, b: any) => a.position - b.position)
        .map((c: any) => ({
          id: c.id,
          label: c.label,
          priceDelta: c.price_delta || undefined,
        })),
    }));

  const tags: MenuTag[] = (r.menu_item_tags ?? [])
    .map((t: any) => t.menu_tags)
    .filter(Boolean)
    .map((t: any) => ({ id: t.key, label: t.label, emoji: t.emoji ?? undefined }));

  return {
    id: r.id,
    cat: r.category?.name ?? "",
    name: r.name,
    price: r.price,
    desc: r.descr,
    img: r.img || IMG_PLACEHOLDER,
    badge: r.badge ?? undefined,
    soldOut: r.sold_out || undefined,
    best: r.best || undefined,
    options: options && options.length > 0 ? options : undefined,
    tags: tags.length > 0 ? tags : undefined,
  };
}

function toBrand(r: any | null): BrandKit {
  if (!r) return DEFAULT_BRAND;
  return {
    logo: r.logo ?? null,
    accent: r.accent,
    paletteId: r.palette_id,
    headingFont: r.heading_font,
    bodyFont: r.body_font,
    pairingId: r.pairing_id,
    colorMode: r.color_mode,
    surface: r.surface ?? null,
    surfaceId: r.surface_id,
    shape: r.shape,
  };
}

function toPromo(r: any): Promo {
  return {
    id: r.id,
    title: r.title,
    desc: r.descr,
    period: r.period,
    active: r.active,
    tone: r.tone,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---- accessors (BACKEND SEAM, now DB-backed) -------------------------------

/** Café profile only — used by generateMetadata. Null if not found/published. */
export const getCafe = cache(async (slug: string): Promise<Cafe | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cafe_public")
    .select(
      "id, slug, name, tagline, intro, hours, cover, theme, order_mode, accepting_orders, plan",
    )
    .eq("slug", slug)
    .maybeSingle();
  return data ? toCafe(data as CafeRow) : null;
});

/** Everything the guest menu needs for one café in a single round of queries. */
export const getCafeData = cache(async (slug: string): Promise<CafeData | null> => {
  const supabase = await createClient();

  const { data: cafeRow } = await supabase
    .from("cafe_public")
    .select(
      "id, slug, name, tagline, intro, hours, cover, theme, order_mode, accepting_orders, plan",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!cafeRow) return null;

  const cafeId = (cafeRow as CafeRow & { id: string }).id;

  const [cats, items, brand, promos] = await Promise.all([
    supabase.from("categories").select("name, position").eq("cafe_id", cafeId).order("position"),
    supabase.from("menu_items").select(MENU_SELECT).eq("cafe_id", cafeId).order("position"),
    supabase.from("brand_kits").select("*").eq("cafe_id", cafeId).maybeSingle(),
    supabase.from("promos").select("*").eq("cafe_id", cafeId).order("position"),
  ]);

  return {
    cafe: toCafe(cafeRow as CafeRow),
    categories: ["All", ...((cats.data ?? []).map((c) => c.name as string))],
    menu: (items.data ?? []).map(toMenuItem),
    brand: toBrand(brand.data),
    promos: (promos.data ?? []).map(toPromo),
  };
});

/**
 * The logged-in owner's café + its content for the dashboard. Unlike the public
 * read path, this reads the owner's OWN café (drafts included, unpublished ok)
 * by resolving their account from cafe_members — RLS member policies authorize
 * it. Returns null when the owner has no café yet (→ onboarding).
 */
export const getOwnerCafeData = cache(
  async (): Promise<{ data: CafeData; planId: PlanId } | null> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: mem } = await supabase
      .from("cafe_members")
      .select("account_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!mem) return null;
    const accountId = (mem as { account_id: string }).account_id;

    const { data: acct } = await supabase
      .from("accounts")
      .select("plan")
      .eq("id", accountId)
      .maybeSingle();
    const planId = ((acct as { plan?: PlanId } | null)?.plan ?? "starter") as PlanId;

    // The owner's own café — scoped to their account (not the public view, so
    // unpublished drafts are included). First location for now (1 for Brew).
    const { data: cafeRows } = await supabase
      .from("cafes")
      .select("id, slug, name, tagline, intro, hours, cover, theme, order_mode, accepting_orders")
      .eq("account_id", accountId)
      .order("position")
      .limit(1);
    const cafeRow = cafeRows?.[0] as (Omit<CafeRow, "plan"> & { id: string }) | undefined;
    if (!cafeRow) return null; // owner exists but hasn't created a café → onboarding

    const cafeId = cafeRow.id;
    const [cats, items, brand, promos] = await Promise.all([
      supabase.from("categories").select("name, position").eq("cafe_id", cafeId).order("position"),
      supabase.from("menu_items").select(MENU_SELECT).eq("cafe_id", cafeId).order("position"),
      supabase.from("brand_kits").select("*").eq("cafe_id", cafeId).maybeSingle(),
      supabase.from("promos").select("*").eq("cafe_id", cafeId).order("position"),
    ]);

    return {
      planId,
      data: {
        cafe: toCafe({ ...cafeRow, plan: planId } as CafeRow),
        categories: ["All", ...((cats.data ?? []).map((c) => c.name as string))],
        menu: (items.data ?? []).map(toMenuItem),
        brand: toBrand(brand.data),
        promos: (promos.data ?? []).map(toPromo),
      },
    };
  },
);

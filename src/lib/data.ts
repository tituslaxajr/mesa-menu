// ============================================================================
// Mesa — mock data layer
// Front-end-only sample content (no backend this pass). Everything a real API
// or database would return lives here behind small accessor functions so the
// swap-in point is obvious. See the `// BACKEND SEAM` comments.
// ============================================================================

const U = (id: string, w = 600) =>
  `https://images.unsplash.com/${id}?w=${w}&q=72&auto=format&fit=crop`;

// ---- Types -----------------------------------------------------------------

/** The five guest-menu layouts an owner can choose from. */
export type ThemeKey = "warm" | "minimal" | "bold" | "soft" | "playful";

/**
 * How guests order:
 *  - "browse"  — menu only, no cart.
 *  - "counter" — guest builds a cart → summary screen to show staff (for cafés
 *    that run their own POS; Mesa logs it for analytics but not the kitchen board).
 *  - "kitchen" — full Mesa ordering: orders flow to the live Orders board.
 */
export type OrderMode = "browse" | "counter" | "kitchen";

export interface Cafe {
  slug: string;
  name: string;
  tagline: string;
  /** One warm sentence shown on logo-led themes (minimal/soft/playful). */
  intro: string;
  hours: string;
  cover: string;
  /** Which subscription tier the café is on (gates ordering, themes, etc.). */
  plan: PlanId;
  /** The guest-menu theme the owner picked. */
  theme: ThemeKey;
  /** How guests order. Undefined = legacy default (kitchen if the plan allows
   *  ordering, else browse). "kitchen" requires an ordering plan; "counter" works
   *  on any plan. */
  orderMode?: OrderMode;
  /**
   * Owner switch to pause guest ordering (e.g. kitchen closed / too busy).
   * When false, the menu is browse-only regardless of orderMode.
   */
  acceptingOrders?: boolean;
}

/** One selectable choice within an OptionGroup (e.g. "Large", "Oat milk"). */
export interface OptionChoice {
  id: string;
  label: string;
  /** Price added to the item's base price when chosen, in ₱. Default 0. */
  priceDelta?: number;
}

/** A group of choices on an item (e.g. "Size", "Milk", "Add-ons"). */
export interface OptionGroup {
  id: string;
  label: string;
  /** Single-select groups: must pick one (defaults to the first choice). */
  required?: boolean;
  /** true = multi-select (checkboxes, e.g. add-ons); false = single-select. */
  multi?: boolean;
  choices: OptionChoice[];
}

export interface MenuItem {
  id: string;
  cat: string;
  name: string;
  price: number;
  desc: string;
  img: string;
  badge?: string;
  soldOut?: boolean;
  best?: boolean;
  /** Customizations shown in the item detail sheet. Optional — plain items omit it. */
  options?: OptionGroup[];
  /** Dietary / allergen / custom tags. Self-contained (label + emoji) so custom
   *  ones render everywhere without a registry. Shown on cards + the detail. */
  tags?: MenuTag[];
}

/** A menu tag — a preset (vegetarian, etc.) or an owner's custom one (e.g. Keto). */
export interface MenuTag {
  id: string;
  label: string;
  emoji?: string;
}

/** Curated quick-add tags. Owners can also create custom tags (e.g. Keto 🥑). */
export const DIET_TAGS: MenuTag[] = [
  { id: "vegetarian", label: "Vegetarian", emoji: "🥬" },
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "spicy", label: "Spicy", emoji: "🌶️" },
  { id: "nuts", label: "Contains nuts", emoji: "🥜" },
  { id: "dairy", label: "Contains dairy", emoji: "🥛" },
  { id: "gluten", label: "Contains gluten", emoji: "🌾" },
];
/** Build a preset tag object by id (for seeding items). */
const dt = (id: string): MenuTag => DIET_TAGS.find((t) => t.id === id)!;

/**
 * Migrate an item whose `tags` were saved in the legacy `string[]` shape (tag
 * ids) to `MenuTag[]`. Preset ids resolve to their label+emoji; unknown strings
 * become `{id, label}`. Items already in the new shape pass through unchanged.
 * Apply when loading items from storage so old café menus don't render blank.
 */
export function normalizeTags(item: MenuItem): MenuItem {
  const raw = item.tags as unknown;
  if (!Array.isArray(raw) || raw.length === 0) return item;
  let changed = false;
  const tags: MenuTag[] = raw.map((t) => {
    if (typeof t === "string") {
      changed = true;
      return DIET_TAGS.find((p) => p.id === t) ?? { id: t, label: t };
    }
    return t as MenuTag;
  });
  return changed ? { ...item, tags } : item;
}

export type PlanId = "starter" | "brew" | "roast";

export interface Plan {
  id: PlanId;
  name: string;
  /** Peso/month on the monthly plan. */
  monthly: number;
  tagline: string;
  features: string[];
  /** Whether guests can place orders (Brew & Roast) or browse only (Starter). */
  ordering: boolean;
  popular?: boolean;
  cta: string;
}

export interface MenuTheme {
  key: string;
  name: string;
  blurb: string;
  dark: boolean;
  /** [background, accent, text] preview swatch. */
  swatch: [string, string, string];
}

// ---- Plans (canonical: from the pricing image) -----------------------------

/** Annual billing = 2 months free, i.e. monthly × 10. */
export const MONTHS_BILLED_ANNUALLY = 10;

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: 299,
    tagline: "For a single café finding its feet.",
    ordering: false,
    cta: "Choose Starter",
    features: [
      "1 menu, up to 25 items",
      "Your own QR code & link",
      "3 ready-made themes",
      "Browse-only menu (no orders)",
    ],
  },
  {
    id: "brew",
    name: "Brew",
    monthly: 499,
    tagline: "Everything you need to take orders.",
    ordering: true,
    popular: true,
    cta: "Subscribe to Brew",
    features: [
      "Unlimited menu items",
      "Full customization studio",
      "Live order dashboard",
      "Sold-out toggles & daily specials",
      "1 café location",
    ],
  },
  {
    id: "roast",
    name: "Roast",
    monthly: 999,
    tagline: "For groups and growing brands.",
    ordering: true,
    cta: "Choose Roast",
    features: [
      "Everything in Brew",
      "Up to 5 locations",
      "Sales analytics & reports",
      "Custom domain (menu.yourcafe.ph)",
      "Priority support",
    ],
  },
];

export function annualTotal(monthly: number): number {
  return monthly * MONTHS_BILLED_ANNUALLY;
}

/** Effective per-month price when paying annually (monthly × 10 / 12). */
export function annualPerMonth(monthly: number): number {
  return Math.round((monthly * MONTHS_BILLED_ANNUALLY) / 12);
}

/**
 * Phase gate. Phase 1 (beta): browse + counter (show-staff summary). Phase 2
 * (live order board + guest tracking) is built but held behind this flag — flip
 * to true to light up "Order to kitchen". Phase 3 (Mesa as POS) is future work.
 */
export const PHASE2_ORDERING = false;

/**
 * The order mode actually in effect for a café: folds in the Phase-2 gate, the
 * plan (kitchen needs an ordering plan; counter works on any), and the pause
 * switch (browse when paused). Default is "counter" — the Phase 1 experience.
 */
export function resolveOrderMode(cafe: Cafe, planAllowsOrders: boolean): OrderMode {
  if (cafe.acceptingOrders === false) return "browse";
  const chosen = cafe.orderMode ?? "counter";
  if (chosen === "kitchen" && (!PHASE2_ORDERING || !planAllowsOrders)) return "counter";
  return chosen;
}

// ---- Demo café + menu (marketing landing graphics only) --------------------
// The live demo café/menu come from the database (see supabase/migrations); the
// constants below are used only by the marketing PhoneMock / DashboardMock.

export const DEMO_CAFE: Cafe = {
  slug: "demo",
  name: "Kape Kalye",
  tagline: "Neighborhood coffee · San Fernando, Pampanga",
  intro: "Slow coffee, fresh pastries, and a quiet corner — made for staying a while.",
  hours: "Open today · 7:00am – 10:00pm",
  cover: U("photo-1554118811-1e0d58224f24", 1200),
  plan: "brew",
  theme: "warm",
};

// Shared option groups, reused across the coffee items.
const SIZE_GROUP: OptionGroup = {
  id: "size",
  label: "Size",
  required: true,
  choices: [
    { id: "s", label: "Small" },
    { id: "m", label: "Medium", priceDelta: 20 },
    { id: "l", label: "Large", priceDelta: 40 },
  ],
};
const MILK_GROUP: OptionGroup = {
  id: "milk",
  label: "Milk",
  required: true,
  choices: [
    { id: "whole", label: "Whole milk" },
    { id: "oat", label: "Oat milk", priceDelta: 30 },
    { id: "almond", label: "Almond milk", priceDelta: 30 },
  ],
};
const COFFEE_ADDONS: OptionGroup = {
  id: "addons",
  label: "Add-ons",
  multi: true,
  choices: [
    { id: "shot", label: "Extra shot", priceDelta: 40 },
    { id: "vanilla", label: "Vanilla syrup", priceDelta: 25 },
  ],
};
const COFFEE_OPTIONS: OptionGroup[] = [SIZE_GROUP, MILK_GROUP, COFFEE_ADDONS];

export const MENU: MenuItem[] = [
  { id: "flat-white", cat: "Hot Coffee", name: "Flat White", price: 130, best: true, desc: "Slow-pulled espresso, steamed milk, a little foam.", img: U("photo-1541167760496-1628856ab772"), badge: "Bestseller", options: COFFEE_OPTIONS, tags: [dt("vegetarian"), dt("dairy")] },
  { id: "cappuccino", cat: "Hot Coffee", name: "Cappuccino", price: 120, desc: "Equal parts espresso, steamed milk, and airy foam.", img: U("photo-1572442388796-11668a67e53d"), options: COFFEE_OPTIONS, tags: [dt("vegetarian"), dt("dairy")] },
  { id: "caramel-latte", cat: "Hot Coffee", name: "Salted Caramel Latte", price: 150, desc: "House caramel, a pinch of sea salt, velvety milk.", img: U("photo-1534687941688-651ccaafbff8"), options: COFFEE_OPTIONS, tags: [dt("vegetarian"), dt("dairy")] },
  { id: "iced-spanish", cat: "Iced Coffee", name: "Iced Spanish Latte", price: 150, desc: "Sweet condensed milk over a double shot, lots of ice.", img: U("photo-1461023058943-07fcbe16d735"), badge: "New", options: COFFEE_OPTIONS, tags: [dt("vegetarian"), dt("dairy")] },
  { id: "iced-latte", cat: "Iced Coffee", name: "Iced Latte", price: 140, desc: "Smooth espresso, cold milk, slow melt.", img: U("photo-1517701550927-30cf4ba1dba5"), options: COFFEE_OPTIONS, tags: [dt("vegetarian"), dt("dairy")] },
  { id: "butter-croissant", cat: "Sweet Things", name: "Butter Croissant", price: 95, desc: "Baked this morning. Flaky, buttery, warm.", img: U("photo-1555507036-ab1f4038808a"), tags: [dt("vegetarian"), dt("dairy"), dt("gluten")] },
  { id: "raspberry-cake", cat: "Sweet Things", name: "Raspberry Cream Cake", price: 165, desc: "Soft sponge, fresh cream, tart raspberries.", img: U("photo-1565958011703-44f9829ba187"), tags: [dt("vegetarian"), dt("dairy"), dt("gluten")] },
  { id: "choc-cookies", cat: "Sweet Things", name: "Brown Butter Cookies", price: 80, desc: "Crisp edges, gooey middle, dark chocolate.", img: U("photo-1499636136210-6f4ee915583e"), soldOut: true, tags: [dt("vegetarian"), dt("dairy"), dt("gluten"), dt("nuts")] },
  {
    id: "pulled-sandwich", cat: "Kitchen", name: "Pulled Pork Sandwich", price: 220, desc: "Slow-cooked pork, slaw, toasted brioche.", img: U("photo-1606755962773-d324e0a13086"), tags: [dt("gluten"), dt("spicy")],
    options: [
      { id: "addons", label: "Add-ons", multi: true, choices: [
        { id: "combo", label: "Make it a combo (fries + drink)", priceDelta: 90 },
        { id: "slaw", label: "Extra slaw", priceDelta: 20 },
      ] },
    ],
  },
  { id: "sourdough", cat: "Kitchen", name: "Sourdough & Eggs", price: 195, desc: "House sourdough, soft eggs, salted butter.", img: U("photo-1509440159596-0249088772ff"), tags: [dt("vegetarian"), dt("dairy"), dt("gluten")] },
];

export const THEMES: MenuTheme[] = [
  { key: "warm", name: "Warm & Cozy", blurb: "Cover photo, bottom tab bar, best-sellers rail.", dark: false, swatch: ["#FBF6EE", "#AE4A24", "#3B2A21"] },
  { key: "minimal", name: "Clean & Minimal", blurb: "Centered logo, underline tabs, calm list.", dark: false, swatch: ["#FFFFFF", "#7A5230", "#2A1D16"] },
  { key: "bold", name: "Bold & Appetizing", blurb: "Dark surface, big cover, pill nav.", dark: true, swatch: ["#1F140E", "#E0A53F", "#FBF6EE"] },
  { key: "soft", name: "Soft & Natural", blurb: "Rounded header card, sage accents.", dark: false, swatch: ["#F3EBDE", "#6E8B5B", "#3B2A21"] },
  { key: "playful", name: "Modern & Playful", blurb: "Gradient header, icon chips, popular rail.", dark: false, swatch: ["#FCF1DA", "#AE4A24", "#2A1D16"] },
];

// ---- Owner Studio content --------------------------------------------------

export interface Promo {
  id: string;
  title: string;
  desc: string;
  period: string;
  active: boolean;
  tone: "highlight" | "brand" | "neutral";
}

// ---- Brand kit -------------------------------------------------------------

export interface AccentPreset {
  id: string;
  name: string;
  base: string;
}

/** Background tints for the menu page. Mostly soft, plus a few deep tones. */
export interface SurfacePreset {
  id: string;
  name: string;
  /** Page background hex, or null = use the theme's own default background. */
  base: string | null;
}
export const SURFACE_PRESETS: SurfacePreset[] = [
  { id: "none", name: "Theme default", base: null },
  { id: "cream", name: "Cream", base: "#FBF6EE" },
  { id: "sand", name: "Sand", base: "#F3EBDE" },
  { id: "sage", name: "Sage", base: "#EEF2E8" },
  { id: "blush", name: "Blush", base: "#FBEEE7" },
  { id: "espresso", name: "Espresso", base: "#241712" },
  { id: "forest", name: "Forest", base: "#16271E" },
  { id: "midnight", name: "Midnight", base: "#141A24" },
];

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "clay", name: "Terracotta", base: "#AE4A24" },
  { id: "espresso", name: "Espresso", base: "#7A5230" },
  { id: "forest", name: "Forest", base: "#3C6E47" },
  { id: "ocean", name: "Ocean", base: "#2C6E8F" },
  { id: "berry", name: "Berry", base: "#A8385A" },
  { id: "plum", name: "Plum", base: "#6E4B8E" },
  { id: "mustard", name: "Mustard", base: "#C28A1E" },
  { id: "charcoal", name: "Charcoal", base: "#3B3530" },
];

/** Font id → CSS variable. Variables are loaded by next/font in layout.tsx. */
export const FONT_VARS: Record<string, string> = {
  newsreader: "var(--font-newsreader)",
  hanken: "var(--font-hanken)",
  playfair: "var(--font-playfair)",
  dmserif: "var(--font-dmserif)",
  space: "var(--font-space)",
  worksans: "var(--font-worksans)",
  dmsans: "var(--font-dmsans)",
};

export interface FontOption {
  id: string;
  name: string;
  kind?: "Serif" | "Sans";
}
export const HEADING_FONTS: FontOption[] = [
  { id: "newsreader", name: "Newsreader", kind: "Serif" },
  { id: "playfair", name: "Playfair Display", kind: "Serif" },
  { id: "dmserif", name: "DM Serif Display", kind: "Serif" },
  { id: "space", name: "Space Grotesk", kind: "Sans" },
];
export const BODY_FONTS: FontOption[] = [
  { id: "hanken", name: "Hanken Grotesk" },
  { id: "worksans", name: "Work Sans" },
  { id: "dmsans", name: "DM Sans" },
];

export interface Pairing {
  id: string;
  name: string;
  heading: string;
  body: string;
  mood: "warm" | "cool";
  blurb: string;
}
export const PAIRINGS: Pairing[] = [
  { id: "editorial", name: "Editorial", heading: "newsreader", body: "hanken", mood: "warm", blurb: "Classic & warm" },
  { id: "refined", name: "Refined", heading: "playfair", body: "worksans", mood: "cool", blurb: "Elegant & upscale" },
  { id: "statement", name: "Statement", heading: "dmserif", body: "dmsans", mood: "warm", blurb: "Editorial & punchy" },
  { id: "modern", name: "Modern", heading: "space", body: "worksans", mood: "cool", blurb: "Clean & contemporary" },
];

export interface BrandKit {
  logo: string | null;
  accent: string;
  paletteId: string;
  headingFont: string;
  bodyFont: string;
  pairingId: string;
  colorMode: "preset" | "auto";
  /** Page background tint, or null to use the theme's own background. */
  surface: string | null;
  /** Surface preset id, "custom", or "none". */
  surfaceId: string;
  /** Corner style for cards & images (buttons stay pill in every mode). */
  shape: "sharp" | "rounded" | "soft";
}

export const DEFAULT_BRAND: BrandKit = {
  logo: null,
  accent: "#AE4A24",
  paletteId: "clay",
  headingFont: "newsreader",
  bodyFont: "hanken",
  pairingId: "editorial",
  colorMode: "preset",
  surface: null,
  surfaceId: "none",
  shape: "rounded",
};

// ---- Plan-based brand capabilities ----------------------------------------
// Branding depth scales with the plan: Starter = on-brand basics, Brew = your
// exact look, Roast = total control + white-label.

export interface BrandCaps {
  /** Themes this plan may use (Starter is curated to two). */
  themes: ThemeKey[];
  /** Custom hex + extract-from-image (presets always allowed). */
  customColor: boolean;
  /** Mix heading/body fonts freely (the 4 pairings are always allowed). */
  customFonts: boolean;
  /** Tint the whole menu background. */
  background: boolean;
  /** Corner-style control. */
  shape: boolean;
  /** Logo + accent on the printable QR poster. */
  brandedQR: boolean;
  /** Remove the "powered by Mesa" mark from the diner menu. */
  whiteLabel: boolean;
}

const ALL_THEMES: ThemeKey[] = ["warm", "minimal", "bold", "soft", "playful"];

export const BRAND_CAPS: Record<PlanId, BrandCaps> = {
  starter: { themes: ["warm", "minimal"], customColor: false, customFonts: false, background: false, shape: false, brandedQR: false, whiteLabel: false },
  brew: { themes: ALL_THEMES, customColor: true, customFonts: true, background: false, shape: false, brandedQR: false, whiteLabel: false },
  roast: { themes: ALL_THEMES, customColor: true, customFonts: true, background: true, shape: true, brandedQR: true, whiteLabel: true },
};

export function capsFor(plan: PlanId): BrandCaps {
  return BRAND_CAPS[plan] ?? BRAND_CAPS.starter;
}

/** Plan name that first unlocks a capability — for upsell copy. */
export function tierFor(cap: keyof BrandCaps): "Brew" | "Roast" {
  return BRAND_CAPS.brew[cap] ? "Brew" : "Roast";
}

/**
 * Strip any brand settings the plan isn't entitled to, so a downgrade (or a
 * tampered store) can't leak a higher tier's branding onto the live menu.
 * Applied on the read path; presets/pairings/logo are allowed on every tier.
 */
export function clampBrand(brand: BrandKit, caps: BrandCaps): BrandKit {
  const customAccent = brand.paletteId === "custom" || brand.colorMode === "auto";
  const lockedColor = !caps.customColor && customAccent;
  const lockedFonts = !caps.customFonts && brand.pairingId === "custom";
  return {
    ...brand,
    accent: lockedColor ? DEFAULT_BRAND.accent : brand.accent,
    paletteId: lockedColor ? DEFAULT_BRAND.paletteId : brand.paletteId,
    colorMode: lockedColor ? "preset" : brand.colorMode,
    headingFont: lockedFonts ? DEFAULT_BRAND.headingFont : brand.headingFont,
    bodyFont: lockedFonts ? DEFAULT_BRAND.bodyFont : brand.bodyFont,
    pairingId: lockedFonts ? DEFAULT_BRAND.pairingId : brand.pairingId,
    surface: caps.background ? brand.surface : null,
    surfaceId: caps.background ? brand.surfaceId : "none",
    shape: caps.shape ? brand.shape : "rounded",
  };
}

/** Diner-facing theme — falls back to an allowed one if the saved theme is gated. */
export function clampTheme(theme: ThemeKey, caps: BrandCaps): ThemeKey {
  return caps.themes.includes(theme) ? theme : caps.themes[0];
}

/** Suggest a pairing from an extracted accent hue (for "match my brand image"). */
export function pairingForHue(h: number): string {
  if (h >= 40 && h < 170) return "modern"; // yellow-green / green → clean
  if (h >= 170 && h < 320) return "refined"; // blue / purple → elegant
  return "editorial"; // warm reds / oranges / browns
}

/** Category → Lucide icon name, used by the icon-chip themes (soft/playful). */
export const CAT_ICONS: Record<string, string> = {
  "Hot Coffee": "coffee",
  "Iced Coffee": "cup-soda",
  "Sweet Things": "croissant",
  Kitchen: "utensils",
};

export const THEME_KEYS: ThemeKey[] = ["warm", "minimal", "bold", "soft", "playful"];

export function isThemeKey(v: string | undefined | null): v is ThemeKey {
  return !!v && (THEME_KEYS as string[]).includes(v);
}

// ---- Plan catalog lookup ---------------------------------------------------
// Café/menu/category reads are now DB-backed in src/lib/queries.ts. PLANS is a
// static pricing catalog (not tenant data), so this stays a simple lookup.

export function getPlan(id: PlanId): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

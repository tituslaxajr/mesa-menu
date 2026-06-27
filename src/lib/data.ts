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

// ---- Demo café + menu ------------------------------------------------------

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

/** A second sample café on the Starter (browse-only) tier, for demonstrating
 *  tier gating: same menu, no ordering controls. */
export const DEMO_CAFE_STARTER: Cafe = {
  slug: "demo-starter",
  name: "Tindahan Coffee",
  tagline: "Small-batch roasts · Angeles, Pampanga",
  intro: "Small-batch roasts and simple, honest food, served all day.",
  hours: "Open today · 8:00am – 9:00pm",
  cover: U("photo-1453614512568-c4024d13c247", 1200),
  plan: "starter",
  theme: "minimal",
};

const CAFES: Cafe[] = [DEMO_CAFE, DEMO_CAFE_STARTER];

export const CATEGORIES = ["All", "Hot Coffee", "Iced Coffee", "Sweet Things", "Kitchen"];

export const MENU: MenuItem[] = [
  { id: "flat-white", cat: "Hot Coffee", name: "Flat White", price: 130, best: true, desc: "Slow-pulled espresso, steamed milk, a little foam.", img: U("photo-1541167760496-1628856ab772"), badge: "Bestseller" },
  { id: "cappuccino", cat: "Hot Coffee", name: "Cappuccino", price: 120, desc: "Equal parts espresso, steamed milk, and airy foam.", img: U("photo-1572442388796-11668a67e53d") },
  { id: "caramel-latte", cat: "Hot Coffee", name: "Salted Caramel Latte", price: 150, desc: "House caramel, a pinch of sea salt, velvety milk.", img: U("photo-1534687941688-651ccaafbff8") },
  { id: "iced-spanish", cat: "Iced Coffee", name: "Iced Spanish Latte", price: 150, desc: "Sweet condensed milk over a double shot, lots of ice.", img: U("photo-1461023058943-07fcbe16d735"), badge: "New" },
  { id: "iced-latte", cat: "Iced Coffee", name: "Iced Latte", price: 140, desc: "Smooth espresso, cold milk, slow melt.", img: U("photo-1517701550927-30cf4ba1dba5") },
  { id: "butter-croissant", cat: "Sweet Things", name: "Butter Croissant", price: 95, desc: "Baked this morning. Flaky, buttery, warm.", img: U("photo-1555507036-ab1f4038808a") },
  { id: "raspberry-cake", cat: "Sweet Things", name: "Raspberry Cream Cake", price: 165, desc: "Soft sponge, fresh cream, tart raspberries.", img: U("photo-1565958011703-44f9829ba187") },
  { id: "choc-cookies", cat: "Sweet Things", name: "Brown Butter Cookies", price: 80, desc: "Crisp edges, gooey middle, dark chocolate.", img: U("photo-1499636136210-6f4ee915583e"), soldOut: true },
  { id: "pulled-sandwich", cat: "Kitchen", name: "Pulled Pork Sandwich", price: 220, desc: "Slow-cooked pork, slaw, toasted brioche.", img: U("photo-1606755962773-d324e0a13086") },
  { id: "sourdough", cat: "Kitchen", name: "Sourdough & Eggs", price: 195, desc: "House sourdough, soft eggs, salted butter.", img: U("photo-1509440159596-0249088772ff") },
];

export const THEMES: MenuTheme[] = [
  { key: "warm", name: "Warm & Cozy", blurb: "Cover photo, bottom tab bar, best-sellers rail.", dark: false, swatch: ["#FBF6EE", "#C8592E", "#3B2A21"] },
  { key: "minimal", name: "Clean & Minimal", blurb: "Centered logo, underline tabs, calm list.", dark: false, swatch: ["#FFFFFF", "#7A5230", "#2A1D16"] },
  { key: "bold", name: "Bold & Appetizing", blurb: "Dark surface, big cover, pill nav.", dark: true, swatch: ["#1F140E", "#E0A53F", "#FBF6EE"] },
  { key: "soft", name: "Soft & Natural", blurb: "Rounded header card, sage accents.", dark: false, swatch: ["#F3EBDE", "#6E8B5B", "#3B2A21"] },
  { key: "playful", name: "Modern & Playful", blurb: "Gradient header, icon chips, popular rail.", dark: false, swatch: ["#FCF1DA", "#C8592E", "#2A1D16"] },
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

export const PROMOS: Promo[] = [
  { id: "merienda", title: "Merienda hour", desc: "2–5 PM · ₱20 off any pastry with a hot drink.", period: "Daily · 2:00–5:00 PM", active: true, tone: "highlight" },
  { id: "student", title: "Student Tuesdays", desc: "10% off for students, all day Tuesday.", period: "Every Tuesday", active: true, tone: "brand" },
  { id: "rainy", title: "Rainy-day soup set", desc: "Free soup with any sandwich when it rains.", period: "Seasonal · paused", active: false, tone: "neutral" },
];

export const ANALYTICS = {
  viewsThisWeek: 320,
  viewsDelta: "+12%",
  uptime: "98%",
  series: [120, 180, 150, 240, 210, 300, 320],
  days: ["May 10", "May 11", "May 12", "May 13", "May 14", "May 15", "May 16"],
  topItems: [
    { name: "Salted Caramel Latte", views: 120 },
    { name: "Iced Spanish Latte", views: 98 },
    { name: "Flat White", views: 76 },
    { name: "Raspberry Cream Cake", views: 54 },
    { name: "Butter Croissant", views: 42 },
  ],
};

export interface Activity {
  item: string;
  action: string;
  icon: string;
  when: string;
  tone: "highlight" | "soldout" | "brand" | "neutral";
}

export const ACTIVITY: Activity[] = [
  { item: "Iced Spanish Latte", action: "Marked as new", icon: "sparkles", when: "2 hours ago", tone: "highlight" },
  { item: "Brown Butter Cookies", action: "Marked sold out", icon: "ban", when: "5 hours ago", tone: "soldout" },
  { item: "Salted Caramel Latte", action: "Price updated to ₱150", icon: "banknote", when: "1 day ago", tone: "brand" },
  { item: "Flat White", action: "Photo replaced", icon: "image", when: "2 days ago", tone: "neutral" },
];

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
  { id: "clay", name: "Terracotta", base: "#C8592E" },
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
  accent: "#C8592E",
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

// ---- Accessors (BACKEND SEAM) ----------------------------------------------
// Replace these with real fetches (DB / API) when a backend exists. The rest of
// the app only talks to the functions below, never to the constants directly.

export function getCafe(slug: string): Cafe | null {
  // BACKEND SEAM: look up café by slug.
  return CAFES.find((c) => c.slug === slug) ?? null;
}

export function getMenu(_slug: string): MenuItem[] {
  // BACKEND SEAM: fetch this café's menu.
  return MENU;
}

export function getCategories(_slug: string): string[] {
  return CATEGORIES;
}

export function getPlan(id: PlanId): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

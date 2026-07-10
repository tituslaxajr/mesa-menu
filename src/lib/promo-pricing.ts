// ============================================================================
// Promo pricing engine — pure and isomorphic (no React, no Supabase).
// Decides which promos are live right now (Manila wall-clock), what a
// discounted price is (whole ₱), and rewrites a menu so every existing price
// consumer — theme cards, item sheet, cart math, order totals — sees the
// discounted price with zero math changes. The original price rides along as
// `origPrice` for strikethrough display.
//
// Shared by the server (menu page render, authoritative order recompute) and
// the client (MenuBrowser's minute tick re-evaluation).
// ============================================================================
import type { MenuItem, Promo, PromoDiscount } from "@/lib/data";

/** Manila wall-clock for any instant, correct regardless of host timezone. */
export function manilaClock(now: Date = new Date()): {
  /** 0=Sun .. 6=Sat */
  dow: number;
  /** Minutes since midnight. */
  minutes: number;
  /** "YYYY-MM-DD" in Manila. */
  dateISO: string;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // hour12:false can yield "24" for midnight in some engines — normalize.
  const hour = parseInt(get("hour"), 10) % 24;
  return {
    dow: dows.indexOf(get("weekday")),
    minutes: hour * 60 + parseInt(get("minute"), 10),
    dateISO: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

/**
 * Is this promo live right now? The manual `active` switch AND every schedule
 * axis that is set must pass. A promo with no schedule follows `active` alone
 * (banner-only promos keep their existing behavior). Time window is
 * [startMin, endMin) — 14:00–17:00 means live at 2:00 PM, over at 5:00 PM.
 */
export function isPromoLive(p: Promo, now: Date = new Date()): boolean {
  if (!p.active) return false;
  const s = p.schedule;
  if (!s) return true;
  const clock = manilaClock(now);
  if (s.daysOfWeek && s.daysOfWeek.length > 0 && !s.daysOfWeek.includes(clock.dow)) return false;
  if (typeof s.startMin === "number" && clock.minutes < s.startMin) return false;
  if (typeof s.endMin === "number" && clock.minutes >= s.endMin) return false;
  if (s.startDate && clock.dateISO < s.startDate) return false;
  if (s.endDate && clock.dateISO > s.endDate) return false;
  return true;
}

/** Discounted whole-₱ price. Percent rounds to the nearest peso; never below 0. */
export function discountedPrice(base: number, d: PromoDiscount): number {
  if (d.type === "percent") return Math.max(0, base - Math.round((base * d.value) / 100));
  return Math.max(0, base - d.value);
}

/** Does this promo's targeting cover the item? (Names — the app's stable key.) */
function targets(d: PromoDiscount, item: { name: string; cat: string }): boolean {
  if (d.appliesTo === "all") return true;
  if (d.appliesTo === "categories") return d.targetCategories.includes(item.cat);
  return d.targetItems.includes(item.name);
}

/**
 * The single best live discount for an item — largest ₱ savings wins, no
 * stacking. Null when nothing applies (or nothing beats the base price).
 */
export function bestPromoFor(
  item: { name: string; cat: string; price: number },
  promos: Promo[],
  now: Date = new Date(),
): { promo: Promo; price: number } | null {
  let best: { promo: Promo; price: number } | null = null;
  for (const p of promos) {
    const d = p.discount;
    if (!d || d.type === "none" || d.value <= 0) continue;
    if (!isPromoLive(p, now)) continue;
    if (!targets(d, item)) continue;
    const price = discountedPrice(item.price, d);
    if (price >= item.price) continue;
    if (!best || price < best.price) best = { promo: p, price };
  }
  return best;
}

/**
 * Rewrite a menu with live discounts applied: `price` becomes the effective
 * price, `origPrice` keeps the pre-discount price (for strikethrough), and
 * `promoTitle` names the promo. Untouched items pass through by reference.
 */
export function applyPromosToMenu(
  menu: MenuItem[],
  promos: Promo[],
  now: Date = new Date(),
): MenuItem[] {
  const discountable = promos.some((p) => p.discount && p.discount.type !== "none");
  if (!discountable) return menu;
  return menu.map((item) => {
    const best = bestPromoFor(item, promos, now);
    if (!best) return item;
    return { ...item, price: best.price, origPrice: item.price, promoTitle: best.promo.title };
  });
}

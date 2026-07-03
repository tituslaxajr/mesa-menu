// Day-phase engine for the "Araw" owner experience.
// The dashboard's default surface follows the café's real day: prep before
// open, service, the merienda lull, closing hour, and closed. Phases change
// EMPHASIS only — every capability stays reachable in every phase, so a wrong
// parse or odd schedule can never lock an owner out.
//
// Pure module (no React) so server actions can compose/parse hours too.
// The live `usePhase` hook lives in use-phase.ts (client-only).

export type DayPhase = "prep" | "service" | "merienda" | "closing" | "closed";

export interface CafeHours {
  /** Opening time, minutes since midnight (e.g. 420 = 7:00 AM). */
  openMin: number;
  /** Closing time, minutes since midnight (e.g. 1260 = 9:00 PM). */
  closeMin: number;
}

/** Sensible café default when nothing is set or parseable: 7:00 AM – 9:00 PM. */
export const DEFAULT_HOURS: CafeHours = { openMin: 7 * 60, closeMin: 21 * 60 };

/** Merienda window (PH afternoon lull): 2:30 – 5:30 PM. */
const MERIENDA_START = 14 * 60 + 30;
const MERIENDA_END = 17 * 60 + 30;
/** Prep starts this long before open; closing starts this long before close. */
const PREP_LEAD = 90;
const CLOSING_LEAD = 60;

/**
 * Best-effort parse of the free-text `hours` string cafés already have
 * (e.g. "Open today · 7:00am – 10:00pm"). Returns null when it can't find a
 * believable open/close pair — callers fall back to DEFAULT_HOURS.
 */
export function parseHoursText(text: string | null | undefined): CafeHours | null {
  if (!text) return null;
  const re = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/gi;
  const found: number[] = [];
  for (const m of text.matchAll(re)) {
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const mer = m[3]?.toLowerCase();
    if (Number.isNaN(h) || min > 59) continue;
    if (mer) {
      if (h < 1 || h > 12) continue;
      if (mer.startsWith("p") && h < 12) h += 12;
      if (mer.startsWith("a") && h === 12) h = 0;
    } else if (h > 23) {
      continue; // "24/7" style tokens — not a clock time
    }
    found.push(h * 60 + min);
    if (found.length === 2) break;
  }
  if (found.length < 2) return null;
  const open = found[0];
  let close = found[1];
  // "11 – 2" with no meridiem: assume the close is PM when it reads earlier
  // than the open (11:00–2:00 → 11:00–14:00).
  if (close <= open && close < 12 * 60) close += 12 * 60;
  if (close <= open) return null; // overnight schedules unsupported — fall back
  return { openMin: open, closeMin: close };
}

/**
 * Resolve a café's hours: structured columns win, then the legacy free-text
 * string, then the default. Never returns null — the engine always has a day.
 */
export function hoursForCafe(cafe: {
  openMin?: number | null;
  closeMin?: number | null;
  hours?: string | null;
}): CafeHours {
  if (
    typeof cafe.openMin === "number" &&
    typeof cafe.closeMin === "number" &&
    cafe.closeMin > cafe.openMin
  ) {
    return { openMin: cafe.openMin, closeMin: cafe.closeMin };
  }
  return parseHoursText(cafe.hours) ?? DEFAULT_HOURS;
}

/** Which phase of the café's day a given moment falls in. */
export function phaseFor(now: Date, hours: CafeHours): DayPhase {
  const { openMin, closeMin } = hours.closeMin > hours.openMin ? hours : DEFAULT_HOURS;
  const t = now.getHours() * 60 + now.getMinutes();
  const prepStart = Math.max(0, openMin - PREP_LEAD);
  if (t < prepStart) return "closed";
  if (t < openMin) return "prep";
  if (t >= closeMin) return "closed";
  if (t >= Math.max(openMin, closeMin - CLOSING_LEAD)) return "closing";
  if (t >= MERIENDA_START && t < MERIENDA_END) return "merienda";
  return "service";
}

/** "7:00 AM" from minutes-since-midnight. */
export function minToLabel(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const mer = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${mer}`;
}

/** Compose the diner-facing display string from structured hours. */
export function hoursDisplay(hours: CafeHours): string {
  return `Open today · ${minToLabel(hours.openMin).toLowerCase().replace(" ", "")} – ${minToLabel(hours.closeMin).toLowerCase().replace(" ", "")}`;
}

/** Human label for a phase (UI chips, the day clock). */
export const PHASE_LABEL: Record<DayPhase, string> = {
  prep: "Opening prep",
  service: "Service",
  merienda: "Merienda",
  closing: "Closing up",
  closed: "Closed",
};


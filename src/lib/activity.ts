"use client";
// Lightweight, slug-scoped menu-activity log (localStorage). Powers the
// Phase-1 Day Close recap: cafés that don't record sales with Mesa still get
// an honest end-of-day story — edits made, items 86'd, restocks — without any
// backend. Pruned to the last 14 days; same per-device caveat as orders-store.
export type ActivityKind = "86" | "restock" | "edit" | "add" | "bulk86" | "bulkRestock";

export interface ActivityEvent {
  t: number; // epoch ms
  kind: ActivityKind;
  label: string; // item/category name
}

const KEEP_MS = 14 * 86400000;
const key = (slug: string) => `mesa.activity.${slug}`;

export function readActivity(slug: string): ActivityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(slug));
    const arr = raw ? (JSON.parse(raw) as ActivityEvent[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function logActivity(slug: string, kind: ActivityKind, label: string): void {
  if (typeof window === "undefined") return;
  try {
    const cutoff = Date.now() - KEEP_MS;
    const next = [...readActivity(slug).filter((e) => e.t >= cutoff), { t: Date.now(), kind, label }];
    window.localStorage.setItem(key(slug), JSON.stringify(next));
  } catch {
    /* storage unavailable/full — the recap just has less to say */
  }
}

/** Events since local midnight, for the recap. */
export function todaysActivity(slug: string, now: number): ActivityEvent[] {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const start = d.getTime();
  return readActivity(slug).filter((e) => e.t >= start);
}

// ============================================================================
// Mesa — orders store (front-end shared state)
// The customer menu (/m/[slug]) writes guest orders to localStorage under a
// slug-scoped key; the owner Studio Orders board reads the same key and updates
// live. This is the front-end stand-in for a real backend "orders" table.
// BACKEND SEAM: replace read/write with API calls + websockets/polling; the
// shape of Order and the status lifecycle stay the same.
// ============================================================================

"use client";

import { useEffect, useMemo, useState } from "react";

/** New → Preparing → Ready → Completed (cancel is terminal too). */
export type OrderStatus = "new" | "preparing" | "ready" | "completed" | "cancelled";

export interface OrderLine {
  id: string;
  name: string;
  /** Effective unit price — base price plus any chosen option deltas. */
  price: number;
  qty: number;
  /** Chosen customization labels, e.g. ["Large", "Oat milk", "+Extra shot"]. */
  options?: string[];
}

/**
 * "kitchen" (default) = worked through the live Orders board.
 * "counter" = guest built a summary to show staff (café's own POS owns it);
 * logged for analytics but kept off the board, so it's created already done.
 */
export type OrderChannel = "kitchen" | "counter";

export interface Order {
  id: string;
  /** Short human-facing code shown on the board and to the guest. */
  code: string;
  /** Table number from the per-table QR (?t=) or typed by the guest. */
  table?: string;
  lines: OrderLine[];
  total: number;
  note?: string;
  status: OrderStatus;
  /** undefined = "kitchen" (back-compat). */
  channel?: OrderChannel;
  placedAt: number; // epoch ms
  completedAt?: number; // epoch ms, set when status becomes completed/cancelled
}

const EVENT = "mesa:orders";
const ordersKey = (slug: string) => `mesa.orders.${slug}`;

function emit(slug: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: slug }));
}

/** Read all orders for a café, newest first (empty on SSR / parse error). */
export function readOrders(slug: string): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ordersKey(slug));
    return raw != null ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

function writeOrders(slug: string, orders: Order[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ordersKey(slug), JSON.stringify(orders));
  // `storage` fires in OTHER tabs (owner board vs. guest menu); the custom
  // event covers same-tab updates (demos, board acting on its own data).
  emit(slug);
}

function shortCode(): string {
  // 3-char base-36 code, e.g. "7QX" — easy to call out across a café.
  return Math.random().toString(36).slice(2, 5).toUpperCase();
}

export interface NewOrder {
  lines: OrderLine[];
  total: number;
  table?: string;
  note?: string;
  channel?: OrderChannel;
}

/** Finished orders older than this are pruned on the next write (bounds
 *  localStorage growth; well beyond the 7-day analytics window). */
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** Append a guest order and return it. */
export function placeOrder(slug: string, input: NewOrder): Order {
  const now = Date.now();
  // Counter orders aren't worked on the board — created already "completed" so
  // they count in analytics and age out under retention like other finished ones.
  const counter = input.channel === "counter";
  const order: Order = {
    id: Math.random().toString(36).slice(2, 10),
    code: shortCode(),
    table: input.table?.trim() || undefined,
    lines: input.lines,
    total: input.total,
    note: input.note?.trim() || undefined,
    channel: input.channel,
    status: counter ? "completed" : "new",
    placedAt: now,
    completedAt: counter ? now : undefined,
  };
  const cutoff = now - RETENTION_MS;
  const kept = readOrders(slug).filter((o) => {
    const finished = o.status === "completed" || o.status === "cancelled";
    return !(finished && (o.completedAt ?? o.placedAt) < cutoff);
  });
  writeOrders(slug, [order, ...kept]);
  return order;
}

export function setOrderStatus(slug: string, id: string, status: OrderStatus) {
  const terminal = status === "completed" || status === "cancelled";
  writeOrders(
    slug,
    readOrders(slug).map((o) =>
      o.id === id ? { ...o, status, completedAt: terminal ? Date.now() : undefined } : o
    )
  );
}

export function removeOrder(slug: string, id: string) {
  writeOrders(slug, readOrders(slug).filter((o) => o.id !== id));
}

export function removeOrders(slug: string, ids: string[]) {
  if (!ids.length) return;
  const set = new Set(ids);
  writeOrders(slug, readOrders(slug).filter((o) => !set.has(o.id)));
}

/** Drop completed/cancelled orders — "clear the rail" at end of service. */
export function clearFinished(slug: string) {
  writeOrders(slug, readOrders(slug).filter((o) => o.status !== "completed" && o.status !== "cancelled"));
}

/** Subscribe to order changes for a café (cross-tab + same-tab). */
export function subscribeOrders(slug: string, cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === ordersKey(slug)) cb();
  };
  const onCustom = (e: Event) => {
    if ((e as CustomEvent).detail === slug) cb();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onCustom as EventListener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onCustom as EventListener);
  };
}

export interface OrdersApi {
  setStatus: (id: string, status: OrderStatus) => void;
  remove: (id: string) => void;
  removeMany: (ids: string[]) => void;
  clearFinished: () => void;
  place: (input: NewOrder) => Order;
}

/**
 * Live orders for a café. Re-renders on any change (this tab or another) and,
 * when `tick` is set, on an interval so "x min ago" labels stay fresh.
 */
export function useOrders(slug: string, tickMs = 0): readonly [Order[], OrdersApi] {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed from the external localStorage store on mount, then subscribe
    setOrders(readOrders(slug));
    return subscribeOrders(slug, () => setOrders(readOrders(slug)));
  }, [slug]);

  useEffect(() => {
    if (!tickMs) return;
    const t = setInterval(() => setOrders(readOrders(slug)), tickMs);
    return () => clearInterval(t);
  }, [slug, tickMs]);

  const api = useMemo<OrdersApi>(
    () => ({
      setStatus: (id, status) => setOrderStatus(slug, id, status),
      remove: (id) => removeOrder(slug, id),
      removeMany: (ids) => removeOrders(slug, ids),
      clearFinished: () => clearFinished(slug),
      place: (input) => placeOrder(slug, input),
    }),
    [slug]
  );

  return [orders, api] as const;
}

// ── Guest-side tracking ─────────────────────────────────────────────
// The guest's own placed-order ids, so the menu can show live status as the
// owner advances each order. Persisted so a refresh keeps the tracker.
const myKey = (slug: string) => `mesa.myorders.${slug}`;

function readMyIds(slug: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(myKey(slug));
    return raw != null ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeMyIds(slug: string, ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(myKey(slug), JSON.stringify(ids));
  emit(slug);
}

export function trackMyOrder(slug: string, id: string) {
  writeMyIds(slug, [id, ...readMyIds(slug).filter((x) => x !== id)]);
}

export function untrackMyOrder(slug: string, id: string) {
  writeMyIds(slug, readMyIds(slug).filter((x) => x !== id));
}

export interface MyOrdersApi {
  track: (id: string) => void;
  dismiss: (id: string) => void;
}

/**
 * The guest's own orders for a café, newest first, joined live against the
 * orders table — updates as the owner advances each one. Drops ids that no
 * longer exist (e.g. the owner cleared finished orders).
 */
export function useMyOrders(slug: string): readonly [Order[], MyOrdersApi] {
  const [mine, setMine] = useState<Order[]>([]);

  useEffect(() => {
    const refresh = () => {
      const all = readOrders(slug);
      const ids = readMyIds(slug);
      const joined = ids.map((id) => all.find((o) => o.id === id)).filter(Boolean) as Order[];
      // Prune ids whose orders are gone so the list can't grow stale forever.
      if (joined.length !== ids.length) writeMyIds(slug, joined.map((o) => o.id));
      setMine(joined);
    };
    refresh();
    return subscribeOrders(slug, refresh);
  }, [slug]);

  const api = useMemo<MyOrdersApi>(
    () => ({ track: (id) => trackMyOrder(slug, id), dismiss: (id) => untrackMyOrder(slug, id) }),
    [slug]
  );

  return [mine, api] as const;
}

/** Compact relative time, e.g. "just now", "4m", "1h 12m". */
export function timeAgo(from: number, now: number): string {
  const s = Math.max(0, Math.floor((now - from) / 1000));
  if (s < 30) return "just now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

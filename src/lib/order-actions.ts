"use server";
// Phase 2 — "Record sales with Mesa". A guest's counter order is submitted as
// PENDING with a short code; staff taps the matching code to CONFIRM it into
// a recorded sale. Unconfirmed orders lazily expire (reads ignore them past
// expires_at) and never count — the confirm gate is also the anti-abuse
// answer, backed by a per-café rate limit inside place_order.
import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getCafeData } from "@/lib/queries";
import { bestPromoFor } from "@/lib/promo-pricing";
import type { Order, OrderLine } from "@/lib/orders-store";

export type SubmitResult = { ok: true; code: string } | { ok: false; error: string };
export type ConfirmResult = { ok: true } | { ok: false; error: string };

export interface PendingOrder {
  id: string;
  code: string;
  table?: string;
  total: number;
  note?: string;
  lines: { name: string; qty: number; options?: string[] }[];
  placedAt: number;
  expiresAt: number;
}

/** Guest-side: submit a counter order to the café's pending queue (anon OK). */
export async function submitCounterOrder(
  slug: string,
  input: { table?: string; note?: string; lines: OrderLine[] },
): Promise<SubmitResult> {
  const supabase = await createClient();

  // Authoritative pricing: recompute every line from the café's own menu and
  // live promos, overriding whatever the client sent. Lines are matched by
  // item name + option labels (the payload's existing vocabulary). An item
  // the menu no longer has passes through at the client price — the staff
  // confirm gate eyeballs the total either way.
  const cafeData = await getCafeData(slug);
  const cafeMenu = cafeData?.menu ?? [];
  const cafePromos = cafeData?.promos ?? [];
  const now = new Date();
  const lines = input.lines.map((l) => {
    const options = l.options ?? [];
    const item = cafeMenu.find((m) => m.name === l.name);
    if (!item) return { name: l.name, price: l.price, qty: l.qty, options };
    let delta = 0;
    for (const g of item.options ?? [])
      for (const c of g.choices)
        if (options.includes(c.label) || options.includes(`+${c.label}`)) delta += c.priceDelta ?? 0;
    const best = bestPromoFor(item, cafePromos, now);
    return {
      name: l.name,
      qty: l.qty,
      options,
      price: (best ? best.price : item.price) + delta,
      ...(best ? { orig_price: item.price + delta, promo: best.promo.title } : {}),
    };
  });

  const { data, error } = await supabase.rpc("place_order", {
    p_slug: slug,
    p_table: input.table ?? "",
    p_note: input.note ?? "",
    p_channel: "counter",
    p_guest_token: crypto.randomUUID(),
    p_lines: lines,
  });
  if (error) return { ok: false, error: error.message };
  const code = (data as { code?: string } | null)?.code;
  return code ? { ok: true, code } : { ok: false, error: "no code returned" };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToLines(rows: any[]): OrderLine[] {
  return (rows ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((l) => ({
      id: l.id,
      name: l.name,
      price: l.price,
      qty: l.qty,
      options: l.options?.length ? l.options : undefined,
    }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Owner-side: the live pending queue (unexpired, newest first). RLS-scoped. */
export async function getCounterQueue(cafeId: string): Promise<PendingOrder[]> {
  await verifySession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, code, table_label, total, note, placed_at, expires_at, order_lines(id, name, price, qty, options, position)")
    .eq("cafe_id", cafeId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("placed_at", { ascending: false });
  return (data ?? []).map((o) => ({
    id: o.id,
    code: o.code,
    table: o.table_label ?? undefined,
    total: o.total,
    note: o.note ?? undefined,
    lines: rowToLines(o.order_lines as never[]),
    placedAt: new Date(o.placed_at).getTime(),
    expiresAt: new Date(o.expires_at).getTime(),
  }));
}

/** Owner-side: staff confirms the code the guest shows → recorded sale. */
export async function confirmOrder(orderId: string): Promise<ConfirmResult> {
  await verifySession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_order", { p_order_id: orderId });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Owner-side: recorded (confirmed) sales for the analytics window, mapped to
 * the FE Order shape with `recorded: true` so sales.ts counts them even on
 * the counter channel — these ARE staff-verified sales.
 */
export async function getRecordedOrders(cafeId: string): Promise<Order[]> {
  await verifySession();
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data } = await supabase
    .from("orders")
    .select("id, code, table_label, total, note, status, channel, placed_at, completed_at, order_lines(id, name, price, qty, options, position)")
    .eq("cafe_id", cafeId)
    .in("status", ["completed", "cancelled"])
    .gte("placed_at", since)
    .order("placed_at", { ascending: false });
  return (data ?? []).map((o) => ({
    id: o.id,
    code: o.code,
    table: o.table_label ?? undefined,
    lines: rowToLines(o.order_lines as never[]),
    total: o.total,
    note: o.note ?? undefined,
    status: o.status as Order["status"],
    channel: o.channel as Order["channel"],
    placedAt: new Date(o.placed_at).getTime(),
    completedAt: o.completed_at ? new Date(o.completed_at).getTime() : undefined,
    recorded: true,
  }));
}

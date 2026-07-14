"use server";
// Phase A — the staff cashier terminal ("POS"). A café member opens a cash
// drawer (shift), rings items into a ticket, takes cash/manual tender, and
// records a completed `channel='pos'` sale straight to the DB. Money math is
// authoritative in the RPCs (pos_record_sale recomputes total/VAT/change);
// this layer re-prices each line against the café's own menu + live promos
// first, exactly like submitCounterOrder → place_order, so a tampered client
// price can't set the total. All reads/writes are RLS-scoped to café members.
import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getCafeData } from "@/lib/queries";
import { bestPromoFor } from "@/lib/promo-pricing";
import type { Order, OrderLine } from "@/lib/orders-store";

export type OpenShiftResult = { ok: true; shift: Shift } | { ok: false; error: string };
export type CloseShiftResult = { ok: true; shift: Shift } | { ok: false; error: string };
export type RecordSaleResult = { ok: true; sale: PosSale } | { ok: false; error: string };

export interface Shift {
  id: string;
  cafeId: string;
  openedBy: string;
  openedAt: number;
  startingFloat: number;
  closedAt?: number;
  countedCash?: number;
  expectedCash?: number;
  overShort?: number;
  note?: string;
  status: "open" | "closed";
}

/** An `Order` plus the POS tender/tax fields (order_to_json superset). */
export interface PosSale extends Order {
  tenderType?: string;
  tenderLabel?: string;
  amountTendered?: number;
  changeDue?: number;
  netAmount?: number;
  vatAmount?: number;
  serviceCharge?: number;
  paidAt?: number;
}

/** A line the cashier put on the ticket (price is the client's figure; it is
 *  re-derived server-side below and only used as a fallback for off-menu items). */
export interface TicketLineInput {
  name: string;
  qty: number;
  price: number;
  options?: string[];
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

const shiftFromJson = (s: Record<string, unknown>): Shift => ({
  id: s.id as string,
  cafeId: s.cafeId as string,
  openedBy: s.openedBy as string,
  openedAt: Number(s.openedAt),
  startingFloat: Number(s.startingFloat),
  closedAt: s.closedAt != null ? Number(s.closedAt) : undefined,
  countedCash: s.countedCash != null ? Number(s.countedCash) : undefined,
  expectedCash: s.expectedCash != null ? Number(s.expectedCash) : undefined,
  overShort: s.overShort != null ? Number(s.overShort) : undefined,
  note: (s.note as string) ?? undefined,
  status: s.status as "open" | "closed",
});

/** Open the café's cash drawer (rejects if one is already open). */
export async function openShift(cafeId: string, startingFloat: number): Promise<OpenShiftResult> {
  await verifySession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pos_open_shift", {
    p_cafe_id: cafeId,
    p_float: Math.max(0, Math.round(startingFloat || 0)),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, shift: shiftFromJson(data as Record<string, unknown>) };
}

/** Close the drawer with a physical count → expected + over/short (Z reading). */
export async function closeShift(shiftId: string, countedCash: number, note?: string): Promise<CloseShiftResult> {
  await verifySession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pos_close_shift", {
    p_shift_id: shiftId,
    p_counted_cash: Math.round(countedCash || 0),
    p_note: note ?? "",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, shift: shiftFromJson(data as Record<string, unknown>) };
}

/** The café's currently-open shift, or null. RLS-scoped to members. */
export async function getOpenShift(cafeId: string): Promise<Shift | null> {
  await verifySession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("shifts")
    .select("id, cafe_id, opened_by, opened_at, starting_float, status")
    .eq("cafe_id", cafeId)
    .eq("status", "open")
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    cafeId: data.cafe_id,
    openedBy: data.opened_by,
    openedAt: new Date(data.opened_at).getTime(),
    startingFloat: data.starting_float,
    status: "open",
  };
}

/**
 * Record a staff-rung sale. Re-prices each line from the café's own menu +
 * live promos (client prices only survive for off-menu items), then hands
 * resolved lines to pos_record_sale, which owns the total/VAT/change math.
 */
export async function recordSale(
  slug: string,
  cafeId: string,
  shiftId: string,
  input: {
    lines: TicketLineInput[];
    tenderType: string;
    tenderLabel?: string;
    amountTendered?: number;
    serviceChargeRate: number;
  },
): Promise<RecordSaleResult> {
  await verifySession();
  const supabase = await createClient();

  // Authoritative re-pricing (same approach as submitCounterOrder): match each
  // line to the café menu by item name + option labels and rebuild its unit
  // price from base + option deltas + the best live promo. Off-menu lines keep
  // the client price. `now` drives promo scheduling in Manila time.
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
    return { name: l.name, qty: l.qty, options, price: (best ? best.price : item.price) + delta };
  });

  const { data, error } = await supabase.rpc("pos_record_sale", {
    p_cafe_id: cafeId,
    p_shift_id: shiftId,
    p_lines: lines,
    p_tender_type: input.tenderType,
    p_tender_label: input.tenderLabel ?? "",
    p_amount_tendered: input.amountTendered ?? null,
    p_service_charge_rate: Math.max(0, Math.round(input.serviceChargeRate || 0)),
  });
  if (error) return { ok: false, error: error.message };

  const o = data as Record<string, unknown>;
  const sale: PosSale = {
    id: o.id as string,
    code: o.code as string,
    lines: rowToLines(o.lines as never[]),
    total: o.total as number,
    status: o.status as Order["status"],
    channel: "pos",
    placedAt: Number(o.placedAt),
    completedAt: o.completedAt != null ? Number(o.completedAt) : undefined,
    recorded: true,
    tenderType: (o.tenderType as string) ?? undefined,
    tenderLabel: (o.tenderLabel as string) ?? undefined,
    amountTendered: o.amountTendered != null ? Number(o.amountTendered) : undefined,
    changeDue: o.changeDue != null ? Number(o.changeDue) : undefined,
    netAmount: o.netAmount != null ? Number(o.netAmount) : undefined,
    vatAmount: o.vatAmount != null ? Number(o.vatAmount) : undefined,
    serviceCharge: o.serviceCharge != null ? Number(o.serviceCharge) : undefined,
    paidAt: o.paidAt != null ? Number(o.paidAt) : undefined,
  };
  return { ok: true, sale };
}

/** Recorded POS sales for a shift (for the shift bar's running totals). */
export async function getShiftSales(shiftId: string): Promise<PosSale[]> {
  await verifySession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, code, total, status, channel, placed_at, completed_at, paid_at, tender_type, tender_label, amount_tendered, change_due, net_amount, vat_amount, service_charge, order_lines(id, name, price, qty, options, position)")
    .eq("shift_id", shiftId)
    .order("placed_at", { ascending: false });
  return (data ?? []).map((o) => ({
    id: o.id,
    code: o.code,
    lines: rowToLines(o.order_lines as never[]),
    total: o.total,
    status: o.status as Order["status"],
    channel: "pos" as const,
    placedAt: new Date(o.placed_at).getTime(),
    completedAt: o.completed_at ? new Date(o.completed_at).getTime() : undefined,
    recorded: true,
    tenderType: o.tender_type ?? undefined,
    tenderLabel: o.tender_label ?? undefined,
    amountTendered: o.amount_tendered ?? undefined,
    changeDue: o.change_due ?? undefined,
    netAmount: o.net_amount ?? undefined,
    vatAmount: o.vat_amount ?? undefined,
    serviceCharge: o.service_charge ?? undefined,
    paidAt: o.paid_at ? new Date(o.paid_at).getTime() : undefined,
  }));
}

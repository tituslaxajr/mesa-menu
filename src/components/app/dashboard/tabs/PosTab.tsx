"use client";
// Staff cashier terminal ("Register"). Left: menu picker. Right: the current
// ticket + totals + Charge. A cash drawer (shift) must be open to ring a sale;
// tender is cash/manual only (Mesa records the sale, it doesn't move money).
// Sales are written to the DB via pos-actions and flow into the same analytics
// path as confirmed counter orders (see StudioProvider.effectiveOrders).

import React, { useEffect, useMemo, useState } from "react";
import { Search, X, Trash2, Banknote, Check, DoorOpen, DoorClosed, ShoppingCart, Printer, FileText, BellRing } from "lucide-react";
import { Button, Card, Input, Badge } from "@/components/ds";
import { useStudio } from "../StudioProvider";
import { PageWrap, SectionTitle, useNow } from "../shared";
import { cartKey, unitPrice, choiceLabels, defaultChoiceIds } from "@/lib/cart";
import { ticketTotals, changeDue } from "@/lib/pos-pricing";
import { printReceipt, printXReading, printZReading } from "@/lib/pos-receipt";
import {
  openShift, closeShift, getOpenShift, recordSale, getShiftSales, voidSale, refundSale,
  type Shift, type PosSale,
} from "@/lib/pos-actions";
import { cancelPending, type PendingOrder } from "@/lib/order-actions";
import { timeAgo } from "@/lib/orders-store";
import type { MenuItem } from "@/lib/data";

const money = (n: number) => `₱${(n ?? 0).toLocaleString("en-PH")}`;
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// A ticket line, source-agnostic: built from a menu pick OR loaded from a
// guest's counter order. Carries the resolved unit price + option labels so
// both paths render and record identically.
type Entry = { name: string; unitPrice: number; qty: number; options: string[] };
type Tender = "cash" | "gcash" | "card" | "other";
const TENDERS: { id: Tender; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "gcash", label: "GCash" },
  { id: "card", label: "Card" },
  { id: "other", label: "Other" },
];

/** Does the item need a choice made before it can be added? */
const needsSheet = (item: MenuItem) => (item.options ?? []).some((g) => g.required || g.multi);

export function PosTab() {
  const { items, cafe, slug, cafeId, posEnabled, canManage, pendingOrders, toast, refreshDbOrders } = useStudio();
  const now = useNow(30000);

  const [shift, setShift] = useState<Shift | null>(null);
  const [shiftReady, setShiftReady] = useState(false);
  const [shiftSales, setShiftSales] = useState<PosSale[]>([]);

  const [ticket, setTicket] = useState<Record<string, Entry>>({});
  // The pending counter order this ticket was loaded from (if any), so we can
  // retire it once the sale is rung — avoids it lingering or being charged twice.
  const [fulfilling, setFulfilling] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [sheetItem, setSheetItem] = useState<MenuItem | null>(null);
  const [charging, setCharging] = useState(false);
  const [closing, setClosing] = useState(false);
  const [receipt, setReceipt] = useState<PosSale | null>(null);
  const [adjust, setAdjust] = useState<{ sale: PosSale; kind: "void" | "refund" } | null>(null);

  const [rate, setRate] = useState<number>(cafe.serviceChargeRate ?? 0);

  // Load the open shift (and its sales) on mount / café change. setState lives
  // in the async callbacks (not the effect body), so it syncs the DB → React
  // without the synchronous-setState smell.
  useEffect(() => {
    if (!cafeId) return;
    let active = true;
    getOpenShift(cafeId)
      .then((s) => { if (active) { setShift(s); setShiftReady(true); } })
      .catch(() => { if (active) setShiftReady(true); });
    return () => { active = false; };
  }, [cafeId]);

  useEffect(() => {
    if (!shift) return;
    let active = true;
    getShiftSales(shift.id).then((s) => { if (active) setShiftSales(s); }).catch(() => {});
    return () => { active = false; };
  }, [shift]);

  // Reset the per-ticket service rate to the café default whenever a fresh
  // ticket starts (i.e. becomes empty).
  const isEmpty = Object.keys(ticket).length === 0;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync per-ticket rate to café default on a fresh ticket
    if (isEmpty) setRate(cafe.serviceChargeRate ?? 0);
  }, [isEmpty, cafe.serviceChargeRate]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.map((i) => i.cat)))],
    [items],
  );
  const shownItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) => (cat === "All" || i.cat === cat) && (!q || i.name.toLowerCase().includes(q)),
    );
  }, [items, cat, query]);

  const lines = useMemo(
    () => Object.entries(ticket).map(([key, e]) => ({
      key,
      name: e.name,
      qty: e.qty,
      unit: e.unitPrice,
      options: e.options,
    })),
    [ticket],
  );
  const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const totals = ticketTotals(subtotal, rate);

  const add = (item: MenuItem, choiceIds: string[]) => {
    const key = cartKey(item.id, choiceIds);
    const entry: Entry = { name: item.name, unitPrice: unitPrice(item, choiceIds), qty: 1, options: choiceLabels(item, choiceIds) };
    setTicket((t) => ({
      ...t,
      [key]: t[key] ? { ...t[key], qty: t[key].qty + 1 } : entry,
    }));
  };
  const pick = (item: MenuItem) => {
    if (item.soldOut) return;
    if (needsSheet(item)) setSheetItem(item);
    else add(item, defaultChoiceIds(item));
  };
  const setQty = (key: string, qty: number) =>
    setTicket((t) => {
      if (qty <= 0) { const n = { ...t }; delete n[key]; return n; }
      return { ...t, [key]: { ...t[key], qty } };
    });
  const clearTicket = () => { setTicket({}); setFulfilling(null); };

  // Load a guest's counter order into the ticket so the cashier can take
  // payment. Lines arrive already priced; recordSale re-prices authoritatively.
  const loadPending = (order: PendingOrder) => {
    const next: Record<string, Entry> = {};
    for (const l of order.lines) {
      const options = l.options ?? [];
      const key = `g:${l.name}#${[...options].sort().join(",")}`;
      next[key] = next[key]
        ? { ...next[key], qty: next[key].qty + l.qty }
        : { name: l.name, unitPrice: l.price, qty: l.qty, options };
    }
    setTicket(next);
    setFulfilling(order.id);
    toast(`Loaded #${order.code} — take payment to complete it`);
  };

  const doOpenShift = async (float: number) => {
    if (!cafeId) return;
    const r = await openShift(cafeId, float);
    if (r.ok) { setShift(r.shift); toast("Drawer open — ready to ring sales"); }
    else toast(r.error);
  };

  const doCloseShift = async (counted: number, note: string) => {
    if (!shift) return;
    const r = await closeShift(shift.id, counted, note);
    const salesSnapshot = shiftSales;
    if (r.ok) {
      setClosing(false);
      setShift(null);
      setShiftSales([]);
      const s = r.shift;
      printZReading(cafe.name, s, salesSnapshot); // Z reading on drawer close
      const os = s.overShort ?? 0;
      toast(os === 0 ? "Drawer balanced — shift closed"
        : `Shift closed · ${os > 0 ? "over" : "short"} ${money(Math.abs(os))}`);
    } else toast(r.error);
  };

  const doCharge = async (tenderType: Tender, tenderLabel: string, amountTendered: number | undefined) => {
    if (!shift || !cafeId) return;
    const r = await recordSale(slug, cafeId, shift.id, {
      lines: lines.map((l) => ({ name: l.name, qty: l.qty, price: l.unit, options: l.options.length ? l.options : undefined })),
      tenderType,
      tenderLabel,
      amountTendered,
      serviceChargeRate: rate,
    });
    if (!r.ok) { toast(r.error); return; }
    // If this ticket came from a guest's counter order, retire that pending
    // copy so it leaves the queue (the poll in StudioProvider drops it).
    if (fulfilling) { void cancelPending(fulfilling); }
    setCharging(false);
    setReceipt(r.sale);
    clearTicket();
    refreshDbOrders();
    getShiftSales(shift.id).then(setShiftSales).catch(() => {});
    toast(`Sale #${r.sale.code} recorded`);
  };

  const doAdjust = async (sale: PosSale, kind: "void" | "refund", reason: string) => {
    const r = kind === "void" ? await voidSale(sale.id, reason) : await refundSale(sale.id, reason);
    if (!r.ok) { toast(r.error); return; }
    setAdjust(null);
    if (shift) getShiftSales(shift.id).then(setShiftSales).catch(() => {});
    refreshDbOrders();
    toast(kind === "void" ? `Sale #${sale.code} voided` : `Sale #${sale.code} refunded`);
  };

  // Guardrails — the tab is gated in the nav, but be defensive.
  if (!posEnabled || !cafeId) {
    return (
      <PageWrap max={560}>
        <Card variant="flat" padded>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", textAlign: "center", padding: "24px 12px" }}>
            Turn on the cashier terminal in <strong>Settings</strong> to ring up sales here.
          </p>
        </Card>
      </PageWrap>
    );
  }

  if (!shiftReady) {
    return <PageWrap max={560}><p style={{ fontSize: 13.5, color: "var(--text-muted)", padding: 24 }}>Loading register…</p></PageWrap>;
  }

  // No drawer open yet → the open-drawer gate.
  if (!shift) {
    return (
      <>
        <OpenDrawerCard onOpen={doOpenShift} />
        {receipt && <ReceiptModal sale={receipt} cafeName={cafe.name} onClose={() => setReceipt(null)} />}
      </>
    );
  }

  const salesTotal = shiftSales.filter((s) => s.status !== "cancelled" && s.status !== "refunded").reduce((s, o) => s + o.total, 0);

  return (
    <PageWrap max={1180}>
      {/* Shift bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16, padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--surface-card)", border: "1px solid var(--border-soft)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 9, background: "var(--sage-50)", color: "var(--sage-600)", display: "grid", placeItems: "center" }}><DoorOpen size={18} /></span>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-strong)" }}>Drawer open</div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
              {shiftSales.length} {shiftSales.length === 1 ? "sale" : "sales"} · {money(salesTotal)} · float {money(shift.startingFloat)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" onClick={() => printXReading(cafe.name, shift, shiftSales, Date.now())}><FileText size={15} /> X reading</Button>
          <Button variant="secondary" onClick={() => setClosing(true)}><DoorClosed size={15} /> Close drawer</Button>
        </div>
      </div>

      {/* Guest orders sent from the diner menu — tap to load into the ticket */}
      {pendingOrders.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <BellRing size={15} style={{ color: "var(--honey-700)" }} />
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)" }}>Waiting at the counter</span>
            <span style={{ fontSize: 12.5, color: "var(--text-subtle)" }}>{pendingOrders.length}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {pendingOrders.map((o) => {
              const count = o.lines.reduce((s, l) => s + l.qty, 0);
              return (
                <button
                  key={o.id}
                  onClick={() => loadPending(o)}
                  style={{ textAlign: "left", padding: "11px 13px", borderRadius: "var(--radius-md)", border: fulfilling === o.id ? "2px solid var(--brand)" : "1px solid var(--honey-200, #f0e0c0)", background: "var(--honey-50)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 15.5, color: "var(--text-strong)" }}>#{o.code}</span>
                    <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{timeAgo(o.placedAt, now)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--honey-700)", marginTop: 2 }}>
                    {o.table ? `Table ${o.table} · ` : ""}{count} {count === 1 ? "item" : "items"} · {money(o.total)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mesa-dash-2col" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
        {/* Left — menu picker */}
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <Input icon={<Search size={16} />} placeholder="Search the menu…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)} style={{ padding: "6px 12px", borderRadius: 999, border: 0, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, background: cat === c ? "var(--brand)" : "var(--surface-muted)", color: cat === c ? "var(--brand-on)" : "var(--text-body)" }}>{c}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {shownItems.map((item) => (
              <button
                key={item.id}
                onClick={() => pick(item)}
                disabled={item.soldOut}
                style={{ textAlign: "left", padding: "12px 13px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-soft)", background: "var(--surface-card)", cursor: item.soldOut ? "not-allowed" : "pointer", opacity: item.soldOut ? 0.5 : 1, fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column", gap: 4, minHeight: 72 }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-strong)", lineHeight: 1.25 }}>{item.name}</span>
                <span style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 14.5, color: "var(--text-body)" }}>{money(item.price)}</span>
                  {item.soldOut && <Badge variant="neutral">Sold out</Badge>}
                  {needsSheet(item) && !item.soldOut && <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>options</span>}
                </span>
              </button>
            ))}
            {shownItems.length === 0 && (
              <p style={{ gridColumn: "1 / -1", fontSize: 13, color: "var(--text-subtle)", padding: "16px 0" }}>No items match.</p>
            )}
          </div>
        </div>

        {/* Right — ticket */}
        <Card variant="flat" padded style={{ position: "sticky", top: 12 }}>
          <SectionTitle right={lines.length ? <Button variant="ghost" size="sm" onClick={clearTicket}><Trash2 size={14} /> Clear</Button> : undefined}>Ticket</SectionTitle>
          {lines.length === 0 ? (
            <div style={{ textAlign: "center", padding: "26px 8px", color: "var(--text-subtle)" }}>
              <ShoppingCart size={26} style={{ opacity: 0.5 }} />
              <p style={{ fontSize: 13, marginTop: 8 }}>Tap items to build a ticket.</p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                {lines.map((l) => (
                  <div key={l.key} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-strong)" }}>{l.name}</div>
                      {l.options.length > 0 && <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>{l.options.join(" · ")}</div>}
                      <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{money(l.unit)} each</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
                      <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Decrease" style={qtyBtn}>–</button>
                      <span style={{ minWidth: 18, textAlign: "center", fontSize: 13.5, fontWeight: 600 }}>{l.qty}</span>
                      <button onClick={() => setQty(l.key, l.qty + 1)} aria-label="Increase" style={qtyBtn}>+</button>
                    </div>
                    <span style={{ width: 62, textAlign: "right", fontFamily: "var(--font-display)", fontSize: 14, color: "var(--text-strong)", flex: "none" }}>{money(l.unit * l.qty)}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <Row label="Subtotal" value={money(totals.subtotal)} />
                <Row label="VAT included (12%)" value={money(totals.vat)} subtle />
                {totals.serviceCharge > 0 && <Row label={`Service charge (${rate}%)`} value={money(totals.serviceCharge)} subtle />}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>Total</span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text-strong)" }}>{money(totals.total)}</span>
                </div>
              </div>
              <Button variant="primary" block style={{ marginTop: 14 }} onClick={() => setCharging(true)}>
                <Banknote size={16} /> Charge {money(totals.total)}
              </Button>
            </>
          )}
        </Card>
      </div>

      {/* This shift's sales — reprint receipts, and (manager/owner) void/refund */}
      {shiftSales.length > 0 && (
        <Card variant="flat" padded style={{ marginTop: 18 }}>
          <SectionTitle>This shift · {shiftSales.length} {shiftSales.length === 1 ? "sale" : "sales"}</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shiftSales.map((s) => (
              <SaleRow
                key={s.id}
                sale={s}
                canManage={canManage}
                onPrint={() => printReceipt(cafe.name, s)}
                onVoid={() => setAdjust({ sale: s, kind: "void" })}
                onRefund={() => setAdjust({ sale: s, kind: "refund" })}
              />
            ))}
          </div>
        </Card>
      )}

      {sheetItem && (
        <OptionSheet item={sheetItem} onClose={() => setSheetItem(null)} onAdd={(ids) => add(sheetItem, ids)} />
      )}
      {charging && (
        <TenderModal total={totals.total} onClose={() => setCharging(false)} onConfirm={doCharge} />
      )}
      {closing && (
        <CloseDrawerModal onClose={() => setClosing(false)} onConfirm={doCloseShift} />
      )}
      {receipt && <ReceiptModal sale={receipt} cafeName={cafe.name} onClose={() => setReceipt(null)} />}
      {adjust && (
        <AdjustModal sale={adjust.sale} kind={adjust.kind} onClose={() => setAdjust(null)} onConfirm={(reason) => doAdjust(adjust.sale, adjust.kind, reason)} />
      )}
    </PageWrap>
  );
}

const SALE_STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  completed: { label: "Done", fg: "var(--sage-600)", bg: "var(--sage-50)" },
  cancelled: { label: "Voided", fg: "var(--text-muted)", bg: "var(--surface-muted)" },
  refunded: { label: "Refunded", fg: "var(--soldout, #b42318)", bg: "var(--soldout-soft, #F6E4DE)" },
};

function SaleRow({ sale, canManage, onPrint, onVoid, onRefund }: { sale: PosSale; canManage: boolean; onPrint: () => void; onVoid: () => void; onRefund: () => void }) {
  const st = SALE_STATUS[sale.status] ?? SALE_STATUS.completed;
  const live = sale.status === "completed";
  const count = sale.lines.reduce((s, l) => s + l.qty, 0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "9px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-card)", border: "1px solid var(--border-soft)", opacity: live ? 1 : 0.7 }}>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--text-strong)" }}>#{sale.code}</span>
      <span style={{ fontSize: 12.5, color: "var(--text-subtle)" }}>{count} {count === 1 ? "item" : "items"} · {sale.tenderType === "cash" ? "Cash" : cap(sale.tenderType ?? "")}</span>
      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: st.fg, background: st.bg }}>{st.label}</span>
      <span style={{ marginLeft: "auto", fontFamily: "var(--font-display)", fontSize: 15, color: "var(--text-strong)" }}>{money(sale.total)}</span>
      <div style={{ display: "flex", gap: 4, flex: "none" }}>
        <Button variant="ghost" size="sm" onClick={onPrint}><Printer size={13} /></Button>
        {canManage && live && (
          <>
            <Button variant="ghost" size="sm" onClick={onVoid}>Void</Button>
            <Button variant="ghost" size="sm" onClick={onRefund}>Refund</Button>
          </>
        )}
      </div>
    </div>
  );
}

function AdjustModal({ sale, kind, onClose, onConfirm }: { sale: PosSale; kind: "void" | "refund"; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const verb = kind === "void" ? "Void" : "Refund";
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-strong)" }}>{verb} sale #{sale.code}</h3>
        <button onClick={onClose} aria-label="Close" style={{ ...qtyBtn, width: 30, height: 30 }}><X size={16} /></button>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
        {kind === "void"
          ? `This cancels ${money(sale.total)} — use it for a ticket rung by mistake. It drops out of your sales and is logged.`
          : `This refunds ${money(sale.total)} — return the payment to the customer. It drops out of your sales and is logged.`}
      </p>
      <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={kind === "void" ? "e.g. wrong item rung" : "e.g. customer returned drink"} autoFocus />
      <Button variant="danger" block style={{ marginTop: 16 }} disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
        {verb} · {money(sale.total)}
      </Button>
    </Overlay>
  );
}

const qtyBtn: React.CSSProperties = { width: 26, height: 26, borderRadius: 7, border: "1px solid var(--border-default)", background: "var(--surface-card)", cursor: "pointer", fontSize: 16, lineHeight: 1, color: "var(--text-body)" };

function Row({ label, value, subtle }: { label: string; value: string; subtle?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: subtle ? "var(--text-muted)" : "var(--text-body)" }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

// ── Modals / gates ──────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "grid", placeItems: "center", padding: 16 }}>
      <div className="mesa-anim-fade" onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(31,20,14,0.45)" }} />
      <div className="mesa-anim-rise" style={{ position: "relative", width: "min(420px, 100%)", background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: 22, boxShadow: "var(--shadow-lg)" }}>
        {children}
      </div>
    </div>
  );
}

function OpenDrawerCard({ onOpen }: { onOpen: (float: number) => void }) {
  const [float, setFloat] = useState("0");
  return (
    <PageWrap max={480}>
      <Card variant="flat" padded>
        <div style={{ textAlign: "center", padding: "10px 6px" }}>
          <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--brand-soft)", color: "var(--brand-active)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><DoorOpen size={26} /></span>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "var(--text-strong)" }}>Open the cash drawer</h3>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "6px auto 18px", maxWidth: 320 }}>
            Count the cash you&rsquo;re starting with (your float), then open the drawer to start ringing sales.
          </p>
          <div style={{ maxWidth: 200, margin: "0 auto 16px", textAlign: "left" }}>
            <Input label="Starting cash (₱)" type="number" min={0} value={float} onChange={(e) => setFloat(e.target.value)} />
          </div>
          <Button variant="primary" onClick={() => onOpen(Math.max(0, Number(float) || 0))}><DoorOpen size={16} /> Open drawer</Button>
        </div>
      </Card>
    </PageWrap>
  );
}

function OptionSheet({ item, onClose, onAdd }: { item: MenuItem; onClose: () => void; onAdd: (choiceIds: string[]) => void }) {
  const [choiceIds, setChoiceIds] = useState<string[]>(() => defaultChoiceIds(item));
  const groups = item.options ?? [];
  const toggle = (groupChoiceIds: string[], choiceId: string, multi: boolean) => {
    setChoiceIds((ids) => {
      if (multi) return ids.includes(choiceId) ? ids.filter((x) => x !== choiceId) : [...ids, choiceId];
      // single-select: swap out any other choice from the same group
      return [...ids.filter((x) => !groupChoiceIds.includes(x)), choiceId];
    });
  };
  const up = unitPrice(item, choiceIds);
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-strong)" }}>{item.name}</h3>
        <button onClick={onClose} aria-label="Close" style={{ ...qtyBtn, width: 30, height: 30 }}><X size={16} /></button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: "50vh", overflowY: "auto", padding: "8px 2px" }}>
        {groups.map((g) => {
          const groupChoiceIds = g.choices.map((c) => c.id);
          return (
            <div key={g.id}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-strong)", marginBottom: 8 }}>
                {g.label}{g.required && !g.multi ? "" : g.multi ? " (optional)" : ""}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {g.choices.map((c) => {
                  const on = choiceIds.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggle(groupChoiceIds, c.id, !!g.multi)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: "var(--radius-md)", border: on ? "2px solid var(--brand)" : "1px solid var(--border-soft)", background: on ? "var(--brand-soft)" : "var(--surface-card)", cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }}>
                      <span style={{ width: 16, height: 16, flex: "none", borderRadius: g.multi ? 5 : 999, border: on ? "5px solid var(--brand)" : "2px solid var(--bean-300, #cbb8a4)" }} />
                      <span style={{ flex: 1, fontSize: 13.5, color: "var(--text-strong)" }}>{c.label}</span>
                      {c.priceDelta ? <span style={{ fontSize: 13, color: "var(--text-muted)" }}>+{money(c.priceDelta)}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <Button variant="primary" block style={{ marginTop: 16 }} onClick={() => { onAdd(choiceIds); onClose(); }}>
        Add · {money(up)}
      </Button>
    </Overlay>
  );
}

function TenderModal({ total, onClose, onConfirm }: { total: number; onClose: () => void; onConfirm: (t: Tender, label: string, amount: number | undefined) => void }) {
  const [tender, setTender] = useState<Tender>("cash");
  const [cash, setCash] = useState("");
  const [label, setLabel] = useState("");
  const tendered = Number(cash) || 0;
  const change = changeDue(total, tendered);
  const short = tender === "cash" && tendered > 0 && tendered < total;
  // Quick-cash chips: the exact amount + common rounded notes above it.
  const chips = Array.from(new Set([total, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000])).filter((n) => n >= total).slice(0, 5);
  const canConfirm = tender !== "cash" || tendered >= total;
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-strong)" }}>Take payment · {money(total)}</h3>
        <button onClick={onClose} aria-label="Close" style={{ ...qtyBtn, width: 30, height: 30 }}><X size={16} /></button>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {TENDERS.map((t) => (
          <button key={t.id} onClick={() => setTender(t.id)} style={{ flex: 1, padding: "9px 6px", borderRadius: "var(--radius-md)", border: tender === t.id ? "2px solid var(--brand)" : "1px solid var(--border-soft)", background: tender === t.id ? "var(--brand-soft)" : "var(--surface-card)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>{t.label}</button>
        ))}
      </div>
      {tender === "cash" ? (
        <>
          <Input label="Cash received (₱)" type="number" min={0} value={cash} onChange={(e) => setCash(e.target.value)} autoFocus />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0 4px" }}>
            {chips.map((c) => (
              <button key={c} onClick={() => setCash(String(c))} style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid var(--border-default)", background: "var(--surface-card)", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-body)" }}>{money(c)}</button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 15 }}>
            <span style={{ color: "var(--text-muted)" }}>Change</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: short ? "var(--soldout, #b42318)" : "var(--text-strong)" }}>{short ? "Insufficient" : money(change)}</span>
          </div>
        </>
      ) : (
        <Input label="Reference / note (optional)" value={label} onChange={(e) => setLabel(e.target.value)} hint="e.g. GCash ref number. Mesa records the tender; it doesn't process it." />
      )}
      <Button variant="primary" block style={{ marginTop: 16 }} disabled={!canConfirm}
        onClick={() => onConfirm(tender, tender === "cash" ? "" : label, tender === "cash" ? tendered : undefined)}>
        <Check size={16} /> Record sale
      </Button>
    </Overlay>
  );
}

function CloseDrawerModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (counted: number, note: string) => void }) {
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-strong)" }}>Close the drawer</h3>
        <button onClick={onClose} aria-label="Close" style={{ ...qtyBtn, width: 30, height: 30 }}><X size={16} /></button>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
        Count all the cash in the drawer and enter the total. Mesa compares it to what it expects (float + cash sales) and records any over/short.
      </p>
      <Input label="Counted cash (₱)" type="number" min={0} value={counted} onChange={(e) => setCounted(e.target.value)} autoFocus />
      <div style={{ marginTop: 12 }}>
        <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <Button variant="primary" block style={{ marginTop: 16 }} onClick={() => onConfirm(Math.max(0, Number(counted) || 0), note)}>
        <DoorClosed size={16} /> Close & record
      </Button>
    </Overlay>
  );
}

function ReceiptModal({ sale, cafeName, onClose }: { sale: PosSale; cafeName: string; onClose: () => void }) {
  const t = (sale.tenderType ?? "cash");
  return (
    <Overlay onClose={onClose}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span style={{ width: 46, height: 46, borderRadius: 999, background: "var(--sage-50)", color: "var(--sage-600)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}><Check size={24} /></span>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-strong)" }}>Sale recorded</h3>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{cafeName} · #{sale.code}</div>
      </div>
      <div style={{ borderTop: "1px dashed var(--border-default)", borderBottom: "1px dashed var(--border-default)", padding: "12px 0", display: "flex", flexDirection: "column", gap: 6 }}>
        {sale.lines.map((l) => (
          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-body)" }}>
            <span>{l.qty}× {l.name}{l.options?.length ? ` (${l.options.join(", ")})` : ""}</span>
            <span>{money(l.price * l.qty)}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 0", display: "flex", flexDirection: "column", gap: 5 }}>
        {sale.serviceCharge ? <Row label="Service charge" value={money(sale.serviceCharge)} subtle /> : null}
        <Row label="VAT included (12%)" value={money(sale.vatAmount ?? 0)} subtle />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>
          <span>Total</span><span>{money(sale.total)}</span>
        </div>
        <Row label={`Tender (${t})`} value={sale.amountTendered != null ? money(sale.amountTendered) : "—"} subtle />
        {t === "cash" && <Row label="Change" value={money(sale.changeDue ?? 0)} subtle />}
      </div>
      <p style={{ fontSize: 11, color: "var(--text-subtle)", textAlign: "center", marginBottom: 14 }}>
        This is a courtesy receipt, not a BIR Official Receipt.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="secondary" block onClick={() => printReceipt(cafeName, sale)}><Printer size={16} /> Print</Button>
        <Button variant="primary" block onClick={onClose}>New sale</Button>
      </div>
    </Overlay>
  );
}

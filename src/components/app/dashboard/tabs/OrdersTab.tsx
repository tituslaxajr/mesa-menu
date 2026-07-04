"use client";

import {
  Plus,
  X,
  Check,
  Clock,
  Trash2,
  Inbox,
  ChefHat,
  BellRing,
  Hash,
  type LucideIcon,
} from "lucide-react";
import { Button, Select, Badge, Card } from "@/components/ds";
import { useLocalStore } from "@/lib/useLocalStore";
import { timeAgo, type Order, type OrdersApi, type OrderStatus } from "@/lib/orders-store";
import { type MenuItem } from "@/lib/data";
import { useNow, PageWrap, SectionTitle, dpeso } from "../shared";

/* ════ ORDERS ══════════════════════════════════════════════════════ */
const ORDER_LANES: { status: OrderStatus; label: string; icon: LucideIcon; tint: string; fg: string }[] = [
  { status: "new", label: "New", icon: Inbox, tint: "var(--brand-soft)", fg: "var(--brand-active)" },
  { status: "preparing", label: "Preparing", icon: ChefHat, tint: "var(--honey-50)", fg: "var(--honey-700)" },
  { status: "ready", label: "Ready", icon: BellRing, tint: "var(--sage-50)", fg: "var(--sage-600)" },
];
const NEXT_STATUS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new: { to: "preparing", label: "Start preparing" },
  preparing: { to: "ready", label: "Mark ready" },
  ready: { to: "completed", label: "Complete" },
};

// How long a finished order stays on the board before it's auto-archived
// (hidden from the Completed strip but kept in storage, so Analytics still
// counts it). Owner-chosen; persisted per café.
const ARCHIVE_OPTIONS = [
  { id: "1h", label: "after 1 hour" },
  { id: "4h", label: "after 4 hours" },
  { id: "today", label: "end of day" },
  { id: "all", label: "never" },
];
function archiveCutoff(opt: string, now: number): number {
  if (opt === "all") return -Infinity;
  if (opt === "today") { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); }
  const hours = opt === "1h" ? 1 : 4;
  return now - hours * 3600000;
}

function OrderCard({ order, now, api }: { order: Order; now: number; api: OrdersApi }) {
  const adv = NEXT_STATUS[order.status];
  const finished = order.status === "completed" || order.status === "cancelled";
  return (
    <Card variant="flat" padded>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--text-strong)" }}>#{order.code}</span>
          {order.table && (
            <Badge variant="neutral"><Hash size={11} style={{ marginRight: 1 }} />Table {order.table}</Badge>
          )}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "var(--text-subtle)", flex: "none" }}>
          <Clock size={12} /> {timeAgo(order.placedAt, now)}
        </span>
      </div>
      <div style={{ margin: "10px 0", display: "flex", flexDirection: "column", gap: 5 }}>
        {order.lines.map((l) => (
          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13.5, color: "var(--text-body)" }}>
            <span style={{ minWidth: 0 }}>
              <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>{l.qty}×</span> {l.name}
              {l.options && l.options.length > 0 && (
                <span style={{ display: "-webkit-box", fontSize: 12, color: "var(--text-subtle)", marginLeft: 20, lineHeight: 1.35, overflow: "hidden", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{l.options.join(" · ")}</span>
              )}
            </span>
            <span style={{ color: "var(--text-muted)", flex: "none" }}>{dpeso(l.price * l.qty)}</span>
          </div>
        ))}
      </div>
      {order.note && (
        <div style={{ fontSize: 12.5, color: "var(--honey-700)", background: "var(--honey-50)", borderRadius: "var(--radius-sm)", padding: "6px 9px", marginBottom: 10, overflowWrap: "anywhere" }}>
          “{order.note}”
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--border-soft)" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-strong)" }}>{dpeso(order.total)}</span>
        {finished ? (
          <Button variant="ghost" size="sm" onClick={() => api.remove(order.id)}><Trash2 size={14} /> Remove</Button>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <Button variant="ghost" size="sm" onClick={() => api.setStatus(order.id, "cancelled")}><X size={14} /></Button>
            {adv && <Button variant="primary" size="sm" onClick={() => api.setStatus(order.id, adv.to)}>{adv.label}</Button>}
          </div>
        )}
      </div>
    </Card>
  );
}

export function OrdersTab({ orders, api, items, slug }: { orders: Order[]; api: OrdersApi; items: MenuItem[]; slug: string }) {
  const now = useNow(30000);
  const [archiveAfter, setArchiveAfter] = useLocalStore<string>(`mesa.orders.${slug}.archiveAfter`, "4h");

  const finished = orders.filter((o) => o.status === "completed" || o.status === "cancelled");
  const cutoff = archiveCutoff(archiveAfter, now);
  const visibleFinished = finished.filter((o) => (o.completedAt ?? o.placedAt) >= cutoff);
  const archivedCount = finished.length - visibleFinished.length;

  const placeSample = () => {
    const pick = items.filter((i) => !i.soldOut).slice(0, 2);
    const lines = (pick.length ? pick : items.slice(0, 2)).map((i, idx) => ({ id: i.id, name: i.name, price: i.price, qty: idx === 0 ? 2 : 1 }));
    const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
    api.place({ lines, total, table: String(2 + (orders.length % 8)), note: orders.length % 3 === 0 ? "Less ice please" : undefined });
  };

  if (!orders.length) {
    return (
      <PageWrap max={560}>
        <Card variant="flat" padded>
          <div style={{ textAlign: "center", padding: "26px 12px" }}>
            <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--brand-soft)", color: "var(--brand-active)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Inbox size={26} /></span>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "var(--text-strong)" }}>No orders yet</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "6px auto 18px", maxWidth: 340 }}>
              When a guest scans a table QR and places an order, it lands here in real time. Try it from your live menu, or drop in a sample.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Button variant="primary" onClick={placeSample}><Plus /> Add a sample order</Button>
            </div>
          </div>
        </Card>
      </PageWrap>
    );
  }

  return (
    <PageWrap max={1180}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, alignItems: "start" }}>
        {ORDER_LANES.map((lane) => {
          const list = orders.filter((o) => o.status === lane.status);
          return (
            <div key={lane.status} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "2px 2px 4px" }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: lane.tint, color: lane.fg }}><lane.icon size={17} /></span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-strong)" }}>{lane.label}</span>
                <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "var(--text-subtle)" }}>{list.length}</span>
              </div>
              {list.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--text-subtle)", textAlign: "center", padding: "18px 0", border: "1px dashed var(--border-soft)", borderRadius: "var(--radius-md)" }}>Nothing here</div>
              ) : (
                list.map((o) => <OrderCard key={o.id} order={o} now={now} api={api} />)
              )}
            </div>
          );
        })}
      </div>

      {finished.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <SectionTitle
            right={
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12.5, color: "var(--text-subtle)", whiteSpace: "nowrap" }}>Auto-archive</span>
                <Select value={archiveAfter} onChange={(e) => setArchiveAfter(e.target.value)} options={ARCHIVE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))} />
                {visibleFinished.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => api.removeMany(visibleFinished.map((o) => o.id))}><Trash2 size={14} /> Clear {visibleFinished.length}</Button>
                )}
              </div>
            }
          >Completed</SectionTitle>
          {visibleFinished.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-subtle)", padding: "14px 0" }}>All caught up — completed orders are archived.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {visibleFinished.map((o) => (
                <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "11px 14px", borderRadius: "var(--radius-md)", background: "var(--surface-card)", border: "1px solid var(--border-soft)", opacity: o.status === "cancelled" ? 0.65 : 1 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--text-strong)" }}>#{o.code}</span>
                    {o.table && <span style={{ fontSize: 12.5, color: "var(--text-subtle)" }}>T{o.table}</span>}
                    {o.status === "cancelled"
                      ? <Badge variant="neutral">Cancelled</Badge>
                      : <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12.5, color: "var(--sage-600)" }}><Check size={13} /> Done</span>}
                  </span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 14.5, color: "var(--text-muted)" }}>{dpeso(o.total)}</span>
                </div>
              ))}
            </div>
          )}
          {archivedCount > 0 && (
            <p style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: 12 }}>
              {archivedCount} earlier {archivedCount === 1 ? "order" : "orders"} archived · still counted in Analytics.
            </p>
          )}
        </div>
      )}
    </PageWrap>
  );
}

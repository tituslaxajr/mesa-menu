"use client";

import {
  Utensils,
  Palette,
  QrCode,
  Plus,
  Ban,
  Download,
  Banknote,
  ClipboardList,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { Button, Card } from "@/components/ds";
import { menuUrl, menuLabel } from "@/lib/site";
import { timeAgo, type Order } from "@/lib/orders-store";
import { isSale } from "@/lib/sales";
import { THEMES, type Cafe, type MenuItem, type ThemeKey, type BrandKit } from "@/lib/data";
import { useNow, PageWrap, StatCard, SectionTitle, dpeso, orderBadge, type TabId } from "../shared";

/* ════ HOME ════════════════════════════════════════════════════════ */
export function HomeTab({ items, cafe, theme, brand, orders, setTab }: { items: MenuItem[]; cafe: Cafe; theme: ThemeKey; brand: BrandKit; orders: Order[]; setTab: (t: TabId) => void }) {
  const soldOut = items.filter((i) => i.soldOut).length;

  // "Today" = since local midnight. Re-ticks so time-ago labels stay fresh.
  const now = useNow(30000);
  const dayStart = (() => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  // isSale: counter carts are unverified summaries — shown in "Recent" below,
  // never counted as revenue (Phase 2 confirmation is what records a sale).
  const todays = orders.filter((o) => o.placedAt >= dayStart && isSale(o));
  const ordersToday = todays.length;
  const revenueToday = todays.reduce((s, o) => s + o.total, 0);
  const newToday = todays.filter((o) => o.status === "new").length;
  const recent = orders.slice(0, 6);
  const curTheme = THEMES.find((t) => t.key === theme) || THEMES[0];
  const qr = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(menuUrl(cafe.slug))}&size=240x240&color=2A1D16&bgcolor=FFFFFF&margin=8`;
  const quick: { icon: LucideIcon; label: string; sub: string; go: TabId }[] = [
    { icon: Plus, label: "Add item", sub: "New menu item", go: "menu" },
    { icon: Ban, label: "Mark sold out", sub: "Hide for today", go: "menu" },
    { icon: Palette, label: "Menu theme", sub: "Choose the look", go: "appearance" },
    { icon: QrCode, label: "Download QR", sub: "For your tables", go: "qr" },
  ];

  return (
    <PageWrap>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 18 }}>
        <StatCard icon={ClipboardList} value={ordersToday} label="Orders today" delta={newToday ? `${newToday} new` : undefined} />
        <StatCard icon={Banknote} value={`₱${revenueToday.toLocaleString("en-PH")}`} label="Revenue today" />
        <StatCard icon={Utensils} value={items.length} label="Total items" />
        <StatCard icon={Ban} value={soldOut} label="Sold out today" />
      </div>

      <SectionTitle>Quick actions</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 26 }}>
        {quick.map((q) => (
          <Card key={q.label} interactive padded onClick={() => setTab(q.go)} style={{ cursor: "pointer" }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: "var(--brand-soft)", color: "var(--brand-active)", display: "grid", placeItems: "center" }}>
              <q.icon size={19} />
            </span>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-strong)", marginTop: 12 }}>{q.label}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>{q.sub}</div>
          </Card>
        ))}
      </div>

      <div className="mesa-dash-2col" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
        <Card variant="flat" padded>
          <SectionTitle right={recent.length ? <Button variant="ghost" size="sm" onClick={() => setTab("orders")}>View all</Button> : undefined}>Recent orders</SectionTitle>
          {recent.length === 0 ? (
            <div style={{ textAlign: "center", padding: "26px 12px" }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--brand-soft)", color: "var(--brand-active)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}><Inbox size={22} /></span>
              <div style={{ fontSize: 14, color: "var(--text-strong)", fontWeight: 600 }}>No orders yet</div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3 }}>Orders from your tables will show up here.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recent.map((o, i) => {
                const sb = orderBadge(o);
                const qty = o.lines.reduce((s, l) => s + l.qty, 0);
                return (
                  <button key={o.id} onClick={() => setTab("orders")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: i ? "1px solid var(--border-soft)" : 0, background: "none", border: 0, borderTopWidth: i ? 1 : 0, cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "var(--font-sans)" }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: "var(--surface-muted)", fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>#{o.code}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: "var(--text-strong)", fontWeight: 600 }}>{o.table ? `Table ${o.table}` : "Walk-in"} · {dpeso(o.total)}</div>
                      <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{qty} item{qty === 1 ? "" : "s"} · {timeAgo(o.placedAt, now || o.placedAt)}</div>
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, color: sb.fg, background: sb.bg, flex: "none" }}>{sb.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card variant="flat" padded>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 10 }}>Live menu theme</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ display: "flex", borderRadius: 10, overflow: "hidden", flex: "none", boxShadow: "var(--shadow-xs)" }}>
                {[curTheme.swatch[0], brand.accent || curTheme.swatch[1], curTheme.swatch[2]].map((c, i) => <span key={i} style={{ width: 16, height: 40, background: c }} />)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--text-strong)" }}>{curTheme.name}</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--sage-600)", fontWeight: 600, marginTop: 2 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--available)" }} /> Now live for guests
                </div>
              </div>
            </div>
            <Button variant="secondary" block style={{ marginTop: 14 }} onClick={() => setTab("appearance")}><Palette /> Change theme</Button>
          </Card>
          <Card variant="flat" padded style={{ textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR" width={124} height={124} style={{ borderRadius: 12, display: "block", margin: "0 auto 10px", background: "#fff", padding: 6 }} />
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{menuLabel(cafe.slug)}</div>
            <Button variant="ghost" size="sm" style={{ marginTop: 8 }} onClick={() => setTab("qr")}><Download /> Get QR code</Button>
          </Card>
        </div>
      </div>
    </PageWrap>
  );
}

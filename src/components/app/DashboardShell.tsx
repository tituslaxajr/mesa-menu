"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Utensils,
  List,
  Palette,
  QrCode,
  Tag,
  BarChart3,
  Gem,
  Settings as SettingsIcon,
  Plus,
  Ban,
  Pencil,
  X,
  Download,
  Link2,
  Printer,
  ShieldCheck,
  Check,
  Clock,
  Sparkles,
  Banknote,
  Image as ImageIcon,
  TrendingUp,
  ExternalLink,
  UploadCloud,
  Wand2,
  Coffee,
  CupSoda,
  Croissant,
  LayoutTemplate,
  Paintbrush,
  CircleAlert,
  Trash2,
  Lock,
  ClipboardList,
  Inbox,
  ChefHat,
  BellRing,
  Bell,
  BellOff,
  Hash,
  Menu as MenuIcon,
  ChevronUp,
  ChevronDown,
  Search,
  Copy,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { Logo, Avatar, Button, IconButton, Input, Select, Switch, Badge, Card } from "@/components/ds";
import { useLocalStore } from "@/lib/useLocalStore";
import { studioKey } from "@/lib/studio-store";
import { useStudioState, useAutosave, type SaveStatus } from "@/lib/studio-sync";
import { saveMenu, saveBrand, saveCafeProfile, savePromos } from "@/lib/studio-actions";
import { uploadCafeImage } from "@/lib/storage";
import { menuUrl, menuLabel } from "@/lib/site";
import { useOrders, timeAgo, type Order, type OrdersApi, type OrderStatus } from "@/lib/orders-store";
import { palette, hue, extractBrandColor, accentContrast, surfaceContrast, type ContrastLevel } from "@/lib/color";
import { brandVars } from "@/lib/brand";
import { LivePreview } from "./LivePreview";
import {
  THEMES,
  ACCENT_PRESETS,
  SURFACE_PRESETS,
  PAIRINGS,
  HEADING_FONTS,
  BODY_FONTS,
  FONT_VARS,
  CAT_ICONS,
  PLANS,
  DEFAULT_BRAND,
  capsFor,
  type BrandCaps,
  type PlanId,
  pairingForHue,
  DIET_TAGS,
  normalizeTags,
  type MenuTag,
  type Cafe,
  type MenuItem,
  type ThemeKey,
  type BrandKit,
  type Promo,
  type OptionGroup,
  type OrderMode,
  PHASE2_ORDERING,
} from "@/lib/data";

const dpeso = (n: number | string) => `₱${n}`;

// Neutral placeholder for items without a photo yet — avoids an empty `src=""`
// (which warns + breaks the <img>) and reads as "add a photo" in the editor.
const PLACEHOLDER_IMG = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="6"><rect width="8" height="6" fill="#ece2d4"/></svg>');

/**
 * Current time, refreshed every `ms` (for live "x min ago" / today-totals).
 * Starts at 0 so SSR/prerender is stable (lazy Date.now() init would bake the
 * build time into the HTML); the effect sets the real time right after mount.
 * The `|| Date.now()` fallback keeps numbers correct on the first frame after a
 * (re)mount — e.g. switching tabs — before the effect runs.
 */
function useNow(ms: number): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed real time on mount (intentional SSR-safe pattern, see above)
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  // eslint-disable-next-line react-hooks/purity -- pre-mount fallback only; output is time-independent until data loads
  return now || Date.now();
}

/** Café logo (or default coffee mark). Module-scope so it isn't remounted each render. */
function Brandmark({ logo, size = 32 }: { logo?: string | null; size?: number }) {
  return logo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={logo} alt="" style={{ width: size, height: size, borderRadius: 9, objectFit: "cover", flex: "none" }} />
    : <span style={{ width: size, height: size, borderRadius: 9, background: "var(--brand)", display: "grid", placeItems: "center", flex: "none" }}><Coffee size={size * 0.53} style={{ color: "var(--brand-on)" }} /></span>;
}

// ── New-order alerts (chime + desktop notification) ─────────────────
let audioCtx: AudioContext | null = null;
function playChime() {
  if (typeof window === "undefined") return;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx = audioCtx || new Ctor();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const ctx = audioCtx;
    const start = ctx.currentTime;
    // Two-note rising "ding-dong" — friendly, not alarming.
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = start + i * 0.16;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  } catch {
    /* audio not available — silent */
  }
}

function notifyNewOrder(order: Order) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const body = `${order.table ? `Table ${order.table} · ` : ""}${dpeso(order.total)} · ${order.lines.reduce((s, l) => s + l.qty, 0)} items`;
    new Notification(`New order #${order.code}`, { body, tag: `mesa-order-${order.id}` });
  } catch {
    /* notifications not available — silent */
  }
}

type TabId =
  | "home" | "orders" | "menu" | "categories" | "appearance" | "qr" | "promos" | "analytics" | "subscription" | "settings";

const NAV: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "menu", label: "Menu", icon: Utensils },
  { id: "categories", label: "Categories", icon: List },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "qr", label: "QR code", icon: QrCode },
  { id: "promos", label: "Promos", icon: Tag },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "subscription", label: "Subscription", icon: Gem },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const CAT_ICON_COMP: Record<string, LucideIcon> = {
  coffee: Coffee,
  "cup-soda": CupSoda,
  croissant: Croissant,
  utensils: Utensils,
};

interface Props {
  cafe: Cafe;
  menu: MenuItem[];
  categories: string[];
  planId: string;
  /** Owner's café uuid — required for DB persistence. */
  cafeId?: string;
  /** Saved brand kit / promos from the DB (db mode); fall back to defaults. */
  initialBrand?: BrandKit;
  initialPromos?: Promo[];
  /** "db" persists edits to Supabase (real owner); "local" is the /demo sandbox. */
  persistence?: "db" | "local";
  /** Demo showcase: restrict the nav to the items worth demoing. */
  demo?: boolean;
}

type DraftItem = MenuItem & { _new?: boolean };
/** Upload an image and resolve to a stored src (Storage URL in db mode). */
type UploadImage = (file: File, kind: "logo" | "cover" | "item") => Promise<string>;

/* ── small primitives ─────────────────────────────────────────────── */
function StatCard({ icon: Icon, value, label, delta }: { icon: LucideIcon; value: React.ReactNode; label: string; delta?: string }) {
  return (
    <Card variant="flat" padded style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--text-strong)", lineHeight: 1 }}>{value}</div>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--brand-soft)", color: "var(--brand-active)", display: "grid", placeItems: "center", flex: "none" }}>
          <Icon size={18} />
        </span>
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
        {delta && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sage-600)" }}>{delta}</span>}
      </div>
    </Card>
  );
}

function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 500, color: "var(--text-strong)" }}>{children}</h2>
      {right}
    </div>
  );
}

function PageWrap({ children, max = 1180 }: { children: React.ReactNode; max?: number }) {
  return <div className="mesa-dash-page" style={{ padding: "24px 28px 60px", maxWidth: max }}>{children}</div>;
}

function UploadZone({ onFile, upload, height = 120, children }: { onFile: (src: string) => void; upload?: (file: File) => Promise<string>; height?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const take = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (upload) {
      setBusy(true);
      upload(file).then(onFile).catch(() => {}).finally(() => setBusy(false));
    } else {
      const fr = new FileReader();
      fr.onload = () => onFile(fr.result as string);
      fr.readAsDataURL(file);
    }
  };
  return (
    <div
      onClick={() => { if (!busy) ref.current?.click(); }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
      style={{ cursor: busy ? "default" : "pointer", minHeight: height, border: `2px dashed ${over ? "var(--brand)" : "var(--border-default)"}`, background: over ? "var(--brand-soft)" : "var(--surface-sunken)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center", padding: 18, transition: "all .15s", opacity: busy ? 0.7 : 1 }}
    >
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => take(e.target.files?.[0])} />
      {busy ? <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>Uploading…</span> : children}
    </div>
  );
}

/* ════ HOME ════════════════════════════════════════════════════════ */
const STATUS_BADGE: Record<OrderStatus, { label: string; fg: string; bg: string }> = {
  new: { label: "New", fg: "var(--brand-active)", bg: "var(--brand-soft)" },
  preparing: { label: "Preparing", fg: "var(--honey-700)", bg: "var(--honey-50)" },
  ready: { label: "Ready", fg: "var(--sage-600)", bg: "var(--sage-50)" },
  completed: { label: "Done", fg: "var(--text-muted)", bg: "var(--surface-muted)" },
  cancelled: { label: "Cancelled", fg: "var(--text-muted)", bg: "var(--surface-muted)" },
};
// Counter orders are stored as "completed" — surface them as their own channel
// so owners can tell a POS hand-off from a kitchen order they worked.
const COUNTER_BADGE = { label: "Counter", fg: "var(--honey-700)", bg: "var(--honey-50)" };
const orderBadge = (o: Order) => (o.channel === "counter" ? COUNTER_BADGE : STATUS_BADGE[o.status]);
const orderStatusText = (o: Order) => (o.channel === "counter" ? "counter" : o.status);

function HomeTab({ items, cafe, theme, brand, orders, setTab }: { items: MenuItem[]; cafe: Cafe; theme: ThemeKey; brand: BrandKit; orders: Order[]; setTab: (t: TabId) => void }) {
  const soldOut = items.filter((i) => i.soldOut).length;

  // "Today" = since local midnight. Re-ticks so time-ago labels stay fresh.
  const now = useNow(30000);
  const dayStart = (() => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const todays = orders.filter((o) => o.placedAt >= dayStart && o.status !== "cancelled");
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

/* ════ MENU manager ════════════════════════════════════════════════ */
function ManagerRow({ item, index, count, canReorder, onMove, onDuplicate, onToggle, onEdit }: { item: MenuItem; index: number; count: number; canReorder: boolean; onMove: (id: string, dir: -1 | 1) => void; onDuplicate: (id: string) => void; onToggle: (id: string) => void; onEdit: (m: MenuItem) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "var(--surface-card)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)" }}>
      {canReorder && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: "none" }}>
          <IconButton label="Move up" variant="ghost" size="md" disabled={index === 0} onClick={() => onMove(item.id, -1)}><ChevronUp size={16} /></IconButton>
          <IconButton label="Move down" variant="ghost" size="md" disabled={index === count - 1} onClick={() => onMove(item.id, 1)}><ChevronDown size={16} /></IconButton>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.img} alt="" style={{ width: 50, height: 50, borderRadius: "var(--radius-sm)", objectFit: "cover", filter: item.soldOut ? "grayscale(0.9)" : "none", flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16.5, color: "var(--text-strong)" }}>{item.name}</span>
          {item.badge && <Badge variant="highlight" size="sm">{item.badge}</Badge>}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 }}>{item.desc}</div>
      </div>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 16.5, color: "var(--text-strong)", width: 60, textAlign: "right", flex: "none" }}>{dpeso(item.price)}</span>
      <div style={{ width: 142, display: "flex", justifyContent: "flex-end", flex: "none" }}>
        <Switch checked={!item.soldOut} onChange={() => onToggle(item.id)} label={item.soldOut ? "Sold out" : "Available"} />
      </div>
      <IconButton label="Duplicate" variant="ghost" onClick={() => onDuplicate(item.id)}><Copy /></IconButton>
      <IconButton label="Edit" variant="ghost" onClick={() => onEdit(item)}><Pencil /></IconButton>
    </div>
  );
}

const uid = (p: string) => p + Math.random().toString(36).slice(2, 7);

function EditDrawer({ item, cats, customTags, onClose, onSave, uploadImage }: { item: DraftItem; cats: string[]; customTags: MenuTag[]; onClose: () => void; onSave: (d: DraftItem) => void; uploadImage: UploadImage }) {
  const [draft, setDraft] = useState<DraftItem>(item);
  const set = <K extends keyof DraftItem>(k: K, v: DraftItem[K]) => setDraft((d) => ({ ...d, [k]: v }));

  // ── Option groups (Size / Milk / Add-ons) ────────────────────────
  const groups = draft.options ?? [];
  const setGroups = (next: OptionGroup[]) => set("options", next.length ? next : undefined);
  const addGroup = () => setGroups([...groups, { id: uid("g_"), label: "", required: true, multi: false, choices: [{ id: uid("c_"), label: "", priceDelta: 0 }] }]);
  const patchGroup = (gid: string, patch: Partial<OptionGroup>) => setGroups(groups.map((g) => (g.id === gid ? { ...g, ...patch } : g)));
  const removeGroup = (gid: string) => setGroups(groups.filter((g) => g.id !== gid));
  const addChoice = (gid: string) => setGroups(groups.map((g) => (g.id === gid ? { ...g, choices: [...g.choices, { id: uid("c_"), label: "", priceDelta: 0 }] } : g)));
  const patchChoice = (gid: string, cid: string, patch: { label?: string; priceDelta?: number }) =>
    setGroups(groups.map((g) => (g.id === gid ? { ...g, choices: g.choices.map((c) => (c.id === cid ? { ...c, ...patch } : c)) } : g)));
  const removeChoice = (gid: string, cid: string) => setGroups(groups.map((g) => (g.id === gid ? { ...g, choices: g.choices.filter((c) => c.id !== cid) } : g)));

  // ── Tags (presets + the café's custom ones, e.g. Keto) ────────────
  const tags = draft.tags ?? [];
  const has = (id: string) => tags.some((t) => t.id === id);
  const setTags = (next: MenuTag[]) => set("tags", next.length ? next : undefined);
  const toggleTag = (tag: MenuTag) => setTags(has(tag.id) ? tags.filter((t) => t.id !== tag.id) : [...tags, tag]);
  // Available chips = presets + tags already used on this café's other items
  // (deduped by lowercased label so the library grows as owners create tags).
  const available: MenuTag[] = [];
  const seen = new Set<string>();
  [...DIET_TAGS, ...customTags, ...tags].forEach((t) => {
    const k = t.label.trim().toLowerCase();
    if (k && !seen.has(k)) { seen.add(k); available.push(t); }
  });
  const [newTag, setNewTag] = useState({ label: "", emoji: "" });
  const addCustomTag = () => {
    const label = newTag.label.trim();
    if (!label) return;
    const existing = available.find((t) => t.label.toLowerCase() === label.toLowerCase());
    const tag: MenuTag = existing ?? { id: uid("t_"), label, emoji: newTag.emoji.trim() || undefined };
    if (!has(tag.id)) setTags([...tags, tag]);
    setNewTag({ label: "", emoji: "" });
  };

  // Drop blank choices/groups; store priceDelta only when non-zero.
  const handleSave = () => {
    const cleaned = (draft.options ?? [])
      .map((g) => ({
        ...g,
        label: g.label.trim(),
        choices: g.choices.filter((c) => c.label.trim()).map((c) => ({ ...c, label: c.label.trim(), priceDelta: c.priceDelta || undefined })),
      }))
      .filter((g) => g.label && g.choices.length);
    onSave({ ...draft, options: cleaned.length ? cleaned : undefined });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} className="mesa-anim-fade" style={{ position: "absolute", inset: 0, background: "rgba(31,20,14,0.4)" }} />
      <div className="mesa-anim-drawer" style={{ position: "relative", width: "min(420px, 100%)", background: "var(--surface-card)", height: "100%", boxShadow: "-8px 0 40px rgba(31,20,14,0.2)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-soft)" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--text-strong)" }}>{item._new ? "Add item" : "Edit item"}</h2>
          <IconButton label="Close" variant="ghost" onClick={onClose}><X /></IconButton>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.img} alt="" style={{ width: 76, height: 76, borderRadius: "var(--radius-md)", objectFit: "cover", background: "var(--surface-sunken)" }} />
            <label>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f, "item").then((src) => set("img", src)).catch(() => {});
                }}
              />
              <span className="mesa-btn mesa-btn--secondary mesa-btn--sm"><ImageIcon /> Replace photo</span>
            </label>
          </div>
          <Input label="Item name" value={draft.name} onChange={(e) => set("name", e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Input label="Price" icon={<Banknote />} value={String(draft.price)} onChange={(e) => set("price", Number(e.target.value.replace(/\D/g, "")) || 0)} />
            <Select label="Category" options={cats.filter((c) => c !== "All")} value={draft.cat} onChange={(e) => set("cat", e.target.value)} />
          </div>
          <Input label="Description" as="textarea" value={draft.desc} onChange={(e) => set("desc", e.target.value)} hint="One appetizing line." />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16, background: "var(--surface-sunken)", borderRadius: "var(--radius-md)" }}>
            <Switch checked={!draft.soldOut} onChange={(v) => set("soldOut", !v)} label="Available today" />
            <div>
              <Switch checked={!!draft.best} tone="brand" onChange={(v) => setDraft((d) => ({ ...d, best: v, badge: v ? "Bestseller" : d.badge === "Bestseller" ? undefined : d.badge }))} label="Feature as bestseller" />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Shows in your menu&rsquo;s Best sellers row with a badge.</p>
            </div>
          </div>

          {/* Tags — dietary, allergens & custom (e.g. Keto) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-strong)" }}>Tags</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {available.map((t) => {
                const on = has(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => toggleTag(t)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "7px 12px", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-sans)", border: on ? "1.5px solid var(--brand)" : "1px solid var(--border-soft)", background: on ? "var(--brand-soft)" : "var(--surface-card)", color: on ? "var(--brand-active)" : "var(--text-body)" }}>
                    {t.emoji && <span aria-hidden>{t.emoji}</span>} {t.label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ width: 64, flex: "none" }}>
                <Input label="Icon" value={newTag.emoji} onChange={(e) => setNewTag((n) => ({ ...n, emoji: [...e.target.value].slice(0, 2).join("") }))} placeholder="🥑" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Input label="Custom tag" value={newTag.label} onChange={(e) => setNewTag((n) => ({ ...n, label: e.target.value.slice(0, 24) }))} placeholder="e.g. Keto" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }} />
              </div>
              <Button variant="secondary" onClick={addCustomTag} disabled={!newTag.label.trim()}><Plus size={15} /> Add</Button>
            </div>
          </div>

          {/* Option groups — Size, Milk, Add-ons, etc. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-strong)" }}>Options &amp; add-ons</span>
              <Button variant="ghost" size="sm" onClick={addGroup}><Plus size={15} /> Add group</Button>
            </div>
            {groups.length === 0 && (
              <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>No options yet. Add a group like “Size” or “Milk” to let guests customize this item.</p>
            )}
            {groups.map((g) => (
              <div key={g.id} style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)", padding: 12, display: "flex", flexDirection: "column", gap: 10, background: "var(--surface-sunken)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ flex: 1, minWidth: 0 }}><Input label="Group name" value={g.label} onChange={(e) => patchGroup(g.id, { label: e.target.value })} placeholder="e.g. Size" /></div>
                  <IconButton label="Remove group" variant="ghost" onClick={() => removeGroup(g.id)}><Trash2 /></IconButton>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <Switch checked={!!g.multi} tone="brand" onChange={(v) => patchGroup(g.id, { multi: v, required: v ? false : g.required })} label="Pick multiple" />
                  {!g.multi && <Switch checked={g.required !== false} tone="brand" onChange={(v) => patchGroup(g.id, { required: v })} label="Required" />}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {g.choices.map((c) => (
                    <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ flex: 1, minWidth: 0 }}><Input value={c.label} onChange={(e) => patchChoice(g.id, c.id, { label: e.target.value })} placeholder="Choice name" /></div>
                      <div style={{ width: 92, flex: "none" }}><Input value={c.priceDelta ? String(c.priceDelta) : ""} onChange={(e) => patchChoice(g.id, c.id, { priceDelta: Number(e.target.value.replace(/\D/g, "")) || 0 })} placeholder="+₱0" inputMode="numeric" /></div>
                      <IconButton label="Remove choice" variant="ghost" onClick={() => removeChoice(g.id, c.id)}><X /></IconButton>
                    </div>
                  ))}
                  <div><Button variant="secondary" size="sm" onClick={() => addChoice(g.id)}><Plus size={14} /> Add choice</Button></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, padding: 20, borderTop: "1px solid var(--border-soft)" }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" block onClick={handleSave}>Save changes</Button>
        </div>
      </div>
    </div>
  );
}

function MenuTab({ items, categories, onMove, onDuplicate, onToggle, onCategorySoldOut, onAdd, onEdit }: { items: MenuItem[]; categories: string[]; onMove: (id: string, dir: -1 | 1) => void; onDuplicate: (id: string) => void; onToggle: (id: string) => void; onCategorySoldOut: (cat: string, soldOut: boolean) => void; onAdd: () => void; onEdit: (m: MenuItem) => void }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const cats = categories.filter((c) => c !== "All");
  const match = (m: MenuItem) => !query || m.name.toLowerCase().includes(query) || m.desc.toLowerCase().includes(query) || (m.tags ?? []).some((t) => t.label.toLowerCase().includes(query));
  const totalMatches = items.filter(match).length;

  // First-run: a brand-new café has no items yet.
  if (items.length === 0) {
    return (
      <PageWrap max={940}>
        <Card variant="flat" padded>
          <div style={{ textAlign: "center", padding: "34px 12px" }}>
            <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--brand-soft)", color: "var(--brand-active)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Utensils size={26} /></span>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "var(--text-strong)" }}>Your menu is empty</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "6px auto 18px", maxWidth: 340 }}>Add your first item — name, price, a photo, and any options or tags. It goes live on your QR menu instantly.</p>
            <Button variant="primary" onClick={onAdd}><Plus /> Add your first item</Button>
          </div>
        </Card>
      </PageWrap>
    );
  }

  return (
    <PageWrap max={940}>
      <div style={{ marginBottom: 18, maxWidth: 420 }}>
        <Input icon={<Search />} placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search menu items" />
      </div>
      {cats.map((c) => {
        const rows = items.filter((m) => m.cat === c && match(m));
        if (!rows.length) return null;
        return (
          <section key={c} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 500, color: "var(--text-strong)" }}>{c}</h2>
              <Badge variant="neutral">{rows.length}</Badge>
              {!query && (() => {
                const allOut = rows.every((r) => r.soldOut);
                return (
                  <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }} onClick={() => onCategorySoldOut(c, !allOut)}>
                    {allOut ? <><Check size={14} /> Mark all available</> : <><Ban size={14} /> Mark all sold out</>}
                  </Button>
                );
              })()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rows.map((m, i) => <ManagerRow key={m.id} item={m} index={i} count={rows.length} canReorder={!query} onMove={onMove} onDuplicate={onDuplicate} onToggle={onToggle} onEdit={onEdit} />)}
            </div>
          </section>
        );
      })}
      {query && totalMatches === 0 && (
        <div style={{ textAlign: "center", padding: "30px 12px", color: "var(--text-muted)" }}>
          <Search size={26} style={{ color: "var(--text-subtle)", marginBottom: 8 }} />
          <div style={{ fontSize: 14 }}>No items match &ldquo;{q}&rdquo;.</div>
        </div>
      )}
    </PageWrap>
  );
}

/* ════ CATEGORIES ══════════════════════════════════════════════════ */
function CategoriesTab({ items, categories, setCategories, onDelete, toast }: { items: MenuItem[]; categories: string[]; setCategories: (f: (c: string[]) => string[]) => void; onDelete: (c: string) => void; toast: (m: string) => void }) {
  const [name, setName] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const cats = categories.filter((c) => c !== "All");
  const add = () => {
    const n = name.trim();
    if (!n || categories.includes(n)) return;
    setCategories((c) => [...c, n]);
    setName("");
    toast(`Added “${n}”`);
  };
  // Reorder a category (sets the section order on the live menu). "All" stays first.
  const moveCat = (cat: string, dir: -1 | 1) => setCategories((arr) => {
    const i = arr.indexOf(cat);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length || arr[j] === "All") return arr;
    const next = arr.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  return (
    <PageWrap max={720}>
      <Card variant="flat" padded style={{ marginBottom: 18 }}>
        <SectionTitle>Add a category</SectionTitle>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Input label="" placeholder="e.g. Cold Brew" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          </div>
          <Button variant="primary" onClick={add}><Plus /> Add</Button>
        </div>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cats.map((c, i) => {
          const n = items.filter((m) => m.cat === c).length;
          const Icon = CAT_ICON_COMP[CAT_ICONS[c]] || Utensils;
          return (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--surface-card)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: "none" }}>
                <IconButton label="Move up" variant="ghost" size="md" disabled={i === 0} onClick={() => moveCat(c, -1)}><ChevronUp size={16} /></IconButton>
                <IconButton label="Move down" variant="ghost" size="md" disabled={i === cats.length - 1} onClick={() => moveCat(c, 1)}><ChevronDown size={16} /></IconButton>
              </div>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--brand-soft)", color: "var(--brand-active)", display: "grid", placeItems: "center" }}><Icon size={18} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16.5, color: "var(--text-strong)" }}>{c}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{n} {n === 1 ? "item" : "items"}</div>
              </div>
              {confirmDel === c ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
                  <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{n ? `Move ${n} to “${cats.find((x) => x !== c)}” & delete?` : "Delete?"}</span>
                  <Button variant="danger" size="sm" onClick={() => { onDelete(c); setConfirmDel(null); toast(n ? `Deleted “${c}” · items moved` : `Deleted “${c}”`); }}>Delete</Button>
                  <IconButton label="Cancel" variant="ghost" onClick={() => setConfirmDel(null)}><X /></IconButton>
                </div>
              ) : (
                <IconButton label="Delete" variant="ghost" onClick={() => {
                  if (n === 0) { onDelete(c); toast(`Deleted “${c}”`); }
                  else if (cats.length <= 1) { toast("Add another category to move these items into first."); }
                  else { setConfirmDel(c); }
                }}><Trash2 /></IconButton>
              )}
            </div>
          );
        })}
      </div>
    </PageWrap>
  );
}

/* ════ THEME picker ════════════════════════════════════════════════ */
function ThemePreviewMini({ swatch, dark, minimal, accent }: { swatch: [string, string, string]; dark: boolean; minimal: boolean; accent: string }) {
  const [bg, , ink] = swatch;
  return (
    <div style={{ background: bg, borderRadius: 12, padding: 10, height: 118, display: "flex", flexDirection: "column", gap: 7, border: "1px solid rgba(0,0,0,0.06)" }}>
      <div style={{ height: 30, borderRadius: 7, background: dark ? "rgba(255,255,255,0.1)" : accent, display: "flex", alignItems: "center", padding: "0 8px" }}>
        <span style={{ width: 36, height: 6, borderRadius: 3, background: dark ? accent : minimal ? ink : bg, opacity: 0.95 }} />
      </div>
      {[0, 1].map((i) => (
        <div key={i} style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <span style={{ width: 26, height: 26, borderRadius: 6, background: dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.07)", flex: "none" }} />
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ width: "70%", height: 6, borderRadius: 3, background: ink, opacity: dark ? 0.85 : 0.7 }} />
            <span style={{ width: "40%", height: 5, borderRadius: 3, background: accent, opacity: 0.85 }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function ThemeSubTab({ theme, setTheme, accent, caps }: { theme: ThemeKey; setTheme: (t: ThemeKey) => void; accent: string; caps: BrandCaps }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 16, background: "var(--brand-soft)", borderRadius: "var(--radius-md)", marginBottom: 22 }}>
        <Sparkles size={20} style={{ color: "var(--brand-active)", flex: "none", marginTop: 1 }} />
        <div style={{ fontSize: 13.5, color: "var(--brand-active)", lineHeight: 1.5 }}>
          Pick how your menu looks to guests. The change is <strong>live instantly</strong> — the preview updates the moment you choose.
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(212px, 1fr))", gap: 16 }}>
        {THEMES.map((t) => {
          const on = theme === t.key;
          const locked = !caps.themes.includes(t.key as ThemeKey);
          return (
            <button key={t.key} disabled={locked} onClick={() => { if (!locked) setTheme(t.key as ThemeKey); }} style={{ textAlign: "left", cursor: locked ? "not-allowed" : "pointer", padding: 14, borderRadius: "var(--radius-lg)", background: "var(--surface-card)", border: on ? "2px solid var(--brand)" : "1px solid var(--border-soft)", boxShadow: on ? "var(--shadow-md)" : "var(--shadow-xs)", fontFamily: "var(--font-sans)", opacity: locked ? 0.62 : 1 }}>
              <ThemePreviewMini swatch={t.swatch} dark={t.dark} minimal={t.key === "minimal"} accent={accent} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--text-strong)" }}>{t.name}</div>
                {locked
                  ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)" }}><Lock size={12} /> Brew</span>
                  : on ? <Badge variant="available" dot>Now live</Badge> : <span style={{ width: 20, height: 20, borderRadius: 999, border: "2px solid var(--border-default)" }} />}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>{t.blurb}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ════ BRAND KIT ════════════════════════════════════════════════════ */
function FontSample({ headingId, bodyId }: { headingId: string; bodyId: string }) {
  return (
    <div style={{ textAlign: "left" }}>
      <div style={{ fontFamily: FONT_VARS[headingId], fontSize: 24, fontWeight: 500, color: "var(--text-strong)", lineHeight: 1 }}>Kape Kalye</div>
      <div style={{ fontFamily: FONT_VARS[bodyId], fontSize: 12.5, color: "var(--text-muted)", marginTop: 5 }}>Salted Caramel Latte · ₱150</div>
    </div>
  );
}

/** Non-blocking readability badge (WCAG-based), shared by accent + background. */
const READOUT = {
  good: { color: "var(--sage-600)", bg: "var(--sage-50)", icon: <Check size={13} />, label: "Easy to read" },
  large: { color: "var(--honey-600)", bg: "var(--honey-50)", icon: <CircleAlert size={13} />, label: "A bit faint" },
  low: { color: "var(--berry-600)", bg: "var(--berry-50)", icon: <CircleAlert size={13} />, label: "Hard to read" },
} as const;

function ReadoutBadge({ level, hint = "" }: { level: ContrastLevel; hint?: string }) {
  const v = READOUT[level];
  return (
    <span
      title={`Contrast: ${v.label}${hint}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, background: v.bg, color: v.color, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" }}
    >
      {v.icon} {v.label}
    </span>
  );
}

function ContrastBadge({ accent }: { accent: string }) {
  const { level, role } = accentContrast(accent);
  const hint = level === "good" ? "" : role === "button" ? " · button text may be hard to read" : " · prices may be hard to read on a light menu";
  return <ReadoutBadge level={level} hint={hint} />;
}

function SurfaceBadge({ surface }: { surface: string }) {
  const { level } = surfaceContrast(surface);
  return <ReadoutBadge level={level} hint={level === "good" ? "" : " · this background may be hard to read"} />;
}

/** Dims + locks a control the current plan can't use, with an upgrade hint. */
function Gated({ locked, tier, children }: { locked: boolean; tier: string; children: React.ReactNode }) {
  if (!locked) return <>{children}</>;
  return (
    <div style={{ position: "relative" }}>
      <div aria-hidden style={{ opacity: 0.45, pointerEvents: "none", filter: "saturate(0.55)" }}>{children}</div>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", zIndex: 1 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--surface-inverse)", color: "var(--text-inverse)", fontSize: 12.5, fontWeight: 600, padding: "7px 13px", borderRadius: 999, boxShadow: "var(--shadow-md)" }}>
          <Lock size={13} /> Upgrade to {tier}
        </span>
      </div>
    </div>
  );
}

function BrandKitSubTab({ brand, setBrand, theme, caps, uploadImage }: { brand: BrandKit; setBrand: (f: (b: BrandKit) => BrandKit) => void; theme: ThemeKey; caps: BrandCaps; uploadImage: UploadImage }) {
  const set = (patch: Partial<BrandKit>) => setBrand((b) => ({ ...b, ...patch }));
  const [extracted, setExtracted] = useState<{ src: string; color: string | null; pairingId?: string } | null>(null);

  const onBrandImage = (src: string) => {
    const im = new window.Image();
    im.onload = () => {
      const color = extractBrandColor(im);
      if (!color) { setExtracted({ src, color: null }); return; }
      setExtracted({ src, color, pairingId: pairingForHue(hue(color)) });
    };
    im.src = src;
  };
  const applyExtract = () => {
    if (!extracted?.color) return;
    const p = PAIRINGS.find((x) => x.id === extracted.pairingId) || PAIRINGS[0];
    set({ accent: extracted.color, paletteId: "custom", colorMode: "auto", headingFont: p.heading, bodyFont: p.body, pairingId: p.id });
  };
  // Without the custom-colour entitlement, only the curated presets are offered.
  const colorMode = caps.customColor ? (brand.colorMode || "preset") : "preset";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* LOGO */}
      <Card variant="flat" padded>
        <SectionTitle>Your logo</SectionTitle>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 80, height: 80, borderRadius: "var(--radius-lg)", background: "var(--surface-sunken)", display: "grid", placeItems: "center", flex: "none", overflow: "hidden", border: "1px solid var(--border-soft)" }}>
            {brand.logo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={brand.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <ImageIcon size={26} style={{ color: "var(--text-subtle)" }} />}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <UploadZone height={80} onFile={(src) => set({ logo: src })} upload={(f) => uploadImage(f, "logo")}>
              <UploadCloud size={22} style={{ color: "var(--brand)" }} />
              <div style={{ fontSize: 13, color: "var(--text-body)", fontWeight: 600 }}>Drop your logo or click to upload</div>
            </UploadZone>
          </div>
          {brand.logo && <Button variant="ghost" onClick={() => set({ logo: null })}><Trash2 /> Remove</Button>}
        </div>
      </Card>

      {/* COLOUR */}
      <Card variant="flat" padded>
        <SectionTitle
          right={
            <div style={{ display: "inline-flex", gap: 2, background: "var(--surface-muted)", borderRadius: 999, padding: 3 }}>
              {([["preset", "Pick a palette"], ["auto", "Match my image"]] as const).map(([k, label]) => {
                const on = colorMode === k;
                const locked = k === "auto" && !caps.customColor;
                return (
                  <button key={k} disabled={locked} onClick={() => { if (!locked) set({ colorMode: k }); }} title={locked ? "Custom colour is a Brew feature" : undefined} style={{ border: 0, cursor: locked ? "not-allowed" : "pointer", borderRadius: 999, padding: "6px 13px", fontSize: 12.5, fontWeight: 600, fontFamily: "var(--font-sans)", background: on ? "var(--surface-card)" : "transparent", color: locked ? "var(--text-subtle)" : on ? "var(--text-strong)" : "var(--text-muted)", boxShadow: on ? "var(--shadow-xs)" : "none", display: "inline-flex", alignItems: "center", gap: 5, opacity: locked ? 0.7 : 1 }}>
                    {locked && <Lock size={11} />}{label}
                  </button>
                );
              })}
            </div>
          }
        >
          Brand colour
        </SectionTitle>

        {colorMode === "preset" ? (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
              {ACCENT_PRESETS.map((p) => {
                const on = brand.paletteId === p.id;
                const der = palette(p.base);
                return (
                  <button key={p.id} onClick={() => set({ accent: p.base, paletteId: p.id, colorMode: "preset" })} style={{ cursor: "pointer", textAlign: "left", padding: 12, borderRadius: "var(--radius-md)", background: "var(--surface-card)", border: on ? "2px solid var(--brand)" : "1px solid var(--border-soft)", fontFamily: "var(--font-sans)" }}>
                    <div style={{ display: "flex", gap: 5, marginBottom: 9 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: der.brand }} />
                      <span style={{ width: 14, height: 28, borderRadius: 6, background: der.brandHover }} />
                      <span style={{ width: 14, height: 28, borderRadius: 6, background: der.brandSoft, border: "1px solid var(--border-soft)" }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>{p.name}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-soft)" }}>
              <Gated locked={!caps.customColor} tier="Brew">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <label style={{ position: "relative", width: 44, height: 44, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-default)", flex: "none", cursor: "pointer" }}>
                    <input type="color" value={brand.paletteId === "custom" ? brand.accent : "#C8592E"} onChange={(e) => set({ accent: e.target.value, paletteId: "custom", colorMode: "preset" })} style={{ position: "absolute", inset: -4, width: "140%", height: "140%", border: 0, padding: 0, cursor: "pointer" }} />
                  </label>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>Custom colour</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{brand.paletteId === "custom" ? brand.accent.toUpperCase() : "Pick any hex to match your brand"}</div>
                  </div>
                  <span style={{ marginLeft: "auto" }}><ContrastBadge accent={brand.accent} /></span>
                </div>
              </Gated>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
              Upload a brand photo, packaging shot, or logo — Mesa pulls the dominant colour and suggests a matching font pairing.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: extracted ? "180px 1fr" : "1fr", gap: 18, alignItems: "start" }}>
              <UploadZone height={140} onFile={onBrandImage}>
                {extracted
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={extracted.src} alt="" style={{ maxWidth: "100%", maxHeight: 116, borderRadius: 8, objectFit: "cover" }} />
                  : <><ImageIcon size={26} style={{ color: "var(--brand)" }} /><div style={{ fontSize: 13.5, color: "var(--text-body)", fontWeight: 600 }}>Upload brand visuals</div></>}
              </UploadZone>
              {extracted && (extracted.color ? (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 10 }}>We pulled this from your image</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                    <span style={{ display: "flex", borderRadius: 10, overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
                      {(() => { const d = palette(extracted.color!); return [d.brand, d.brandHover, d.brandActive, d.brandSoft].map((c, i) => <span key={i} style={{ width: 30, height: 44, background: c }} />); })()}
                    </span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--text-strong)" }}>{extracted.color.toUpperCase()}</span>
                        <ContrastBadge accent={extracted.color} />
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Suggested font: <strong style={{ color: "var(--text-strong)" }}>{PAIRINGS.find((x) => x.id === extracted.pairingId)?.name}</strong></div>
                    </div>
                  </div>
                  <Button variant="primary" onClick={applyExtract}><Wand2 /> Apply colour &amp; font</Button>
                </div>
              ) : (
                <div style={{ fontSize: 13.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                  <CircleAlert size={16} /> Couldn&apos;t read a strong colour — try a more colourful image.
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* BACKGROUND */}
      <Card variant="flat" padded>
        <SectionTitle right={caps.background && brand.surface ? <SurfaceBadge surface={brand.surface} /> : undefined}>Menu background</SectionTitle>
        <div style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: -8, marginBottom: 14 }}>
          Tint the whole menu page — text and cards adjust automatically to stay readable.
        </div>
        {caps.background && theme === "bold" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-muted)", background: "var(--surface-muted)", borderRadius: "var(--radius-md)", padding: "10px 12px", marginBottom: 14 }}>
            <CircleAlert size={15} style={{ flex: "none" }} /> The Bold theme keeps its own dark background — switch themes to use a custom one.
          </div>
        )}
        <Gated locked={!caps.background} tier="Roast">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))", gap: 12 }}>
            {SURFACE_PRESETS.map((p) => {
              const on = (brand.surfaceId || "none") === p.id;
              return (
                <button key={p.id} onClick={() => set({ surface: p.base, surfaceId: p.id })} style={{ cursor: "pointer", textAlign: "left", padding: 10, borderRadius: "var(--radius-md)", background: "var(--surface-card)", border: on ? "2px solid var(--brand)" : "1px solid var(--border-soft)", fontFamily: "var(--font-sans)" }}>
                  <div style={{ height: 40, borderRadius: 8, marginBottom: 8, border: "1px solid var(--border-soft)", background: p.base ?? "repeating-linear-gradient(45deg, var(--surface-sunken), var(--surface-sunken) 6px, var(--surface-muted) 6px, var(--surface-muted) 12px)" }} />
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-strong)" }}>{p.name}</div>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-soft)" }}>
            <label style={{ position: "relative", width: 44, height: 44, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-default)", flex: "none", cursor: "pointer" }}>
              <input type="color" value={brand.surfaceId === "custom" && brand.surface ? brand.surface : "#EEF2E8"} onChange={(e) => set({ surface: e.target.value, surfaceId: "custom" })} style={{ position: "absolute", inset: -4, width: "140%", height: "140%", border: 0, padding: 0, cursor: "pointer" }} />
            </label>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>Custom background</div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{brand.surfaceId === "custom" && brand.surface ? brand.surface.toUpperCase() : "Pick any hex for the page"}</div>
            </div>
          </div>
        </Gated>
      </Card>

      {/* SHAPE */}
      <Card variant="flat" padded>
        <SectionTitle>Corners</SectionTitle>
        <div style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: -8, marginBottom: 14 }}>
          Corner style for cards and photos. Buttons stay rounded in every style.
        </div>
        <Gated locked={!caps.shape} tier="Roast">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {([["sharp", "Sharp", 3], ["rounded", "Rounded", 14], ["soft", "Soft", 24]] as const).map(([id, label, r]) => {
              const on = (brand.shape || "rounded") === id;
              return (
                <button key={id} onClick={() => set({ shape: id })} style={{ cursor: "pointer", padding: 14, borderRadius: "var(--radius-md)", background: "var(--surface-card)", border: on ? "2px solid var(--brand)" : "1px solid var(--border-soft)", fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <span style={{ width: "100%", height: 34, borderRadius: r, background: "var(--brand-soft)", border: "1px solid var(--brand)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>{label}</span>
                </button>
              );
            })}
          </div>
        </Gated>
      </Card>

      {/* TYPOGRAPHY */}
      <Card variant="flat" padded>
        <SectionTitle>Typography</SectionTitle>
        <div style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: -8, marginBottom: 14 }}>Pick a pairing, or set the heading and body fonts yourself.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
          {PAIRINGS.map((p) => {
            const on = brand.pairingId === p.id;
            return (
              <button key={p.id} onClick={() => set({ headingFont: p.heading, bodyFont: p.body, pairingId: p.id })} style={{ cursor: "pointer", textAlign: "left", padding: 16, borderRadius: "var(--radius-lg)", background: "var(--surface-card)", border: on ? "2px solid var(--brand)" : "1px solid var(--border-soft)", fontFamily: "var(--font-sans)" }}>
                <FontSample headingId={p.heading} bodyId={p.body} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-soft)" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>{p.name}</span>
                  {on ? <Badge variant="available" dot>In use</Badge> : <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{p.blurb}</span>}
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ paddingTop: 18, borderTop: "1px solid var(--border-soft)" }}>
          <Gated locked={!caps.customFonts} tier="Brew">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Select label="Heading font" value={brand.headingFont} onChange={(e) => set({ headingFont: e.target.value, pairingId: "custom" })} options={HEADING_FONTS.map((f) => ({ value: f.id, label: `${f.name} · ${f.kind}` }))} />
              <Select label="Body font" value={brand.bodyFont} onChange={(e) => set({ bodyFont: e.target.value, pairingId: "custom" })} options={BODY_FONTS.map((f) => ({ value: f.id, label: f.name }))} />
            </div>
          </Gated>
        </div>
      </Card>
    </div>
  );
}

function AppearanceTab(props: {
  theme: ThemeKey; setTheme: (t: ThemeKey) => void; brand: BrandKit; setBrand: (f: (b: BrandKit) => BrandKit) => void;
  cafe: Cafe; items: MenuItem[]; categories: string[]; caps: BrandCaps; plan: PlanId; uploadImage: UploadImage;
}) {
  const [sub, setSub] = useState<"theme" | "brand">("theme");
  const subs: [("theme" | "brand"), string, LucideIcon][] = [["theme", "Menu theme", LayoutTemplate], ["brand", "Brand kit", Paintbrush]];
  return (
    <div style={{ padding: "20px 28px 60px" }}>
      <div style={{ display: "inline-flex", gap: 4, background: "var(--surface-muted)", borderRadius: 999, padding: 4, marginBottom: 18 }}>
        {subs.map(([k, label, Icon]) => {
          const on = sub === k;
          return (
            <button key={k} onClick={() => setSub(k)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 44, border: 0, cursor: "pointer", borderRadius: 999, padding: "0 18px", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-sans)", background: on ? "var(--surface-card)" : "transparent", color: on ? "var(--text-strong)" : "var(--text-muted)", boxShadow: on ? "var(--shadow-xs)" : "none" }}>
              <Icon size={16} /> {label}
            </button>
          );
        })}
      </div>
      <div style={{ maxWidth: 720, minWidth: 0 }}>
        {sub === "theme"
          ? <ThemeSubTab theme={props.theme} setTheme={props.setTheme} accent={props.brand.accent} caps={props.caps} />
          : <BrandKitSubTab brand={props.brand} setBrand={props.setBrand} theme={props.theme} caps={props.caps} uploadImage={props.uploadImage} />}
      </div>
    </div>
  );
}

/* ════ QR ══════════════════════════════════════════════════════════ */
function QRTab({ cafe, brand, caps, toast }: { cafe: Cafe; brand: BrandKit; caps: BrandCaps; toast: (m: string) => void }) {
  const url = menuUrl(cafe.slug);
  const qrImg = (data: string, size = 320) => `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&color=2A1D16&bgcolor=FFFFFF&margin=10`;
  // QR modules stay dark for reliable scanning; branding goes on the poster around it.
  const qr = qrImg(url, 320);
  const branded = caps.brandedQR;
  const accent = palette(brand.accent).brand;
  const headFont = branded ? FONT_VARS[brand.headingFont] : "var(--font-display)";

  // Per-table codes: each encodes ?t=N so the guest's table auto-fills on the order.
  const [tableCount, setTableCount] = useLocalStore<number>(`mesa.qr.${cafe.slug}.tables`, 8);
  const tableUrl = (n: number) => `${url}?t=${n}`;
  const tables = Array.from({ length: Math.max(0, tableCount) }, (_, k) => k + 1);
  const printTableSheet = () => {
    const esc = (v: string) => v.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    const cells = tables.map((n) => `<div class="cell"><img src="${qrImg(tableUrl(n), 360)}" width="200" height="200"><div class="t">Table ${n}</div><div class="u">${esc(cafe.name)}</div></div>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(cafe.name)} — Table QR codes</title>
<style>
  body{font:14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:#241a12;margin:24px}
  h1{font-size:18px;margin:0 0 16px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .cell{border:1px solid #e7ddd2;border-radius:12px;padding:14px;text-align:center;break-inside:avoid}
  .cell img{display:block;margin:0 auto}
  .t{font-size:18px;font-weight:600;margin-top:8px}.u{font-size:12px;color:#8a7563}
  @media print{body{margin:10mm}}
</style></head><body>
  <h1>${esc(cafe.name)} — Table QR codes</h1>
  <div class="grid">${cells}</div>
  <script>window.onload=function(){setTimeout(function(){window.print()},200)}<\/script>
</body></html>`;
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) { toast("Allow pop-ups to print the sheet"); return; }
    w.document.write(html); w.document.close(); w.focus();
  };
  return (
    <div className="mesa-dash-page" style={{ padding: "32px 28px 60px", display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
      <Card variant="raised" style={{ width: 320, padding: 26, textAlign: "center" }}>
        <div style={{ minHeight: 44, marginBottom: 16, display: "grid", placeItems: "center" }}>
          {branded && brand.logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={brand.logo} alt="" style={{ height: 44, maxWidth: 200, objectFit: "contain" }} />
            : branded
              ? <div style={{ fontFamily: headFont, fontSize: 23, fontWeight: 500, color: accent }}>{cafe.name}</div>
              : <Logo size="sm" />}
        </div>
        <div style={{ background: "#fff", border: branded ? `2px solid ${accent}` : "1px solid var(--border-soft)", borderRadius: "var(--radius-lg)", padding: 14, display: "inline-block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Menu QR code" width={232} height={232} style={{ display: "block" }} />
        </div>
        <div style={{ marginTop: 14, fontFamily: headFont, fontSize: 19, color: "var(--text-strong)" }}>Scan for our menu</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{url}</div>
        {!caps.whiteLabel && (
          <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-subtle)" }}>
            powered by <Logo size="sm" />
          </div>
        )}
      </Card>
      <div style={{ flex: 1, minWidth: 280, maxWidth: 440 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 23, fontWeight: 500, color: "var(--text-strong)" }}>Your table QR code</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.55, marginTop: 8 }}>
          Print it for your tables or counter. It always points to your live menu — change a price and guests see it instantly, no reprinting.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
          <Button as="a" href={qr} download variant="primary"><Download /> Download PNG</Button>
          <Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(url); toast("Link copied"); }}><Link2 /> Copy link</Button>
          <Button as="a" href={`/m/${cafe.slug}`} variant="ghost"><Printer /> Open menu</Button>
        </div>
        <div style={{ marginTop: 22, padding: 16, background: "var(--available-soft)", borderRadius: "var(--radius-md)", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <ShieldCheck size={20} style={{ color: "var(--sage-600)", flex: "none", marginTop: 1 }} />
          <div style={{ fontSize: 13.5, color: "var(--sage-700)", lineHeight: 1.5 }}>
            Every Mesa menu shows your café&apos;s name and a &ldquo;powered by Mesa&rdquo; mark, so guests trust the code before they scan.
          </div>
        </div>
      </div>

      {/* Per-table QR codes */}
      <div style={{ flexBasis: "100%", marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 23, fontWeight: 500, color: "var(--text-strong)" }}>Per-table QR codes</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14.5, lineHeight: 1.55, marginTop: 6, maxWidth: 520 }}>
              Give each table its own code. When a guest scans it, their table number fills in automatically — so every order (counter or kitchen) already knows where it&apos;s going.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flex: "none" }}>
            <div style={{ width: 96 }}>
              <Input label="Tables" value={String(tableCount)} inputMode="numeric" onChange={(e) => setTableCount(Math.min(50, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)))} />
            </div>
            <Button variant="secondary" onClick={printTableSheet} disabled={!tables.length}><Printer /> Print sheet</Button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>
          {tables.map((n) => (
            <div key={n} style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)", padding: 14, textAlign: "center", background: "var(--surface-card)" }}>
              <div style={{ background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 10, padding: 8, display: "inline-block" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImg(tableUrl(n), 180)} alt={`Table ${n} QR`} width={120} height={120} style={{ display: "block" }} />
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--text-strong)", marginTop: 8 }}>Table {n}</div>
              <Button as="a" href={qrImg(tableUrl(n), 600)} download={`mesa-${cafe.slug}-table-${n}.png`} target="_blank" variant="ghost" size="md" style={{ marginTop: 6 }}><Download size={14} /> PNG</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════ PROMOS ══════════════════════════════════════════════════════ */
const PROMO_TONE_BG: Record<string, string> = { highlight: "var(--highlight-soft)", brand: "var(--brand-soft)", neutral: "var(--surface-muted)" };
const PROMO_TONE_FG: Record<string, string> = { highlight: "var(--honey-700)", brand: "var(--brand-active)", neutral: "var(--text-muted)" };

function PromoEditor({ value, onSave, onCancel }: { value: Promo; onSave: (p: Promo) => void; onCancel: () => void }) {
  const [d, setD] = useState<Promo>(value);
  const set = <K extends keyof Promo>(k: K, v: Promo[K]) => setD((p) => ({ ...p, [k]: v }));
  return (
    <Card variant="flat" padded style={{ marginBottom: 14, border: "1.5px solid var(--brand)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Input label="Title" value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Merienda hour" />
        <Input label="Description" value={d.desc} onChange={(e) => set("desc", e.target.value)} placeholder="₱20 off any pastry with a hot drink." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="When" value={d.period} onChange={(e) => set("period", e.target.value)} placeholder="Daily · 2:00–5:00 PM" />
          <Select label="Colour" value={d.tone} onChange={(e) => set("tone", e.target.value as Promo["tone"])} options={[{ value: "highlight", label: "Highlight" }, { value: "brand", label: "Brand" }, { value: "neutral", label: "Neutral" }]} />
        </div>
        <Switch checked={d.active} tone="brand" onChange={(v) => set("active", v)} label="Show on the live menu" />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" block disabled={!d.title.trim()} onClick={() => onSave({ ...d, title: d.title.trim(), desc: d.desc.trim(), period: d.period.trim() })}>Save promo</Button>
      </div>
    </Card>
  );
}

function PromosTab({ promos, setPromos, toast }: { promos: Promo[]; setPromos: (f: (p: Promo[]) => Promo[]) => void; toast: (m: string) => void }) {
  const [editing, setEditing] = useState<Promo | null>(null);
  const toggle = (id: string) => setPromos((arr) => arr.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  const blank = (): Promo => ({ id: "promo-" + Date.now(), title: "", desc: "", period: "", tone: "highlight", active: true });
  const save = (p: Promo) => {
    setPromos((arr) => (arr.some((x) => x.id === p.id) ? arr.map((x) => (x.id === p.id ? p : x)) : [...arr, p]));
    setEditing(null);
    toast("Promo saved");
  };
  const remove = (id: string) => { setPromos((arr) => arr.filter((x) => x.id !== id)); toast("Promo deleted"); };
  return (
    <PageWrap max={820}>
      <SectionTitle right={!editing ? <Button variant="primary" onClick={() => setEditing(blank())}><Plus /> New promo</Button> : undefined}>Promo banners</SectionTitle>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: -6, marginBottom: 14 }}>Active promos show as a banner at the top of your live menu.</p>

      {editing && <PromoEditor value={editing} onSave={save} onCancel={() => setEditing(null)} />}

      {promos.length === 0 && !editing ? (
        <div style={{ textAlign: "center", padding: "30px 12px", color: "var(--text-muted)" }}>
          <Tag size={26} style={{ color: "var(--text-subtle)", marginBottom: 8 }} />
          <div style={{ fontSize: 14 }}>No promos yet. Add one to highlight a special on your menu.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {promos.map((p) => (
            <Card key={p.id} variant="flat" padded>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <span style={{ width: 42, height: 42, borderRadius: 11, flex: "none", display: "grid", placeItems: "center", background: PROMO_TONE_BG[p.tone], color: PROMO_TONE_FG[p.tone] }}><Tag size={20} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--text-strong)" }}>{p.title}</span>
                    {p.active ? <Badge variant="available" dot>Active</Badge> : <Badge variant="neutral">Paused</Badge>}
                  </div>
                  {p.desc && <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 3 }}>{p.desc}</div>}
                  {p.period && <div style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}><Clock size={13} /> {p.period}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "none" }}>
                  <Switch checked={p.active} onChange={() => toggle(p.id)} tone="brand" />
                  <IconButton label="Edit promo" variant="ghost" onClick={() => setEditing(p)}><Pencil /></IconButton>
                  <IconButton label="Delete promo" variant="ghost" onClick={() => remove(p.id)}><Trash2 /></IconButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageWrap>
  );
}

/* ════ ANALYTICS ═══════════════════════════════════════════════════ */
function LineChart({ series, days }: { series: number[]; days: string[] }) {
  const w = 560, h = 200, pad = 28;
  const max = Math.max(...series, 1) * 1.12;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (series.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const pts = series.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${pad},${h - pad} ${pts} ${w - pad},${h - pad}`;
  const peak = series.indexOf(Math.max(...series));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="mesaArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((g, i) => (
        <line key={i} x1={pad} x2={w - pad} y1={pad + g * (h - pad * 2)} y2={pad + g * (h - pad * 2)} stroke="var(--border-soft)" strokeWidth="1" />
      ))}
      <polygon points={area} fill="url(#mesaArea)" />
      <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {series.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === peak ? 5 : 3.5} fill={i === peak ? "var(--brand)" : "var(--surface-card)"} stroke="var(--brand)" strokeWidth="2" />
      ))}
      {days.map((d, i) => (
        <text key={i} x={x(i)} y={h - 8} textAnchor="middle" fontSize="10.5" fill="var(--text-subtle)" fontFamily="var(--font-sans)">{d}</text>
      ))}
    </svg>
  );
}

const DAY_MS = 86400000;
function dayStartOf(ts: number) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }

function computeSales(orders: Order[], now: number) {
  const paid = orders.filter((o) => o.status !== "cancelled");
  const today0 = dayStartOf(now);
  const weekStart = today0 - 6 * DAY_MS;

  const today = paid.filter((o) => o.placedAt >= today0);
  const week = paid.filter((o) => o.placedAt >= weekStart);
  const sum = (arr: Order[]) => arr.reduce((s, o) => s + o.total, 0);
  const revenueWeek = sum(week);

  // Revenue per day for the last 7 days (oldest → today).
  const dayBuckets = Array.from({ length: 7 }, (_, i) => today0 - (6 - i) * DAY_MS);
  const series = dayBuckets.map((d0) => sum(paid.filter((o) => o.placedAt >= d0 && o.placedAt < d0 + DAY_MS)));
  const days = dayBuckets.map((d0) => new Date(d0).toLocaleDateString("en-PH", { weekday: "short" }));

  // Top sellers by quantity (this week).
  const byItem = new Map<string, { name: string; qty: number; revenue: number }>();
  week.forEach((o) => o.lines.forEach((l) => {
    const e = byItem.get(l.name) || { name: l.name, qty: 0, revenue: 0 };
    e.qty += l.qty;
    e.revenue += l.price * l.qty;
    byItem.set(l.name, e);
  }));
  const topItems = [...byItem.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  return {
    ordersToday: today.length,
    revenueToday: sum(today),
    ordersWeek: week.length,
    revenueWeek,
    avgOrder: week.length ? Math.round(revenueWeek / week.length) : 0,
    series,
    days,
    topItems,
    hasData: paid.length > 0,
  };
}

// ── End-of-day report (CSV + printable) ─────────────────────────────
function ordersInScope(orders: Order[], scope: string, now: number): Order[] {
  const start = dayStartOf(now) - (scope === "7d" ? 6 * DAY_MS : 0);
  return orders.filter((o) => o.placedAt >= start).slice().sort((a, b) => a.placedAt - b.placedAt);
}
function lineText(o: Order): string {
  return o.lines.map((l) => `${l.qty}× ${l.name}${l.options && l.options.length ? ` (${l.options.join(", ")})` : ""}`).join("; ");
}
const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
const fmtDate = (ts: number) => new Date(ts).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

function summarize(list: Order[]) {
  const paid = list.filter((o) => o.status !== "cancelled");
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const byItem = new Map<string, { name: string; qty: number; revenue: number }>();
  paid.forEach((o) => o.lines.forEach((l) => {
    const e = byItem.get(l.name) || { name: l.name, qty: 0, revenue: 0 };
    e.qty += l.qty; e.revenue += l.price * l.qty; byItem.set(l.name, e);
  }));
  const top = [...byItem.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
  return { count: paid.length, revenue, avg: paid.length ? Math.round(revenue / paid.length) : 0, top };
}

function downloadCSV(filename: string, list: Order[]) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [["Time", "Order", "Table", "Items", "Note", "Status", "Total (PHP)"]];
  list.forEach((o) => rows.push([fmtTime(o.placedAt), `#${o.code}`, o.table || "", lineText(o), o.note || "", orderStatusText(o), String(o.total)]));
  const s = summarize(list);
  rows.push([]);
  rows.push(["", "", "", "", "", `Orders: ${s.count}`, `Total: ${s.revenue}`]);
  const csv = rows.map((r) => r.map((c) => esc(c)).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printReport(cafeName: string, scopeLabel: string, dateLabel: string, list: Order[]) {
  const s = summarize(list);
  const esc = (v: string) => v.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
  const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;
  const rows = list.map((o) => `<tr><td>${fmtTime(o.placedAt)}</td><td>#${o.code}</td><td>${o.table ? esc(o.table) : "—"}</td><td>${esc(lineText(o))}${o.note ? `<br><em>“${esc(o.note)}”</em>` : ""}</td><td class="s ${o.status}">${orderStatusText(o)}</td><td class="r">${peso(o.total)}</td></tr>`).join("");
  const tops = s.top.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t.name)}</td><td class="r">${t.qty}</td><td class="r">${peso(t.revenue)}</td></tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(cafeName)} — Sales report</title>
<style>
  *{box-sizing:border-box}body{font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#241a12;margin:32px;}
  h1{font-size:22px;margin:0}h2{font-size:15px;margin:24px 0 8px;color:#6b4f3a}
  .sub{color:#8a7563;margin-top:2px}
  .cards{display:flex;gap:16px;margin:18px 0}
  .card{flex:1;border:1px solid #e7ddd2;border-radius:10px;padding:12px 14px}
  .card .v{font-size:24px;font-weight:600}.card .l{color:#8a7563;font-size:12px}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #eee;vertical-align:top;font-size:12.5px}
  th{color:#8a7563;font-weight:600;border-bottom:1px solid #d9ccbd}
  .r{text-align:right;white-space:nowrap}.s{text-transform:capitalize}
  .s.cancelled{color:#b03b3b}.s.completed{color:#3f7a4f}
  .foot{margin-top:26px;color:#a08a76;font-size:11px;text-align:center}
  @media print{body{margin:14px}.card{break-inside:avoid}}
</style></head><body>
  <h1>${esc(cafeName)}</h1>
  <div class="sub">Sales report · ${esc(scopeLabel)} · ${esc(dateLabel)}</div>
  <div class="cards">
    <div class="card"><div class="v">${s.count}</div><div class="l">Orders</div></div>
    <div class="card"><div class="v">${peso(s.revenue)}</div><div class="l">Gross revenue</div></div>
    <div class="card"><div class="v">${peso(s.avg)}</div><div class="l">Avg order</div></div>
  </div>
  <h2>Best sellers</h2>
  <table><thead><tr><th>#</th><th>Item</th><th class="r">Qty</th><th class="r">Revenue</th></tr></thead><tbody>${tops || '<tr><td colspan="4">No sales.</td></tr>'}</tbody></table>
  <h2>Orders</h2>
  <table><thead><tr><th>Time</th><th>Order</th><th>Table</th><th>Items</th><th>Status</th><th class="r">Total</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No orders.</td></tr>'}</tbody></table>
  <div class="foot">Generated by Mesa</div>
</body></html>`;
  const w = window.open("", "_blank", "width=820,height=920");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* user can print manually */ } }, 350);
  return true;
}

function AnalyticsTab({ orders, cafeName }: { orders: Order[]; cafeName: string }) {
  const now = useNow(60000);
  const s = computeSales(orders, now);
  const money = (n: number) => `₱${n.toLocaleString("en-PH")}`;
  const [scope, setScope] = useState("today");

  if (!s.hasData) {
    return (
      <PageWrap max={560}>
        <Card variant="flat" padded>
          <div style={{ textAlign: "center", padding: "30px 12px" }}>
            <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--brand-soft)", color: "var(--brand-active)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><BarChart3 size={26} /></span>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "var(--text-strong)" }}>No sales yet</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "6px auto 0", maxWidth: 340 }}>
              Once guests start ordering, your daily revenue, busiest days, and best-selling items will show up here.
            </p>
          </div>
        </Card>
      </PageWrap>
    );
  }

  const peakDay = s.series.indexOf(Math.max(...s.series));
  const nowTs = now;
  const scopeList = ordersInScope(orders, scope, nowTs);
  const dateLabel = scope === "7d" ? `${fmtDate(dayStartOf(nowTs) - 6 * DAY_MS)} – ${fmtDate(nowTs)}` : fmtDate(nowTs);
  const fileStamp = new Date(nowTs).toISOString().slice(0, 10);
  return (
    <PageWrap>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 18 }}>
        <StatCard icon={Banknote} value={money(s.revenueToday)} label="Revenue today" />
        <StatCard icon={ClipboardList} value={s.ordersToday} label="Orders today" />
        <StatCard icon={TrendingUp} value={money(s.revenueWeek)} label="Revenue · 7 days" />
        <StatCard icon={Banknote} value={money(s.avgOrder)} label="Avg order value" />
      </div>
      <div className="mesa-dash-2col" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
        <Card variant="flat" padded>
          <SectionTitle>Revenue · last 7 days</SectionTitle>
          <LineChart series={s.series} days={s.days} />
          <div style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: 6, textAlign: "center" }}>
            Busiest: {s.days[peakDay]} · {money(s.series[peakDay])}
          </div>
        </Card>
        <Card variant="flat" padded>
          <SectionTitle>Best sellers · 7 days</SectionTitle>
          {s.topItems.length === 0 ? (
            <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>No items sold in the last 7 days.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {s.topItems.map((it, i) => (
                <div key={it.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--border-soft)" : 0 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--text-subtle)", width: 18 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: "var(--text-strong)", fontWeight: 600 }}>{it.name}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{it.qty} sold · {money(it.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card variant="flat" padded style={{ marginTop: 18 }}>
        <SectionTitle
          right={<Select value={scope} onChange={(e) => setScope(e.target.value)} options={[{ value: "today", label: "Today" }, { value: "7d", label: "Last 7 days" }]} />}
        >End-of-day report</SectionTitle>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 14 }}>
          Download a spreadsheet or print a clean summary of {scope === "7d" ? "the last 7 days" : "today"}&rsquo;s orders — totals, best sellers, and every ticket.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="primary" disabled={!scopeList.length} onClick={() => downloadCSV(`mesa-sales-${scope}-${fileStamp}.csv`, scopeList)}>
            <Download /> Download CSV
          </Button>
          <Button variant="secondary" disabled={!scopeList.length} onClick={() => printReport(cafeName, scope === "7d" ? "Last 7 days" : "Today", dateLabel, scopeList)}>
            <Printer /> Print report
          </Button>
        </div>
        {!scopeList.length && <p style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: 12 }}>No orders in this range yet.</p>}
      </Card>
    </PageWrap>
  );
}

/* ════ SUBSCRIPTION ════════════════════════════════════════════════ */
function SubscriptionTab({ currentId }: { currentId: string }) {
  return (
    <PageWrap max={1000}>
      <SectionTitle>Your plan</SectionTitle>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 16px", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--surface-muted)", color: "var(--text-body)", fontSize: 13.5, fontFamily: "var(--font-sans)" }}>
        <Sparkles size={15} style={{ flex: "none", color: "var(--brand)" }} />
        <span>Your tier was chosen at sign-up. During the beta, message us to change it.</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {PLANS.map((p) => {
          const current = p.id === currentId;
          return (
            <div key={p.id} style={{ position: "relative", padding: 22, borderRadius: "var(--radius-lg)", background: "var(--surface-card)", border: current ? "2px solid var(--brand)" : "1px solid var(--border-soft)", boxShadow: current ? "var(--shadow-md)" : "var(--shadow-xs)" }}>
              {current && <div style={{ position: "absolute", top: 16, right: 16 }}><Badge variant="brand">Current</Badge></div>}
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--text-strong)" }}>{p.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2, minHeight: 36 }}>{p.tagline}</div>
              <div style={{ margin: "14px 0 16px", display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--text-strong)" }}>₱{p.monthly}</span>
                <span style={{ fontSize: 13, color: "var(--text-subtle)" }}>/mo</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 18 }}>
                {p.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13.5, color: "var(--text-body)" }}>
                    <Check size={16} style={{ color: "var(--sage-600)", flex: "none", marginTop: 1 }} /> {f}
                  </div>
                ))}
              </div>
              {current
                ? <Button variant="secondary" block disabled>Your plan</Button>
                : <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-subtle)", padding: "10px 0", fontFamily: "var(--font-sans)" }}>Not your current tier</div>}
            </div>
          );
        })}
      </div>
    </PageWrap>
  );
}

/* ════ SETTINGS ════════════════════════════════════════════════════ */
const MODE_OPTIONS: { id: OrderMode; label: string; desc: string; comingSoon?: boolean }[] = [
  { id: "browse", label: "Browse only", desc: "Guests view the menu — no ordering. A clean digital replacement for a printed menu." },
  { id: "counter", label: "Order at counter", desc: "Guests build an order and get a summary to show your staff, who key it into your POS — no second system. Recommended for the beta." },
  { id: "kitchen", label: "Order to kitchen", desc: "Orders flow live to a Mesa order board with status the guest can watch — arriving in a later phase.", comingSoon: true },
];

function SettingsTab({ cafe, setCafe, toast }: { cafe: Cafe; setCafe: (f: (c: Cafe) => Cafe) => void; toast: (m: string) => void }) {
  const set = <K extends keyof Cafe>(k: K, v: Cafe[K]) => setCafe((c) => ({ ...c, [k]: v }));
  const [display, setDisplay] = useState({ prices: true, photos: true });
  const accepting = cafe.acceptingOrders !== false;
  let currentMode: OrderMode = cafe.orderMode ?? "counter";
  if (currentMode === "kitchen" && !PHASE2_ORDERING) currentMode = "counter";
  return (
    <PageWrap max={620}>
      <Card variant="flat" padded>
        <SectionTitle>Café profile</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Café name" value={cafe.name} onChange={(e) => set("name", e.target.value)} />
          <Input label="Tagline" value={cafe.tagline} onChange={(e) => set("tagline", e.target.value)} />
          <Input label="Welcome message" as="textarea" value={cafe.intro} onChange={(e) => set("intro", e.target.value)} hint="Shown under your café name on the menu." />
        </div>
      </Card>
      <Card variant="flat" padded style={{ marginTop: 18 }}>
        <SectionTitle>Guest ordering</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MODE_OPTIONS.map((opt) => {
            const selected = currentMode === opt.id;
            const locked = !!opt.comingSoon && !PHASE2_ORDERING;
            return (
              <button
                key={opt.id}
                disabled={locked}
                onClick={() => { set("orderMode", opt.id); toast(`Switched to “${opt.label}”`); }}
                style={{ display: "flex", gap: 12, textAlign: "left", width: "100%", padding: "13px 14px", borderRadius: "var(--radius-md)", cursor: locked ? "not-allowed" : "pointer", background: selected ? "var(--brand-soft)" : "var(--surface-card)", border: selected ? "2px solid var(--brand)" : "1px solid var(--border-soft)", opacity: locked ? 0.55 : 1, fontFamily: "var(--font-sans)" }}
              >
                <span style={{ marginTop: 2, width: 18, height: 18, borderRadius: 999, flex: "none", border: selected ? "5px solid var(--brand)" : "2px solid var(--bean-300)" }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 14.5 }}>{opt.label}</span>
                    {locked && <Badge variant="neutral">Phase 2 · soon</Badge>}
                  </span>
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>{opt.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        {currentMode !== "browse" && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
            <Switch checked={accepting} tone="brand" onChange={(v) => { set("acceptingOrders", v); toast(v ? "Ordering resumed" : "Ordering paused"); }} label="Currently accepting orders" />
            {!accepting && <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 8 }}>Paused — guests can browse but not order right now.</p>}
          </div>
        )}
      </Card>
      <Card variant="flat" padded style={{ marginTop: 18 }}>
        <SectionTitle>Menu display</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Switch checked={display.prices} tone="brand" onChange={(v) => setDisplay((d) => ({ ...d, prices: v }))} label="Show prices to guests" />
          <Switch checked={display.photos} tone="brand" onChange={(v) => setDisplay((d) => ({ ...d, photos: v }))} label="Show photos" />
        </div>
      </Card>
      <div style={{ marginTop: 20 }}><Button variant="primary" onClick={() => toast("Settings saved")}><Check /> Save changes</Button></div>
    </PageWrap>
  );
}

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
                <span style={{ display: "block", fontSize: 12, color: "var(--text-subtle)", marginLeft: 20, lineHeight: 1.35 }}>{l.options.join(" · ")}</span>
              )}
            </span>
            <span style={{ color: "var(--text-muted)", flex: "none" }}>{dpeso(l.price * l.qty)}</span>
          </div>
        ))}
      </div>
      {order.note && (
        <div style={{ fontSize: 12.5, color: "var(--honey-700)", background: "var(--honey-50)", borderRadius: "var(--radius-sm)", padding: "6px 9px", marginBottom: 10 }}>
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

function OrdersTab({ orders, api, items, slug }: { orders: Order[]; api: OrdersApi; items: MenuItem[]; slug: string }) {
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

/* ════ SHELL ═══════════════════════════════════════════════════════ */
/**
 * Live phone-frame preview of the guest menu, fed by the current editing state
 * so it updates as the owner edits. Persistent right column on wide screens
 * (≥1280px, CSS-gated); an on-demand drawer on narrower screens.
 */
function PreviewPane({
  open, onClose, cafe, items, categories, theme, brand,
}: {
  open: boolean;
  onClose: () => void;
  cafe: Cafe;
  items: MenuItem[];
  categories: string[];
  theme: ThemeKey;
  brand: BrandKit;
}) {
  const caption = "This is what guests see. It updates as you edit.";
  return (
    <>
      {/* Wide screens: persistent right column */}
      <aside
        className="mesa-dash-preview"
        style={{ width: 380, flex: "none", flexDirection: "column", alignItems: "center", gap: 14, borderLeft: "1px solid var(--border-soft)", background: "var(--surface-card)", position: "sticky", top: 0, height: "100dvh", overflowY: "auto", padding: "22px 20px" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-muted)" }}>Live preview</span>
          <Button as="a" href={`/m/${cafe.slug}`} target="_blank" variant="ghost"><ExternalLink /> Open</Button>
        </div>
        <LivePreview cafe={cafe} menu={items} categories={categories} theme={theme} brand={brand} plan={cafe.plan} width={300} height={600} />
        <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", maxWidth: 280 }}>{caption}</span>
      </aside>

      {/* Narrow screens: drawer overlay opened from the "Preview" toggle */}
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 55, display: "flex", justifyContent: "flex-end" }}>
          <div className="mesa-anim-fade" onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(31,20,14,0.45)" }} />
          <aside className="mesa-anim-drawer-right" style={{ position: "relative", width: "min(380px, 92%)", background: "var(--surface-card)", height: "100%", overflowY: "auto", padding: "18px 18px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, boxShadow: "-8px 0 40px rgba(31,20,14,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch" }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-muted)" }}>Live preview</span>
              <IconButton label="Close preview" variant="ghost" onClick={onClose}><X /></IconButton>
            </div>
            <LivePreview cafe={cafe} menu={items} categories={categories} theme={theme} brand={brand} plan={cafe.plan} width={300} height={600} />
            <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", maxWidth: 280 }}>{caption}</span>
          </aside>
        </div>
      )}
    </>
  );
}

export function DashboardShell({
  cafe: cafe0,
  menu,
  categories: categories0,
  planId,
  cafeId,
  initialBrand,
  initialPromos,
  persistence = "local",
  demo = false,
}: Props) {
  const slug = cafe0.slug;
  // DB persistence requires the café uuid; otherwise fall back to the sandbox.
  const persist: "db" | "local" = persistence === "db" && cafeId ? "db" : "local";
  const [tab, setTab] = useState<TabId>("home");
  const [navOpen, setNavOpen] = useState(false); // mobile nav drawer
  const [previewOpen, setPreviewOpen] = useState(false); // narrow-screen live-preview drawer
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [rawItems, setItems] = useStudioState<MenuItem[]>(persist, studioKey(slug, "items"), menu);
  // Normalize on read so legacy string[] tags from older saved menus always
  // render correctly, regardless of when state hydrates. Writes go through
  // setItems; a later save persists the new shape.
  const items = useMemo(() => rawItems.map(normalizeTags), [rawItems]);
  const [cafe, setCafe] = useStudioState<Cafe>(persist, studioKey(slug, "cafe"), cafe0);
  const [brand, setBrand] = useStudioState<BrandKit>(persist, studioKey(slug, "brand"), initialBrand ?? DEFAULT_BRAND);
  const [theme, setTheme] = useStudioState<ThemeKey>(persist, studioKey(slug, "theme"), cafe0.theme);
  const [promos, setPromos] = useStudioState<Promo[]>(persist, studioKey(slug, "promos"), initialPromos ?? []);
  const [categories, setCategories] = useStudioState<string[]>(persist, studioKey(slug, "categories"), categories0);

  // DB mode: debounced auto-save of each concern to Supabase via Server Actions.
  const dbSave = persist === "db" && !!cafeId;
  useAutosave(dbSave, [categories, rawItems], () => saveMenu(cafeId!, categories, rawItems), setSaveStatus);
  useAutosave(dbSave, brand, () => saveBrand(cafeId!, brand), setSaveStatus);
  useAutosave(dbSave, [cafe, theme], () => saveCafeProfile(cafeId!, cafe, theme), setSaveStatus);
  useAutosave(dbSave, promos, () => savePromos(cafeId!, promos), setSaveStatus);

  // Upload images to Storage in DB mode; fall back to a local data URL in the
  // /demo sandbox (anon can't write to Storage anyway).
  const uploadImage = async (file: File, kind: "logo" | "cover" | "item"): Promise<string> => {
    if (dbSave && cafeId) return uploadCafeImage(file, cafeId, kind);
    return new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.readAsDataURL(file);
    });
  };

  const [orders, ordersApi] = useOrders(slug);
  // The live board only handles kitchen-channel orders; counter orders are
  // logged for analytics but never worked here.
  const kitchenOrders = orders.filter((o) => o.channel !== "counter");
  const newOrders = kitchenOrders.filter((o) => o.status === "new").length;
  const [soundOn, setSoundOn] = useLocalStore<boolean>(`mesa.orders.${slug}.sound`, true);
  const caps = capsFor(cafe.plan);
  const [editing, setEditing] = useState<DraftItem | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  const toast = (m: string) => setToastMsg(m);
  React.useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(""), 2000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Demo showcase shows only the tabs worth demoing; the live app shows all
  // (minus Orders until live tracking ships).
  const DEMO_TABS: TabId[] = ["home", "menu", "categories", "appearance", "promos", "qr"];
  const allowedTabs: TabId[] = demo
    ? DEMO_TABS
    : NAV.map((n) => n.id).filter((id) => PHASE2_ORDERING || id !== "orders");

  // Alert (chime + desktop notification) when a NEW order arrives. Establish a
  // baseline of order ids on first load so we don't alert for existing ones.
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
  const seenOrderIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const prev = seenOrderIds.current;
    seenOrderIds.current = new Set(orders.map((o) => o.id));
    // Alert only for orders that are genuinely new AND just placed — the
    // recency guard means a page reload never re-chimes existing orders
    // (useOrders hydrates from localStorage after the first render).
    const fresh = orders.filter(
      (o) => o.status === "new" && !prev.has(o.id) && Date.now() - o.placedAt < 20000
    );
    if (fresh.length && soundOnRef.current) {
      playChime();
      fresh.forEach(notifyNewOrder);
      toast(fresh.length === 1 ? `New order #${fresh[0].code}` : `${fresh.length} new orders`);
    }
  }, [orders]);

  // Lock background scroll while the mobile nav drawer is open.
  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [navOpen]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (next) {
      playChime(); // confirm it's audible + unlock AudioContext via this click
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission();
      }
      toast("Order alerts on");
    } else {
      toast("Order alerts off");
    }
  };

  const toggle = (id: string) => setItems((arr) => arr.map((m) => (m.id === id ? { ...m, soldOut: !m.soldOut } : m)));
  // Delete a category, reassigning its items to the first remaining category so
  // they never get orphaned (an item whose category isn't listed renders nowhere).
  const deleteCategory = (c: string) => {
    const target = categories.find((x) => x !== "All" && x !== c);
    if (target) setItems((arr) => arr.map((m) => (m.cat === c ? { ...m, cat: target } : m)));
    setCategories((arr) => arr.filter((x) => x !== c));
  };
  // Reorder an item within its category by swapping with its nearest
  // same-category neighbour in the given direction (live menu renders array order).
  const moveItem = (id: string, dir: -1 | 1) => setItems((arr) => {
    const i = arr.findIndex((m) => m.id === id);
    if (i < 0) return arr;
    let j = i + dir;
    while (j >= 0 && j < arr.length && arr[j].cat !== arr[i].cat) j += dir;
    if (j < 0 || j >= arr.length) return arr;
    const next = arr.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  // Duplicate an item (same category/price/options/tags) right after it, then
  // open the copy in the editor to tweak. New id keeps cart keys distinct.
  const duplicateItem = (id: string) => {
    const src = items.find((m) => m.id === id);
    if (!src) return;
    const copy: MenuItem = { ...src, id: "item-" + Date.now(), name: `${src.name} (copy)`, best: false };
    setItems((arr) => {
      const i = arr.findIndex((m) => m.id === id);
      const next = arr.slice();
      next.splice(i < 0 ? next.length : i + 1, 0, copy);
      return next;
    });
    setEditing(copy);
    toast("Duplicated — edit the copy");
  };
  const addItem = () => setEditing({ id: "new-" + Date.now(), _new: true, name: "", price: 0, cat: categories.find((c) => c !== "All") || "Hot Coffee", desc: "", img: items[0]?.img || PLACEHOLDER_IMG });
  // Bulk sold-out toggle for a whole category (kitchen closed / ran out).
  const setCategorySoldOut = (cat: string, soldOut: boolean) => {
    setItems((arr) => arr.map((m) => (m.cat === cat ? { ...m, soldOut } : m)));
    toast(soldOut ? `“${cat}” marked sold out` : `“${cat}” back available`);
  };
  const save = (draft: DraftItem) => {
    setItems((arr) => {
      const exists = arr.some((m) => m.id === draft.id);
      const clean: MenuItem = { ...draft, price: Number(draft.price) };
      delete (clean as DraftItem)._new;
      return exists ? arr.map((m) => (m.id === draft.id ? clean : m)) : [...arr, clean];
    });
    setEditing(null);
    toast("Saved · your live menu is updated");
  };

  const soldOut = items.filter((i) => i.soldOut).length;
  // The café's custom tags (used on any item, minus the presets) — offered as
  // quick-adds when editing other items so the tag set grows organically.
  const customTags: MenuTag[] = (() => {
    const out: MenuTag[] = [];
    const seen = new Set(DIET_TAGS.map((t) => t.label.toLowerCase()));
    items.forEach((it) => (it.tags ?? []).forEach((t) => {
      const k = t.label.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(t); }
    }));
    return out;
  })();
  const meta: Record<TabId, { t: string; s: string }> = {
    home: { t: `Good morning, ${cafe.name}.`, s: "Here's what's happening with your menu today." },
    orders: { t: "Orders", s: newOrders ? `${newOrders} new · live from your tables` : "Live orders from your tables." },
    menu: { t: "Menu", s: `${items.length} items · ${soldOut} sold out today` },
    categories: { t: "Categories", s: "Organise your menu into sections." },
    appearance: { t: "Appearance", s: "The look of your menu — theme, logo, colours and fonts." },
    qr: { t: "QR code", s: "Print it and put it on every table." },
    promos: { t: "Promos", s: "Highlight specials and limited offers." },
    analytics: { t: "Analytics", s: "How your menu is performing." },
    subscription: { t: "Subscription", s: "Your Mesa plan and billing." },
    settings: { t: "Settings", s: "Your café profile and menu display." },
  };

  // Shared nav items (sidebar + mobile drawer). onPick closes the drawer.
  const navItems = (onPick: () => void) =>
    NAV.filter((n) => allowedTabs.includes(n.id)).map((n) => {
      const on = tab === n.id;
      const badge = n.id === "orders" && newOrders > 0 ? newOrders : 0;
      return (
        <button key={n.id} onClick={() => { setTab(n.id); onPick(); }} style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 44, padding: "11px 14px", borderRadius: "var(--radius-md)", border: 0, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14.5, fontWeight: 600, textAlign: "left", background: on ? "var(--brand)" : "transparent", color: on ? "var(--brand-on)" : "var(--text-body)" }}>
          <n.icon size={18} /> {n.label}
          {badge > 0 && (
            <span style={{ marginLeft: "auto", minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, background: on ? "var(--brand-on)" : "var(--brand)", color: on ? "var(--brand)" : "var(--brand-on)" }}>{badge}</span>
          )}
        </button>
      );
    });

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: "var(--surface-page)", ...(brandVars(brand) as React.CSSProperties) }}>
      {/* Sidebar (desktop) */}
      <aside className="mesa-dash-sidebar" style={{ width: 236, flex: "none", background: "var(--surface-card)", borderRight: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", padding: "20px 14px", position: "sticky", top: 0, height: "100dvh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 20px" }}>
          <Brandmark logo={brand.logo} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cafe.name}</span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {navItems(() => {})}
        </nav>
        <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid var(--border-soft)", display: "flex", alignItems: "center", gap: 11 }}>
          {brand.logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={brand.logo} alt="" style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover" }} />
            : <Avatar name={cafe.name} size="sm" />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cafe.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{PLANS.find((p) => p.id === planId)?.name} plan</div>
          </div>
        </div>
      </aside>

      {/* Mobile nav drawer */}
      {navOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div className="mesa-anim-fade" onClick={() => setNavOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(31,20,14,0.45)" }} />
          <aside className="mesa-anim-drawer-left" style={{ position: "relative", width: "min(284px, 84%)", background: "var(--surface-card)", height: "100%", display: "flex", flexDirection: "column", padding: "16px 14px", boxShadow: "8px 0 40px rgba(31,20,14,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 4px 16px" }}>
              <Brandmark logo={brand.logo} size={30} />
              <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cafe.name}</span>
              <IconButton label="Close menu" variant="ghost" onClick={() => setNavOpen(false)}><X /></IconButton>
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
              {navItems(() => setNavOpen(false))}
            </nav>
            <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid var(--border-soft)", fontSize: 12, color: "var(--text-muted)" }}>
              {PLANS.find((p) => p.id === planId)?.name} plan
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Mobile top bar (hidden on desktop via CSS) */}
        <div className="mesa-dash-topbar" style={{ alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--border-soft)", background: "var(--surface-card)", position: "sticky", top: 0, zIndex: 8 }}>
          <Brandmark logo={brand.logo} size={28} />
          <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-display)", fontSize: 16.5, fontWeight: 600, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cafe.name}</span>
          <Button as="a" href={`/m/${cafe.slug}`} target="_blank" variant="ghost" size="md" aria-label="View live menu"><ExternalLink /></Button>
        </div>

        <div className="mesa-dash-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 28px", borderBottom: "1px solid var(--border-soft)", background: "color-mix(in oklab, var(--surface-page) 82%, transparent)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 6 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, color: "var(--text-strong)", lineHeight: 1.1 }}>{meta[tab].t}</h1>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 2 }}>{meta[tab].s}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
            {tab === "orders" && (
              <Button variant={soundOn ? "secondary" : "ghost"} onClick={toggleSound} aria-pressed={soundOn} title={soundOn ? "New-order chime is on" : "New-order chime is off"}>
                {soundOn ? <Bell /> : <BellOff />} {soundOn ? "Alerts on" : "Alerts off"}
              </Button>
            )}
            {tab === "menu" && (
              <Button variant="secondary" onClick={addItem}>
                <Plus /> Add item
              </Button>
            )}
            {dbSave && saveStatus !== "idle" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: saveStatus === "error" ? "var(--danger, #b42318)" : "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, flex: "none", background: saveStatus === "saving" ? "var(--brand)" : saveStatus === "error" ? "var(--danger, #b42318)" : "var(--sage-400, #6E8B5B)" }} />
                {saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Couldn’t save" : "Saved"}
              </span>
            )}
            <span className="mesa-dash-preview-toggle">
              <Button variant="secondary" onClick={() => setPreviewOpen(true)}><Smartphone /> Preview</Button>
            </span>
            <Button as="a" href={`/m/${cafe.slug}`} target="_blank" variant="primary"><ExternalLink /> View live menu</Button>
          </div>
        </div>

        {tab === "home" && <HomeTab items={items} cafe={cafe} theme={theme} brand={brand} orders={orders} setTab={setTab} />}
        {tab === "orders" && <OrdersTab orders={kitchenOrders} api={ordersApi} items={items} slug={slug} />}
        {tab === "menu" && <MenuTab items={items} categories={categories} onMove={moveItem} onDuplicate={duplicateItem} onToggle={toggle} onCategorySoldOut={setCategorySoldOut} onAdd={addItem} onEdit={setEditing} />}
        {tab === "categories" && <CategoriesTab items={items} categories={categories} setCategories={setCategories} onDelete={deleteCategory} toast={toast} />}
        {tab === "appearance" && <AppearanceTab theme={theme} setTheme={setTheme} brand={brand} setBrand={setBrand} cafe={cafe} items={items} categories={categories} caps={caps} plan={cafe.plan} uploadImage={uploadImage} />}
        {tab === "qr" && <QRTab cafe={cafe} brand={brand} caps={caps} toast={toast} />}
        {tab === "promos" && <PromosTab promos={promos} setPromos={setPromos} toast={toast} />}
        {tab === "analytics" && <AnalyticsTab orders={orders} cafeName={cafe.name} />}
        {tab === "subscription" && <SubscriptionTab currentId={planId} />}
        {tab === "settings" && <SettingsTab cafe={cafe} setCafe={setCafe} toast={toast} />}
      </div>

      {/* Live guest-menu preview — right column on wide screens, drawer on narrow */}
      <PreviewPane open={previewOpen} onClose={() => setPreviewOpen(false)} cafe={cafe} items={items} categories={categories} theme={theme} brand={brand} />

      {/* Mobile bottom tab bar — fast access to the daily-use screens */}
      <nav className="mesa-dash-bottombar" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 8, background: "var(--surface-card)", borderTop: "1px solid var(--border-soft)", paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "0 -2px 16px rgba(31,20,14,0.06)" }}>
        {([{ id: "home", label: "Home", icon: LayoutDashboard }, ...(PHASE2_ORDERING ? [{ id: "orders", label: "Orders", icon: ClipboardList }] : []), { id: "menu", label: "Menu", icon: Utensils }] as { id: TabId; label: string; icon: LucideIcon }[]).map((item) => {
          const on = tab === item.id;
          const showBadge = item.id === "orders" && newOrders > 0;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} style={{ flex: 1, border: 0, background: "transparent", cursor: "pointer", padding: "8px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? "var(--brand)" : "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
              <span style={{ position: "relative", display: "grid", placeItems: "center" }}>
                <item.icon size={21} />
                {showBadge && <span style={{ position: "absolute", top: -3, right: -7, minWidth: 8, height: 8, borderRadius: 999, background: "var(--brand)", border: "1.5px solid var(--surface-card)" }} />}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{item.label}</span>
            </button>
          );
        })}
        <button onClick={() => setNavOpen(true)} style={{ flex: 1, border: 0, background: "transparent", cursor: "pointer", padding: "8px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: !["home", "orders", "menu"].includes(tab) ? "var(--brand)" : "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
          <MenuIcon size={21} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>More</span>
        </button>
      </nav>

      {editing && <EditDrawer item={editing} cats={categories} customTags={customTags} onClose={() => setEditing(null)} onSave={save} uploadImage={uploadImage} />}

      {toastMsg && (
        <div className="mesa-anim-rise" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 60, background: "var(--surface-inverse)", color: "var(--text-inverse)", padding: "12px 20px", borderRadius: 999, fontSize: 14, fontWeight: 500, boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", gap: 8 }}>
          <Check size={16} style={{ color: "var(--sage-300)" }} /> {toastMsg}
        </div>
      )}
    </div>
  );
}

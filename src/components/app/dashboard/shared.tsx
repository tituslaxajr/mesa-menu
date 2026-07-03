"use client";

import React, { useRef, useState, useEffect } from "react";
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
  Coffee,
  CupSoda,
  Croissant,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ds";
import { type Order, type OrderStatus } from "@/lib/orders-store";
import { type MenuItem } from "@/lib/data";

export const dpeso = (n: number | string) => `₱${n}`;

// Neutral placeholder for items without a photo yet — avoids an empty `src=""`
// (which warns + breaks the <img>) and reads as "add a photo" in the editor.
export const PLACEHOLDER_IMG = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="6"><rect width="8" height="6" fill="#ece2d4"/></svg>');

/**
 * Current time, refreshed every `ms` (for live "x min ago" / today-totals).
 * Starts at 0 so SSR/prerender is stable (lazy Date.now() init would bake the
 * build time into the HTML); the effect sets the real time right after mount.
 * The `|| Date.now()` fallback keeps numbers correct on the first frame after a
 * (re)mount — e.g. switching tabs — before the effect runs.
 */
export function useNow(ms: number): number {
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
export function Brandmark({ logo, size = 32 }: { logo?: string | null; size?: number }) {
  return logo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={logo} alt="" style={{ width: size, height: size, borderRadius: 9, objectFit: "cover", flex: "none" }} />
    : <span style={{ width: size, height: size, borderRadius: 9, background: "var(--brand)", display: "grid", placeItems: "center", flex: "none" }}><Coffee size={size * 0.53} style={{ color: "var(--brand-on)" }} /></span>;
}

// ── New-order alerts (chime + desktop notification) ─────────────────
let audioCtx: AudioContext | null = null;
export function playChime() {
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

export function notifyNewOrder(order: Order) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const body = `${order.table ? `Table ${order.table} · ` : ""}${dpeso(order.total)} · ${order.lines.reduce((s, l) => s + l.qty, 0)} items`;
    new Notification(`New order #${order.code}`, { body, tag: `mesa-order-${order.id}` });
  } catch {
    /* notifications not available — silent */
  }
}

export type TabId =
  | "home" | "orders" | "menu" | "categories" | "appearance" | "qr" | "promos" | "analytics" | "subscription" | "settings";

export const NAV: { id: TabId; label: string; icon: LucideIcon }[] = [
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

export const CAT_ICON_COMP: Record<string, LucideIcon> = {
  coffee: Coffee,
  "cup-soda": CupSoda,
  croissant: Croissant,
  utensils: Utensils,
};

export type DraftItem = MenuItem & { _new?: boolean };
/** Upload an image and resolve to a stored src (Storage URL in db mode). */
export type UploadImage = (file: File, kind: "logo" | "cover" | "item") => Promise<string>;

/* ── small primitives ─────────────────────────────────────────────── */
export function StatCard({ icon: Icon, value, label, delta }: { icon: LucideIcon; value: React.ReactNode; label: string; delta?: string }) {
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

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 500, color: "var(--text-strong)" }}>{children}</h2>
      {right}
    </div>
  );
}

export function PageWrap({ children, max = 1180 }: { children: React.ReactNode; max?: number }) {
  return <div className="mesa-dash-page" style={{ padding: "24px 28px 60px", maxWidth: max }}>{children}</div>;
}

export function UploadZone({ onFile, upload, height = 120, children }: { onFile: (src: string) => void; upload?: (file: File) => Promise<string>; height?: number; children: React.ReactNode }) {
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

export const STATUS_BADGE: Record<OrderStatus, { label: string; fg: string; bg: string }> = {
  new: { label: "New", fg: "var(--brand-active)", bg: "var(--brand-soft)" },
  preparing: { label: "Preparing", fg: "var(--honey-700)", bg: "var(--honey-50)" },
  ready: { label: "Ready", fg: "var(--sage-600)", bg: "var(--sage-50)" },
  completed: { label: "Done", fg: "var(--text-muted)", bg: "var(--surface-muted)" },
  cancelled: { label: "Cancelled", fg: "var(--text-muted)", bg: "var(--surface-muted)" },
};
// Counter orders are stored as "completed" — surface them as their own channel
// so owners can tell a POS hand-off from a kitchen order they worked.
export const COUNTER_BADGE = { label: "Counter", fg: "var(--honey-700)", bg: "var(--honey-50)" };
export const orderBadge = (o: Order) => (o.channel === "counter" ? COUNTER_BADGE : STATUS_BADGE[o.status]);
export const orderStatusText = (o: Order) => (o.channel === "counter" ? "counter" : o.status);

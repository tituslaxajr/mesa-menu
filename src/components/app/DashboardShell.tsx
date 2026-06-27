"use client";

import React, { useRef, useState } from "react";
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
  Eye,
  Activity as ActivityIcon,
  Pencil,
  X,
  Download,
  Link2,
  Printer,
  ShieldCheck,
  Check,
  Clock,
  GripVertical,
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
  type LucideIcon,
} from "lucide-react";
import { Logo, Avatar, Button, IconButton, Input, Select, Switch, Badge, Card } from "@/components/ds";
import { useLocalStore } from "@/lib/useLocalStore";
import { studioKey } from "@/lib/studio-store";
import { palette, hue, extractBrandColor, accentContrast, surfaceContrast, type ContrastLevel } from "@/lib/color";
import { brandVars } from "@/lib/brand";
import { LivePreview } from "./LivePreview";
import {
  THEMES,
  PROMOS,
  ANALYTICS,
  ACTIVITY,
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
  type Cafe,
  type MenuItem,
  type ThemeKey,
  type BrandKit,
  type Promo,
} from "@/lib/data";

const dpeso = (n: number | string) => `₱${n}`;

type TabId =
  | "home" | "menu" | "categories" | "appearance" | "qr" | "promos" | "analytics" | "subscription" | "settings";

const NAV: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
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
}

type DraftItem = MenuItem & { _new?: boolean };

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
  return <div style={{ padding: "24px 28px 60px", maxWidth: max }}>{children}</div>;
}

function UploadZone({ onFile, height = 120, children }: { onFile: (dataUrl: string) => void; height?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (file?: File) => {
    if (file && file.type.startsWith("image/")) {
      const fr = new FileReader();
      fr.onload = () => onFile(fr.result as string);
      fr.readAsDataURL(file);
    }
  };
  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
      style={{ cursor: "pointer", minHeight: height, border: `2px dashed ${over ? "var(--brand)" : "var(--border-default)"}`, background: over ? "var(--brand-soft)" : "var(--surface-sunken)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center", padding: 18, transition: "all .15s" }}
    >
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => take(e.target.files?.[0])} />
      {children}
    </div>
  );
}

/* ════ HOME ════════════════════════════════════════════════════════ */
function HomeTab({ items, cafe, theme, brand, setTab }: { items: MenuItem[]; cafe: Cafe; theme: ThemeKey; brand: BrandKit; setTab: (t: TabId) => void }) {
  const soldOut = items.filter((i) => i.soldOut).length;
  const curTheme = THEMES.find((t) => t.key === theme) || THEMES[0];
  const qr = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent("https://mesa.menu/" + cafe.slug)}&size=240x240&color=2A1D16&bgcolor=FFFFFF&margin=8`;
  const quick: { icon: LucideIcon; label: string; sub: string; go: TabId }[] = [
    { icon: Plus, label: "Add item", sub: "New menu item", go: "menu" },
    { icon: Ban, label: "Mark sold out", sub: "Hide for today", go: "menu" },
    { icon: Palette, label: "Menu theme", sub: "Choose the look", go: "appearance" },
    { icon: QrCode, label: "Download QR", sub: "For your tables", go: "qr" },
  ];
  const toneBg: Record<string, string> = { soldout: "var(--soldout-soft)", highlight: "var(--highlight-soft)", brand: "var(--brand-soft)", neutral: "var(--surface-muted)" };
  const toneFg: Record<string, string> = { soldout: "var(--berry-600)", highlight: "var(--honey-700)", brand: "var(--brand-active)", neutral: "var(--text-muted)" };
  const actIcon: Record<string, LucideIcon> = { sparkles: Sparkles, ban: Ban, banknote: Banknote, image: ImageIcon };

  return (
    <PageWrap>
      <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <StatCard icon={Utensils} value={items.length} label="Total items" />
        <StatCard icon={Ban} value={soldOut} label="Sold out today" />
        <StatCard icon={Eye} value={ANALYTICS.viewsThisWeek} label="Menu views this week" delta={ANALYTICS.viewsDelta} />
        <StatCard icon={ActivityIcon} value={ANALYTICS.uptime} label="Menu uptime" />
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

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
        <Card variant="flat" padded>
          <SectionTitle right={<Button variant="ghost" size="sm" onClick={() => setTab("analytics")}>View all</Button>}>Recent activity</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {ACTIVITY.map((ev, i) => {
              const AIcon = actIcon[ev.icon] || Sparkles;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: i ? "1px solid var(--border-soft)" : 0 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: toneBg[ev.tone], color: toneFg[ev.tone] }}>
                    <AIcon size={16} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: "var(--text-strong)", fontWeight: 600 }}>{ev.item}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{ev.action}</div>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-subtle)", whiteSpace: "nowrap" }}>{ev.when}</span>
                </div>
              );
            })}
          </div>
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
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>mesa.menu/{cafe.slug}</div>
            <Button variant="ghost" size="sm" style={{ marginTop: 8 }} onClick={() => setTab("qr")}><Download /> Get QR code</Button>
          </Card>
        </div>
      </div>
    </PageWrap>
  );
}

/* ════ MENU manager ════════════════════════════════════════════════ */
function ManagerRow({ item, onToggle, onEdit }: { item: MenuItem; onToggle: (id: string) => void; onEdit: (m: MenuItem) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "var(--surface-card)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)" }}>
      <GripVertical size={18} style={{ color: "var(--bean-300)", cursor: "grab", flex: "none" }} />
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
      <IconButton label="Edit" variant="ghost" onClick={() => onEdit(item)}><Pencil /></IconButton>
    </div>
  );
}

function EditDrawer({ item, cats, onClose, onSave }: { item: DraftItem; cats: string[]; onClose: () => void; onSave: (d: DraftItem) => void }) {
  const [draft, setDraft] = useState<DraftItem>(item);
  const set = <K extends keyof DraftItem>(k: K, v: DraftItem[K]) => setDraft((d) => ({ ...d, [k]: v }));
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
                  if (f) { const fr = new FileReader(); fr.onload = () => set("img", fr.result as string); fr.readAsDataURL(f); }
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
            <Switch checked={draft.badge === "Bestseller"} tone="brand" onChange={(v) => set("badge", v ? "Bestseller" : undefined)} label="Mark as bestseller" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, padding: 20, borderTop: "1px solid var(--border-soft)" }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" block onClick={() => onSave(draft)}>Save changes</Button>
        </div>
      </div>
    </div>
  );
}

function MenuTab({ items, categories, onToggle, onEdit }: { items: MenuItem[]; categories: string[]; onToggle: (id: string) => void; onEdit: (m: MenuItem) => void }) {
  const cats = categories.filter((c) => c !== "All");
  return (
    <PageWrap max={940}>
      {cats.map((c) => {
        const rows = items.filter((m) => m.cat === c);
        if (!rows.length) return null;
        return (
          <section key={c} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 500, color: "var(--text-strong)" }}>{c}</h2>
              <Badge variant="neutral">{rows.length}</Badge>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rows.map((m) => <ManagerRow key={m.id} item={m} onToggle={onToggle} onEdit={onEdit} />)}
            </div>
          </section>
        );
      })}
    </PageWrap>
  );
}

/* ════ CATEGORIES ══════════════════════════════════════════════════ */
function CategoriesTab({ items, categories, setCategories, toast }: { items: MenuItem[]; categories: string[]; setCategories: (f: (c: string[]) => string[]) => void; toast: (m: string) => void }) {
  const [name, setName] = useState("");
  const cats = categories.filter((c) => c !== "All");
  const add = () => {
    const n = name.trim();
    if (!n || categories.includes(n)) return;
    setCategories((c) => [...c, n]);
    setName("");
    toast(`Added “${n}”`);
  };
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
        {cats.map((c) => {
          const n = items.filter((m) => m.cat === c).length;
          const Icon = CAT_ICON_COMP[CAT_ICONS[c]] || Utensils;
          return (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--surface-card)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)" }}>
              <GripVertical size={18} style={{ color: "var(--bean-300)", cursor: "grab" }} />
              <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--brand-soft)", color: "var(--brand-active)", display: "grid", placeItems: "center" }}><Icon size={18} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16.5, color: "var(--text-strong)" }}>{c}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{n} {n === 1 ? "item" : "items"}</div>
              </div>
              <IconButton label="Delete" variant="ghost" onClick={() => setCategories((arr) => arr.filter((x) => x !== c))}><Trash2 /></IconButton>
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

function BrandKitSubTab({ brand, setBrand, theme, caps }: { brand: BrandKit; setBrand: (f: (b: BrandKit) => BrandKit) => void; theme: ThemeKey; caps: BrandCaps }) {
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
            <UploadZone height={80} onFile={(src) => set({ logo: src })}>
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
  cafe: Cafe; items: MenuItem[]; categories: string[]; caps: BrandCaps; plan: PlanId;
}) {
  const [sub, setSub] = useState<"theme" | "brand">("theme");
  const subs: [("theme" | "brand"), string, LucideIcon][] = [["theme", "Menu theme", LayoutTemplate], ["brand", "Brand kit", Paintbrush]];
  return (
    <div style={{ padding: "20px 28px 60px" }}>
      <div style={{ display: "inline-flex", gap: 4, background: "var(--surface-muted)", borderRadius: 999, padding: 4, marginBottom: 18 }}>
        {subs.map(([k, label, Icon]) => {
          const on = sub === k;
          return (
            <button key={k} onClick={() => setSub(k)} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: 0, cursor: "pointer", borderRadius: 999, padding: "8px 16px", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-sans)", background: on ? "var(--surface-card)" : "transparent", color: on ? "var(--text-strong)" : "var(--text-muted)", boxShadow: on ? "var(--shadow-xs)" : "none" }}>
              <Icon size={16} /> {label}
            </button>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 28, alignItems: "start" }} className="mesa-appearance-grid">
        <div style={{ minWidth: 0 }}>
          {sub === "theme"
            ? <ThemeSubTab theme={props.theme} setTheme={props.setTheme} accent={props.brand.accent} caps={props.caps} />
            : <BrandKitSubTab brand={props.brand} setBrand={props.setBrand} theme={props.theme} caps={props.caps} />}
        </div>
        <div style={{ position: "sticky", top: 90, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <LivePreview cafe={props.cafe} menu={props.items} categories={props.categories} theme={props.theme} brand={props.brand} plan={props.plan} width={284} height={560} />
          <span style={{ fontSize: 12, color: "var(--text-subtle)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--available)" }} /> Live preview
          </span>
        </div>
      </div>
    </div>
  );
}

/* ════ QR ══════════════════════════════════════════════════════════ */
function QRTab({ cafe, brand, caps, toast }: { cafe: Cafe; brand: BrandKit; caps: BrandCaps; toast: (m: string) => void }) {
  const url = `https://mesa.menu/${cafe.slug}`;
  // QR modules stay dark for reliable scanning; branding goes on the poster around it.
  const qr = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=320x320&color=2A1D16&bgcolor=FFFFFF&margin=10`;
  const branded = caps.brandedQR;
  const accent = palette(brand.accent).brand;
  const headFont = branded ? FONT_VARS[brand.headingFont] : "var(--font-display)";
  return (
    <div style={{ padding: "32px 28px 60px", display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
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
    </div>
  );
}

/* ════ PROMOS ══════════════════════════════════════════════════════ */
function PromosTab({ promos, setPromos }: { promos: Promo[]; setPromos: (f: (p: Promo[]) => Promo[]) => void }) {
  const toggle = (id: string) => setPromos((arr) => arr.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  const toneBg: Record<string, string> = { highlight: "var(--highlight-soft)", brand: "var(--brand-soft)", neutral: "var(--surface-muted)" };
  const toneFg: Record<string, string> = { highlight: "var(--honey-700)", brand: "var(--brand-active)", neutral: "var(--text-muted)" };
  return (
    <PageWrap max={820}>
      <SectionTitle right={<Button variant="primary"><Plus /> New promo</Button>}>Promo banners</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {promos.map((p) => (
          <Card key={p.id} variant="flat" padded>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <span style={{ width: 42, height: 42, borderRadius: 11, flex: "none", display: "grid", placeItems: "center", background: toneBg[p.tone], color: toneFg[p.tone] }}><Tag size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--text-strong)" }}>{p.title}</span>
                  {p.active ? <Badge variant="available" dot>Active</Badge> : <Badge variant="neutral">Paused</Badge>}
                </div>
                <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 3 }}>{p.desc}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}><Clock size={13} /> {p.period}</div>
              </div>
              <Switch checked={p.active} onChange={() => toggle(p.id)} tone="brand" />
            </div>
          </Card>
        ))}
      </div>
    </PageWrap>
  );
}

/* ════ ANALYTICS ═══════════════════════════════════════════════════ */
function LineChart({ series, days }: { series: number[]; days: string[] }) {
  const w = 560, h = 200, pad = 28;
  const max = Math.max(...series) * 1.12;
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

function AnalyticsTab() {
  const a = ANALYTICS;
  return (
    <PageWrap>
      <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <StatCard icon={Eye} value={a.viewsThisWeek} label="Menu views this week" delta={a.viewsDelta} />
        <StatCard icon={TrendingUp} value={a.topItems[0].views} label="Top item views" />
        <StatCard icon={ActivityIcon} value={a.uptime} label="Menu uptime" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
        <Card variant="flat" padded>
          <SectionTitle>Menu views</SectionTitle>
          <LineChart series={a.series} days={a.days} />
        </Card>
        <Card variant="flat" padded>
          <SectionTitle>Top items viewed</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {a.topItems.map((it, i) => (
              <div key={it.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--border-soft)" : 0 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--text-subtle)", width: 18 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 14, color: "var(--text-strong)", fontWeight: 600 }}>{it.name}</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--brand)" }}>{it.views}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageWrap>
  );
}

/* ════ SUBSCRIPTION ════════════════════════════════════════════════ */
function SubscriptionTab({ currentId, toast }: { currentId: string; toast: (m: string) => void }) {
  return (
    <PageWrap max={1000}>
      <SectionTitle>Choose your plan</SectionTitle>
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
              <Button variant={current ? "secondary" : "primary"} block disabled={current} onClick={() => toast(`Switched to ${p.name}`)}>
                {current ? "Your plan" : `Switch to ${p.name}`}
              </Button>
            </div>
          );
        })}
      </div>
    </PageWrap>
  );
}

/* ════ SETTINGS ════════════════════════════════════════════════════ */
function SettingsTab({ cafe, setCafe, toast }: { cafe: Cafe; setCafe: (f: (c: Cafe) => Cafe) => void; toast: (m: string) => void }) {
  const set = <K extends keyof Cafe>(k: K, v: Cafe[K]) => setCafe((c) => ({ ...c, [k]: v }));
  const [display, setDisplay] = useState({ prices: true, photos: true, orders: true });
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
        <SectionTitle>Menu display</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Switch checked={display.prices} tone="brand" onChange={(v) => setDisplay((d) => ({ ...d, prices: v }))} label="Show prices to guests" />
          <Switch checked={display.photos} tone="brand" onChange={(v) => setDisplay((d) => ({ ...d, photos: v }))} label="Show photos" />
          <Switch checked={display.orders} tone="brand" onChange={(v) => setDisplay((d) => ({ ...d, orders: v }))} label="Let guests build an order to show the server" />
        </div>
      </Card>
      <div style={{ marginTop: 20 }}><Button variant="primary" onClick={() => toast("Settings saved")}><Check /> Save changes</Button></div>
    </PageWrap>
  );
}

/* ════ SHELL ═══════════════════════════════════════════════════════ */
export function DashboardShell({ cafe: cafe0, menu, categories: categories0, planId }: Props) {
  const slug = cafe0.slug;
  const [tab, setTab] = useState<TabId>("home");
  const [items, setItems] = useLocalStore<MenuItem[]>(studioKey(slug, "items"), menu);
  const [cafe, setCafe] = useLocalStore<Cafe>(studioKey(slug, "cafe"), cafe0);
  const [brand, setBrand] = useLocalStore<BrandKit>(studioKey(slug, "brand"), DEFAULT_BRAND);
  const [theme, setTheme] = useLocalStore<ThemeKey>(studioKey(slug, "theme"), cafe0.theme);
  const [promos, setPromos] = useLocalStore<Promo[]>(studioKey(slug, "promos"), PROMOS);
  const [categories, setCategories] = useLocalStore<string[]>(studioKey(slug, "categories"), categories0);
  const caps = capsFor(cafe.plan);
  const [editing, setEditing] = useState<DraftItem | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  const toast = (m: string) => setToastMsg(m);
  React.useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(""), 2000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const toggle = (id: string) => setItems((arr) => arr.map((m) => (m.id === id ? { ...m, soldOut: !m.soldOut } : m)));
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
  const meta: Record<TabId, { t: string; s: string }> = {
    home: { t: `Good morning, ${cafe.name}.`, s: "Here's what's happening with your menu today." },
    menu: { t: "Menu", s: `${items.length} items · ${soldOut} sold out today` },
    categories: { t: "Categories", s: "Organise your menu into sections." },
    appearance: { t: "Appearance", s: "The look of your menu — theme, logo, colours and fonts." },
    qr: { t: "QR code", s: "Print it and put it on every table." },
    promos: { t: "Promos", s: "Highlight specials and limited offers." },
    analytics: { t: "Analytics", s: "How your menu is performing." },
    subscription: { t: "Subscription", s: "Your Mesa plan and billing." },
    settings: { t: "Settings", s: "Your café profile and menu display." },
  };

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: "var(--surface-page)", ...(brandVars(brand) as React.CSSProperties) }}>
      {/* Sidebar */}
      <aside className="mesa-dash-sidebar" style={{ width: 236, flex: "none", background: "var(--surface-card)", borderRight: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", padding: "20px 14px", position: "sticky", top: 0, height: "100dvh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 20px" }}>
          {brand.logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={brand.logo} alt="" style={{ width: 32, height: 32, borderRadius: 9, objectFit: "cover", flex: "none" }} />
            : <span style={{ width: 32, height: 32, borderRadius: 9, background: "var(--brand)", display: "grid", placeItems: "center", flex: "none" }}><Coffee size={17} style={{ color: "var(--brand-on)" }} /></span>}
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cafe.name}</span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV.map((n) => {
            const on = tab === n.id;
            return (
              <button key={n.id} onClick={() => setTab(n.id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: "var(--radius-md)", border: 0, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14.5, fontWeight: 600, textAlign: "left", background: on ? "var(--brand)" : "transparent", color: on ? "var(--brand-on)" : "var(--text-body)" }}>
                <n.icon size={18} /> {n.label}
              </button>
            );
          })}
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

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 28px", borderBottom: "1px solid var(--border-soft)", background: "color-mix(in oklab, var(--surface-page) 82%, transparent)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 6 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, color: "var(--text-strong)", lineHeight: 1.1 }}>{meta[tab].t}</h1>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 2 }}>{meta[tab].s}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
            {tab === "menu" && (
              <Button variant="secondary" onClick={() => setEditing({ id: "new-" + Date.now(), _new: true, name: "", price: 0, cat: categories.find((c) => c !== "All") || "Hot Coffee", desc: "", img: items[0]?.img || "" })}>
                <Plus /> Add item
              </Button>
            )}
            <Button as="a" href={`/m/${cafe.slug}`} target="_blank" variant="primary"><ExternalLink /> View live menu</Button>
          </div>
        </div>

        {tab === "home" && <HomeTab items={items} cafe={cafe} theme={theme} brand={brand} setTab={setTab} />}
        {tab === "menu" && <MenuTab items={items} categories={categories} onToggle={toggle} onEdit={setEditing} />}
        {tab === "categories" && <CategoriesTab items={items} categories={categories} setCategories={setCategories} toast={toast} />}
        {tab === "appearance" && <AppearanceTab theme={theme} setTheme={setTheme} brand={brand} setBrand={setBrand} cafe={cafe} items={items} categories={categories} caps={caps} plan={cafe.plan} />}
        {tab === "qr" && <QRTab cafe={cafe} brand={brand} caps={caps} toast={toast} />}
        {tab === "promos" && <PromosTab promos={promos} setPromos={setPromos} />}
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "subscription" && <SubscriptionTab currentId={planId} toast={toast} />}
        {tab === "settings" && <SettingsTab cafe={cafe} setCafe={setCafe} toast={toast} />}
      </div>

      {editing && <EditDrawer item={editing} cats={categories} onClose={() => setEditing(null)} onSave={save} />}

      {toastMsg && (
        <div className="mesa-anim-rise" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 60, background: "var(--surface-inverse)", color: "var(--text-inverse)", padding: "12px 20px", borderRadius: 999, fontSize: 14, fontWeight: 500, boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", gap: 8 }}>
          <Check size={16} style={{ color: "var(--sage-300)" }} /> {toastMsg}
        </div>
      )}
    </div>
  );
}

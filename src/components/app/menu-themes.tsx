"use client";

import React from "react";
import {
  Search,
  X,
  Share2,
  CheckCircle2,
  Clock,
  Coffee,
  CupSoda,
  Croissant,
  Utensils,
  Home,
  Tag,
  Info,
  type LucideIcon,
} from "lucide-react";
import { MenuItem, Tabs, Badge, IconButton, Logo, Avatar } from "@/components/ds";
import { CAT_ICONS, type Cafe, type MenuItem as MenuItemType, type MenuTag, type ThemeKey } from "@/lib/data";

const peso = (n: number) => `₱${n}`;

// A QR diner menu has no real "Home/Promos/About" destinations, so the decorative
// bottom tab bar is disabled (TabBar kept for reference, gated by this list).
export const HAS_TAB_BAR: ThemeKey[] = [];
export const HAS_SEARCH: ThemeKey[] = ["warm", "minimal"];

/** Per-theme CSS-variable overrides, layered onto the menu column. */
export function themeVars(theme: ThemeKey): Record<string, string> {
  switch (theme) {
    case "minimal":
      return { "--surface-page": "var(--white)", "--surface-muted": "var(--bean-50)" };
    case "bold":
      return {
        "--surface-page": "var(--bean-950)",
        "--surface-card": "var(--bean-900)",
        "--surface-muted": "var(--bean-800)",
        "--surface-sunken": "var(--bean-800)",
        "--text-strong": "var(--cream)",
        "--text-body": "var(--bean-150)",
        "--text-muted": "var(--bean-300)",
        "--text-subtle": "var(--bean-400)",
        "--border-soft": "rgba(255,255,255,0.09)",
        "--border-default": "rgba(255,255,255,0.16)",
      };
    case "soft":
      return { "--surface-page": "var(--bean-100)", "--surface-muted": "var(--bean-50)" };
    default:
      return {};
  }
}

export interface LayoutProps {
  cafe: Cafe;
  /** Owner's uploaded brand logo (data URL), or null to use the theme default mark. */
  logo?: string | null;
  /** Roast tier hides the "powered by Mesa" footer mark. */
  whiteLabel?: boolean;
  menu: MenuItemType[];
  groups: { c: string; items: MenuItemType[] }[];
  cats: string[];
  cat: string;
  setCat: (c: string) => void;
  onOpen: (m: MenuItemType) => void;
  q: string;
  setQ: (s: string) => void;
  /** True when viewing "All" with no active search — show feature rails. */
  showRails: boolean;
  /** Dietary filter chip bar (rendered above the menu sections); null if none. */
  filterBar?: React.ReactNode;
}

/* ── Shared bits ─────────────────────────────────────────────────── */

const ICON_BY_NAME: Record<string, LucideIcon> = {
  coffee: Coffee,
  "cup-soda": CupSoda,
  croissant: Croissant,
  utensils: Utensils,
};

function OpenPill() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(110,139,91,0.95)", color: "#fff", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999 }}>
      <CheckCircle2 size={13} /> Open now
    </span>
  );
}

/**
 * Renders the café's uploaded logo, falling back to each theme's default mark.
 * Logos are shown `contain`ed (never cropped) and may sit on an optional backing
 * for legibility on photo heroes or coloured chips.
 */
function BrandMark({
  logo,
  fallback,
  size,
  radius = 16,
  background,
}: {
  logo?: string | null;
  fallback: React.ReactNode;
  size: number;
  radius?: number;
  /** Backing behind the logo — use on dark photo heroes / coloured chips. */
  background?: string;
}) {
  if (!logo) return <>{fallback}</>;
  return (
    <span
      style={{
        height: size,
        minWidth: background ? size : undefined,
        maxWidth: size * 2.4,
        borderRadius: radius,
        background: background ?? "transparent",
        boxShadow: background ? "var(--shadow-sm)" : undefined,
        padding: background ? Math.round(size * 0.16) : 0,
        display: "inline-grid",
        placeItems: "center",
        overflow: "hidden",
        flex: "none",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="" style={{ maxHeight: "100%", maxWidth: "100%", width: "auto", objectFit: "contain", display: "block" }} />
    </span>
  );
}

function SearchBar({ q, setQ }: { q: string; setQ: (s: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface-card)", border: "1.5px solid var(--border-default)", borderRadius: 999, padding: "0 16px", height: 46 }}>
      <Search size={18} style={{ color: "var(--text-subtle)", flex: "none" }} />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search the menu"
        aria-label="Search the menu"
        style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--text-strong)" }}
      />
      {q && (
        <button onClick={() => setQ("")} aria-label="Clear search" style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--text-subtle)", display: "grid", placeItems: "center" }}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function CatIconRow({
  cats,
  cat,
  setCat,
  shape,
}: {
  cats: string[];
  cat: string;
  setCat: (c: string) => void;
  shape: "circle" | "square";
}) {
  const list = cats.filter((c) => c !== "All");
  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "2px 0", scrollbarWidth: "none" }}>
      {list.map((c) => {
        const on = cat === c;
        const Icon = ICON_BY_NAME[CAT_ICONS[c]] || Utensils;
        return (
          <button
            key={c}
            onClick={() => setCat(on ? "All" : c)}
            style={{ flex: "none", border: 0, cursor: "pointer", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, width: 70 }}
          >
            <span
              style={{
                width: 60,
                height: 60,
                borderRadius: shape === "square" ? 20 : 999,
                display: "grid",
                placeItems: "center",
                background: on ? "var(--brand)" : "var(--brand-soft)",
                color: on ? "var(--brand-on)" : "var(--brand)",
                boxShadow: on ? "var(--shadow-md)" : "none",
                transition: "transform var(--dur-fast) var(--ease-standard), background var(--dur-fast) var(--ease-standard)",
                transform: on ? "translateY(-1px)" : "none",
              }}
            >
              <Icon size={24} />
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: on ? "var(--text-strong)" : "var(--text-muted)", textAlign: "center", lineHeight: 1.15 }}>
              {c}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function TrustFooter() {
  return (
    <div style={{ marginTop: 32, paddingTop: 18, borderTop: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-subtle)", fontSize: 12.5 }}>
      <span>Secure menu powered by</span> <Logo size="sm" />
    </div>
  );
}

export function TabBar() {
  const tabs: [string, LucideIcon][] = [
    ["Home", Home],
    ["Menu", Utensils],
    ["Promos", Tag],
    ["About", Info],
  ];
  return (
    <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 0, width: "min(448px, 100%)", zIndex: 25, height: 62, display: "flex", background: "color-mix(in oklab, var(--surface-page) 90%, transparent)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border-soft)" }}>
      {tabs.map(([label, Icon]) => {
        const on = label === "Menu";
        return (
          <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, color: on ? "var(--brand)" : "var(--text-subtle)" }}>
            <Icon size={21} /> <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Sections({
  groups,
  gap = 0,
  titleSize = 21,
  renderRow,
}: {
  groups: LayoutProps["groups"];
  gap?: number;
  titleSize?: number;
  renderRow: (m: MenuItemType) => React.ReactNode;
}) {
  return (
    <>
      {groups.map((g) => (
        <section key={g.c} style={{ marginTop: 24 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: titleSize, fontWeight: 500, color: "var(--text-strong)", marginBottom: gap ? 12 : 2, letterSpacing: "-0.01em" }}>
            {g.c}
          </h2>
          {g.items.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14.5, marginTop: 8 }}>Nothing here — try another search.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap }}>{g.items.map(renderRow)}</div>
          )}
        </section>
      ))}
    </>
  );
}

function Eyebrow({ children, color = "var(--text-subtle)" }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color, marginBottom: 12 }}>
      {children}
    </div>
  );
}

/* Compact at-a-glance dietary/allergen chips for menu cards (emoji + tooltip).
 * Full labels live in the item detail sheet. */
function DietChips({ tags, marginTop = 6, light = false }: { tags?: MenuTag[]; marginTop?: number; light?: boolean }) {
  if (!tags || !tags.length) return null;
  const labels = tags.map((t) => t.label).join(", ");
  // Tags with an emoji show it (compact); emoji-less custom tags fall back to a
  // short uppercase initial so they're still visible at a glance.
  return (
    <span title={labels} aria-label={labels} style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 13, lineHeight: 1, marginTop, opacity: light ? 0.95 : 1 }}>
      {tags.map((t) => t.emoji
        ? <span key={t.id} aria-hidden>{t.emoji}</span>
        : <span key={t.id} aria-hidden style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.02em", padding: "2px 5px", borderRadius: 5, background: light ? "rgba(255,255,255,0.22)" : "var(--surface-muted)", color: light ? "#fff" : "var(--text-muted)" }}>{t.label.slice(0, 3).toUpperCase()}</span>)}
    </span>
  );
}

/* A soft rounded item card (used by soft & playful). */
function SoftRow({ m, onOpen, badgeVariant = "highlight" }: { m: MenuItemType; onOpen: (m: MenuItemType) => void; badgeVariant?: "highlight" | "available" }) {
  return (
    <button
      onClick={() => onOpen(m)}
      style={{ width: "100%", display: "flex", gap: 14, alignItems: "center", textAlign: "left", border: "1px solid var(--border-soft)", background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: 11, cursor: "pointer", boxShadow: "var(--shadow-xs)", opacity: m.soldOut ? 0.62 : 1 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={m.img} alt="" style={{ width: 78, height: 78, borderRadius: "var(--radius-md)", objectFit: "cover", flex: "none", filter: m.soldOut ? "grayscale(0.9)" : "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16.5, color: "var(--text-strong)" }}>{m.name}</span>
          {m.soldOut ? <Badge variant="soldout" size="sm">Sold out</Badge> : m.badge && <Badge variant={badgeVariant} size="sm">{m.badge}</Badge>}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{m.desc}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--brand)" }}>{peso(m.price)}</span>
          <DietChips tags={m.tags} marginTop={0} />
        </div>
      </div>
    </button>
  );
}

/* ════════════════════════ WARM & COZY ════════════════════════════ */
function LayoutWarm({ cafe, logo, whiteLabel, menu, groups, cats, cat, setCat, onOpen, q, setQ, showRails, filterBar }: LayoutProps) {
  const best = menu.filter((m) => m.best && !m.soldOut);
  const searching = !!q.trim();
  return (
    <>
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cafe.cover} alt="" style={{ width: "100%", height: 224, objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(31,20,14,0.3) 0%, rgba(31,20,14,0) 38%, rgba(31,20,14,0.82) 100%)" }} />
        <div style={{ position: "absolute", top: 16, right: 16 }}>
          <IconButton label="Share" variant="soft"><Share2 /></IconButton>
        </div>
        <div style={{ position: "absolute", left: 20, right: 20, bottom: 18, color: "#FBF6EE" }}>
          {logo && <div style={{ marginBottom: 10 }}><BrandMark logo={logo} size={46} radius={12} background="#fff" fallback={null} /></div>}
          <div style={{ marginBottom: 8 }}><OpenPill /></div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 500, color: "#fff", letterSpacing: "-0.01em", lineHeight: 1.05, margin: 0 }}>{cafe.name}</h1>
          <p style={{ fontSize: 13.5, opacity: 0.92, marginTop: 4 }}>{cafe.tagline}</p>
        </div>
      </div>

      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "color-mix(in oklab, var(--surface-page) 88%, transparent)", backdropFilter: "blur(10px)", paddingTop: 14, borderBottom: "1px solid var(--border-soft)" }}>
        <div style={{ padding: "0 18px 12px" }}>
          <SearchBar q={q} setQ={setQ} />
        </div>
        {!searching && (
          <div style={{ padding: "0 18px 14px" }}>
            <Tabs items={cats} value={cat} onChange={setCat} />
          </div>
        )}
      </div>

      <div style={{ padding: "8px 0 24px" }}>
        {filterBar && <div style={{ padding: "0 20px" }}>{filterBar}</div>}
        {showRails && best.length > 0 && (
          <section style={{ marginTop: 18 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 500, color: "var(--text-strong)", padding: "0 20px", marginBottom: 14 }}>Best sellers</h2>
            <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "2px 20px 8px", scrollbarWidth: "none" }}>
              {best.map((m) => (
                <button key={m.id} onClick={() => onOpen(m)} style={{ flex: "none", width: 168, textAlign: "left", border: 0, background: "var(--surface-card)", borderRadius: "var(--radius-lg)", overflow: "hidden", cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.img} alt="" style={{ width: "100%", height: 116, objectFit: "cover", display: "block" }} />
                    {m.badge && <div style={{ position: "absolute", top: 8, left: 8 }}><Badge variant="highlight" size="sm">{m.badge}</Badge></div>}
                  </div>
                  <div style={{ padding: "11px 13px 13px" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "var(--text-strong)", lineHeight: 1.15 }}>{m.name}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "var(--text-strong)", marginTop: 5 }}>{peso(m.price)}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
        <div style={{ padding: "0 20px" }}>
          <Sections
            groups={groups}
            renderRow={(m) => (
              <MenuItem key={m.id} name={m.name} price={m.price} image={m.img} description={m.desc} badge={m.badge} soldOut={m.soldOut} footer={<DietChips tags={m.tags} />} onClick={() => onOpen(m)} />
            )}
          />
          {!whiteLabel && <TrustFooter />}
        </div>
      </div>
    </>
  );
}

/* ════════════════════════ CLEAN & MINIMAL ════════════════════════ */
function LayoutMinimal({ cafe, logo, whiteLabel, menu, groups, cats, cat, setCat, onOpen, q, setQ, showRails, filterBar }: LayoutProps) {
  const favs = menu.filter((m) => m.best && !m.soldOut).slice(0, 2);
  const searching = !!q.trim();
  return (
    <>
      <div style={{ textAlign: "center", padding: "40px 24px 16px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <BrandMark logo={logo} size={60} fallback={<Avatar name={cafe.name} size="lg" />} />
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 31, fontWeight: 500, color: "var(--text-strong)", letterSpacing: "-0.01em" }}>{cafe.name}</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14.5, marginTop: 8, lineHeight: 1.5, maxWidth: 340, marginInline: "auto" }}>{cafe.intro}</p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 14, fontSize: 12.5, color: "var(--text-subtle)" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--available)" }} /> {cafe.hours}
        </div>
      </div>

      <div style={{ padding: "0 22px 10px" }}>
        <SearchBar q={q} setQ={setQ} />
      </div>

      {!searching && (
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "color-mix(in oklab, var(--surface-page) 92%, transparent)", backdropFilter: "blur(10px)", padding: "6px 18px 0" }}>
          <Tabs items={cats} value={cat} onChange={setCat} variant="underline" />
        </div>
      )}

      <div style={{ padding: "4px 22px 24px" }}>
        {filterBar}
        {showRails && favs.length > 0 && (
          <section style={{ marginTop: 22 }}>
            <Eyebrow>Today&apos;s favorites</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {favs.map((m) => (
                <button key={m.id} onClick={() => onOpen(m)} style={{ display: "flex", gap: 14, alignItems: "center", textAlign: "left", border: "1px solid var(--border-soft)", background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: 10, cursor: "pointer" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.img} alt="" style={{ width: 84, height: 84, borderRadius: "var(--radius-md)", objectFit: "cover", flex: "none" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--text-strong)" }}>{m.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.4 }}>{m.desc}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--text-strong)", marginTop: 6 }}>{peso(m.price)}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
        <Sections
          groups={groups}
          titleSize={19}
          gap={0}
          renderRow={(m) => (
            <button key={m.id} onClick={() => onOpen(m)} style={{ width: "100%", display: "flex", gap: 16, alignItems: "center", textAlign: "left", border: 0, background: "transparent", padding: "16px 0", borderBottom: "1px solid var(--border-soft)", cursor: "pointer", opacity: m.soldOut ? 0.55 : 1 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--text-strong)" }}>{m.name}</span>
                  {m.soldOut ? <Badge variant="soldout" size="sm">Sold out</Badge> : m.badge && <Badge variant="highlight" size="sm">{m.badge}</Badge>}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.45 }}>{m.desc}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 7 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--text-strong)" }}>{peso(m.price)}</span>
                  <DietChips tags={m.tags} marginTop={0} />
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.img} alt="" style={{ width: 72, height: 72, borderRadius: "var(--radius-md)", objectFit: "cover", flex: "none", filter: m.soldOut ? "grayscale(0.9)" : "none" }} />
            </button>
          )}
        />
        {!whiteLabel && <TrustFooter />}
      </div>
    </>
  );
}

/* ════════════════════════ BOLD & APPETIZING (dark) ═══════════════ */
function LayoutBold({ cafe, logo, whiteLabel, groups, cats, cat, setCat, onOpen, filterBar }: LayoutProps) {
  return (
    <>
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cafe.cover} alt="" style={{ width: "100%", height: 330, objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(15,9,6,0.55) 0%, rgba(15,9,6,0.12) 30%, rgba(15,9,6,0.6) 64%, var(--bean-950) 100%)" }} />
        <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", justifyContent: "flex-end" }}>
          <IconButton label="Share" variant="soft"><Share2 /></IconButton>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 24, textAlign: "center", padding: "0 28px", color: "#fff" }}>
          {logo && <div style={{ marginBottom: 14, display: "flex", justifyContent: "center" }}><BrandMark logo={logo} size={54} radius={14} background="#fff" fallback={null} /></div>}
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}><OpenPill /></div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 500, lineHeight: 1.0, letterSpacing: "-0.015em", textShadow: "0 2px 18px rgba(0,0,0,0.45)", margin: 0 }}>{cafe.name}</h1>
          <p style={{ fontSize: 14, opacity: 0.9, marginTop: 10 }}>{cafe.tagline}</p>
        </div>
      </div>

      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "color-mix(in oklab, var(--bean-950) 88%, transparent)", backdropFilter: "blur(10px)", padding: "14px 0" }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 18px", scrollbarWidth: "none" }}>
          {cats.map((c) => {
            const on = cat === c;
            return (
              <button key={c} onClick={() => setCat(c)} style={{ flex: "none", border: "1.5px solid", borderColor: on ? "var(--cream)" : "rgba(255,255,255,0.18)", background: on ? "var(--cream)" : "transparent", color: on ? "var(--bean-950)" : "var(--bean-200)", borderRadius: 999, padding: "12px 18px", fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "10px 18px 24px" }}>
        {filterBar}
        {groups.map((g) => (
          <section key={g.c} style={{ marginTop: 22 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 500, color: "var(--cream)", letterSpacing: "-0.01em" }}>{g.c}</h2>
              <span style={{ fontSize: 12.5, color: "var(--bean-400)" }}>{g.items.length} items</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {g.items.map((m) => (
                <button key={m.id} onClick={() => onOpen(m)} style={{ position: "relative", textAlign: "left", border: 0, padding: 0, borderRadius: "var(--radius-xl)", overflow: "hidden", cursor: "pointer", height: 176, background: "var(--bean-900)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.img} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: m.soldOut ? "grayscale(0.85) brightness(0.7)" : "none" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,9,6,0.92) 8%, rgba(15,9,6,0.2) 56%, rgba(15,9,6,0.04) 100%)" }} />
                  {(m.badge || m.soldOut) && (
                    <div style={{ position: "absolute", top: 14, left: 14 }}>
                      {m.soldOut ? <Badge variant="soldout" size="sm">Sold out</Badge> : <Badge variant="highlight" size="sm">{m.badge}</Badge>}
                    </div>
                  )}
                  <div style={{ position: "absolute", left: 18, right: 18, bottom: 16, color: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, lineHeight: 1.1 }}>{m.name}</div>
                        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4, lineHeight: 1.4 }}>{m.desc}</div>
                        <DietChips tags={m.tags} light />
                      </div>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 19, whiteSpace: "nowrap", background: "var(--brand)", color: "var(--brand-on)", padding: "5px 13px", borderRadius: 999 }}>{peso(m.price)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
        {!whiteLabel && <TrustFooter />}
      </div>
    </>
  );
}

/* ════════════════════════ SOFT & NATURAL ═════════════════════════ */
function LayoutSoft({ cafe, logo, whiteLabel, menu, groups, cats, cat, setCat, onOpen, showRails, filterBar }: LayoutProps) {
  const special = menu.find((m) => m.badge === "New" && !m.soldOut) || menu.find((m) => m.best && !m.soldOut);
  return (
    <>
      <div style={{ padding: "32px 16px 4px" }}>
        <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-2xl)", padding: "26px 24px 22px", textAlign: "center", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-soft)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <BrandMark
              logo={logo}
              size={60}
              radius={999}
              background="var(--brand-soft)"
              fallback={
                <span style={{ width: 60, height: 60, borderRadius: 999, background: "var(--brand-soft)", color: "var(--brand)", display: "grid", placeItems: "center" }}>
                  <Coffee size={28} />
                </span>
              }
            />
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--text-strong)", lineHeight: 1.1 }}>{cafe.name}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 8, lineHeight: 1.55, maxWidth: 320, marginInline: "auto" }}>{cafe.intro}</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 14, fontSize: 12.5, color: "var(--sage-700)", background: "var(--available-soft)", padding: "6px 13px", borderRadius: 999, fontWeight: 600 }}>
            <Clock size={14} /> {cafe.hours}
          </div>
        </div>
      </div>

      <div style={{ padding: "18px 16px 6px" }}>
        <CatIconRow cats={cats} cat={cat} setCat={setCat} shape="circle" />
      </div>

      <div style={{ padding: "6px 18px 24px" }}>
        {filterBar}
        {showRails && special && (
          <section style={{ marginTop: 12 }}>
            <Eyebrow color="var(--sage-700)">Today&apos;s special</Eyebrow>
            <button onClick={() => onOpen(special)} style={{ width: "100%", display: "flex", gap: 14, textAlign: "left", alignItems: "center", border: "1px solid var(--sage-300)", background: "var(--available-soft)", borderRadius: "var(--radius-lg)", padding: 12, cursor: "pointer" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={special.img} alt="" style={{ width: 92, height: 92, borderRadius: "var(--radius-md)", objectFit: "cover", flex: "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-strong)" }}>{special.name}</span>
                  {special.badge && <Badge variant="available" size="sm">{special.badge}</Badge>}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>{special.desc}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--sage-700)", marginTop: 7 }}>{peso(special.price)}</div>
              </div>
            </button>
          </section>
        )}
        <Sections groups={groups} titleSize={20} gap={12} renderRow={(m) => <SoftRow key={m.id} m={m} onOpen={onOpen} badgeVariant="available" />} />
        {!whiteLabel && <TrustFooter />}
      </div>
    </>
  );
}

/* ════════════════════════ MODERN & PLAYFUL ═══════════════════════ */
function LayoutPlayful({ cafe, logo, whiteLabel, menu, groups, cats, cat, setCat, onOpen, showRails, filterBar }: LayoutProps) {
  const popular = menu.filter((m) => m.best && !m.soldOut);
  return (
    <>
      <div style={{ padding: "30px 16px 4px" }}>
        <div style={{ background: "linear-gradient(135deg, var(--brand-soft), color-mix(in srgb, var(--brand) 16%, var(--surface-page)))", borderRadius: "var(--radius-2xl)", padding: "24px 22px 22px", textAlign: "center", border: "1px solid color-mix(in srgb, var(--brand) 24%, transparent)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <BrandMark
              logo={logo}
              size={50}
              radius={16}
              background="var(--brand)"
              fallback={
                <span style={{ width: 50, height: 50, borderRadius: 16, background: "var(--brand)", color: "var(--brand-on)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sm)" }}>
                  <Coffee size={24} />
                </span>
              }
            />
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--text-strong)", lineHeight: 1.08 }}>{cafe.name}</h1>
          <p style={{ color: "var(--bean-700)", fontSize: 13.5, marginTop: 7, fontWeight: 500 }}>{cafe.intro}</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 12, fontSize: 12.5, color: "var(--brand-active)", fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--available)" }} /> {cafe.hours}
          </div>
        </div>
      </div>

      <div style={{ padding: "18px 16px 4px" }}>
        <CatIconRow cats={cats} cat={cat} setCat={setCat} shape="square" />
      </div>

      <div style={{ padding: "6px 18px 24px" }}>
        {filterBar}
        {showRails && popular.length > 0 && (
          <section style={{ marginTop: 12 }}>
            <Eyebrow color="var(--brand-active)">Popular picks</Eyebrow>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "2px 0 8px", scrollbarWidth: "none" }}>
              {popular.map((m) => (
                <button key={m.id} onClick={() => onOpen(m)} style={{ flex: "none", width: 152, textAlign: "left", border: "1px solid color-mix(in srgb, var(--brand) 22%, transparent)", background: "var(--surface-card)", borderRadius: "var(--radius-lg)", overflow: "hidden", cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.img} alt="" style={{ width: "100%", height: 104, objectFit: "cover", display: "block" }} />
                  <div style={{ padding: "10px 12px 12px" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--text-strong)", lineHeight: 1.15 }}>{m.name}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 14.5, color: "var(--brand)" }}>{peso(m.price)}</span>
                      {m.badge && <Badge variant="highlight" size="sm">{m.badge}</Badge>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
        <Sections groups={groups} titleSize={20} gap={12} renderRow={(m) => <SoftRow key={m.id} m={m} onOpen={onOpen} />} />
        {!whiteLabel && <TrustFooter />}
      </div>
    </>
  );
}

const LAYOUTS: Record<ThemeKey, React.FC<LayoutProps>> = {
  warm: LayoutWarm,
  minimal: LayoutMinimal,
  bold: LayoutBold,
  soft: LayoutSoft,
  playful: LayoutPlayful,
};

export function ThemeLayout({ theme, ...props }: LayoutProps & { theme: ThemeKey }) {
  const Layout = LAYOUTS[theme] || LayoutWarm;
  return <Layout {...props} />;
}

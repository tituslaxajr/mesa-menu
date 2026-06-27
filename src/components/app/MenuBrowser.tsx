"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, BellRing, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge, Button, IconButton, Stepper } from "@/components/ds";
import { DEFAULT_BRAND, capsFor, clampBrand, clampTheme, type BrandKit, type Cafe, type MenuItem as MenuItemType, type PlanId, type ThemeKey } from "@/lib/data";
import { brandVars, surfaceVars } from "@/lib/brand";
import { readStudioOverrides } from "@/lib/studio-store";
import { ThemeLayout, themeVars, HAS_TAB_BAR, TabBar } from "./menu-themes";

const peso = (n: number) => `₱${n}`;

interface Props {
  cafe: Cafe;
  menu: MenuItemType[];
  categories: string[];
  /** Brew & Roast allow guest ordering; Starter is browse-only. */
  ordering: boolean;
  /** Café's plan — gates which branding actually reaches the diner. */
  plan: PlanId;
  /** Guest-menu theme (owner's choice; can be previewed via ?theme=). */
  theme: ThemeKey;
  /** True when ?theme= forced the theme — studio's saved theme won't override it. */
  themeOverridden?: boolean;
}

/**
 * Customer-facing menu — the QR-scanned guest experience.
 * Renders one of five themes (warm/minimal/bold/soft/playful) and layers the
 * shared interaction model on top: search, item bottom-sheet with a quantity
 * stepper, a running order tray, an order-review sheet, and toasts. On the
 * Starter (browse-only) tier the ordering controls are hidden.
 *
 * Server props are the starting point; on the client we merge any saved owner
 * edits from the Studio store (menu, café profile, categories, theme, brand kit)
 * so changes made in /dashboard show up here live (and across tabs).
 */
export function MenuBrowser({ cafe: cafe0, menu: menu0, categories: categories0, ordering, plan, theme: theme0, themeOverridden }: Props) {
  const [cafe, setCafe] = useState(cafe0);
  const [menu, setMenu] = useState(menu0);
  const [categories, setCategories] = useState(categories0);
  const [theme, setTheme] = useState<ThemeKey>(theme0);
  const [brand, setBrand] = useState<BrandKit>(DEFAULT_BRAND);
  const caps = capsFor(plan);

  // Merge Studio edits on mount, and keep in sync if another tab saves changes.
  useEffect(() => {
    const apply = () => {
      const o = readStudioOverrides(cafe0.slug);
      if (o.items) setMenu(o.items);
      if (o.cafe) setCafe(o.cafe);
      if (o.categories) setCategories(o.categories);
      if (o.brand) setBrand(o.brand);
      if (!themeOverridden && o.theme) setTheme(o.theme);
    };
    apply();
    window.addEventListener("storage", apply);
    return () => window.removeEventListener("storage", apply);
  }, [cafe0.slug, themeOverridden]);

  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<MenuItemType | null>(null);
  const [showOrder, setShowOrder] = useState(false);
  const [order, setOrder] = useState<Record<string, number>>({});
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Roast tier: swap the browser-tab favicon for the café's uploaded logo.
  // The logo lives client-side (Studio store), so this can't be a server icon.
  // An observer keeps ours the only icon, since Next re-injects its default.
  useEffect(() => {
    if (!caps.brandedQR || !brand.logo) return;
    const href = brand.logo;
    const type = href.startsWith("data:image/svg") ? "image/svg+xml"
      : href.startsWith("data:image/png") ? "image/png"
      : href.startsWith("data:image/webp") ? "image/webp"
      : (href.startsWith("data:image/jpeg") || href.startsWith("data:image/jpg")) ? "image/jpeg"
      : undefined;
    // Remember the originals so we can restore them when leaving this menu.
    const originals = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')).map((l) => l.cloneNode(true) as HTMLLinkElement);
    const link = document.createElement("link");
    link.rel = "icon";
    if (type) link.type = type;
    link.href = href;
    const sweep = () => {
      document.querySelectorAll('link[rel~="icon"]').forEach((l) => { if (l !== link) l.parentNode?.removeChild(l); });
    };
    document.head.appendChild(link);
    sweep();
    const obs = new MutationObserver(sweep);
    obs.observe(document.head, { childList: true });
    return () => {
      obs.disconnect();
      link.remove();
      originals.forEach((l) => document.head.appendChild(l));
    };
  }, [caps.brandedQR, brand.logo]);

  const query = q.trim().toLowerCase();
  const lines = Object.entries(order)
    .map(([id, qty]) => {
      const item = menu.find((m) => m.id === id);
      return item ? { ...item, qty } : null;
    })
    .filter(Boolean) as (MenuItemType & { qty: number })[];
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  const addToOrder = (item: MenuItemType, qty: number) => {
    setOrder((o) => ({ ...o, [item.id]: (o[item.id] || 0) + qty }));
    setActive(null);
    setToast(`Added ${item.name}`);
  };

  const groups = useMemo(() => {
    if (query) {
      const hits = menu.filter(
        (m) => m.name.toLowerCase().includes(query) || m.desc.toLowerCase().includes(query)
      );
      return [{ c: hits.length ? "Results" : "No matches", items: hits }];
    }
    if (cat === "All") {
      return categories
        .filter((c) => c !== "All")
        .map((c) => ({ c, items: menu.filter((m) => m.cat === c) }))
        .filter((g) => g.items.length);
    }
    return [{ c: cat, items: menu.filter((m) => m.cat === cat) }];
  }, [query, cat, menu, categories]);

  // Enforce the plan's branding entitlements on what diners actually see, so a
  // downgrade can't leak a higher tier's theme/colour/background/shape.
  const effBrand = clampBrand(brand, caps);
  const effTheme = clampTheme(theme, caps);

  const showRails = cat === "All" && !query;
  const hasTabBar = HAS_TAB_BAR.includes(effTheme);
  const trayVisible = ordering && count > 0 && !active && !showOrder;

  return (
    <div
      style={{
        maxWidth: "var(--container-sm)",
        margin: "0 auto",
        background: "var(--surface-page)",
        minHeight: "100dvh",
        position: "relative",
        ...(themeVars(effTheme) as React.CSSProperties),
        ...(brandVars(effBrand) as React.CSSProperties),
        // Custom page background — layered last so it overrides the theme. Bold
        // keeps its signature dark look (its hero/type use hardcoded colours).
        ...(effBrand.surface && effTheme !== "bold" ? (surfaceVars(effBrand.surface) as React.CSSProperties) : {}),
      }}
    >
      <ThemeLayout
        theme={effTheme}
        cafe={cafe}
        logo={effBrand.logo}
        whiteLabel={caps.whiteLabel}
        menu={menu}
        groups={groups}
        cats={categories}
        cat={cat}
        setCat={setCat}
        onOpen={setActive}
        q={q}
        setQ={setQ}
        showRails={showRails}
      />

      {!ordering && (
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-subtle)", padding: "0 20px 8px" }}>
          Browse-only menu · ask your server to order
        </p>
      )}

      {/* spacer so the footer clears fixed overlays */}
      <div style={{ height: (hasTabBar ? 70 : 0) + (trayVisible ? 80 : 0) }} />

      {/* Order tray */}
      {trayVisible && (
        <div className="mesa-anim-rise" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: hasTabBar ? 84 : 24, width: "min(416px, calc(100% - 32px))", zIndex: 30 }}>
          <button
            onClick={() => setShowOrder(true)}
            style={{ width: "100%", border: 0, cursor: "pointer", background: "var(--brand)", color: "var(--brand-on)", borderRadius: 999, height: 56, padding: "0 8px 0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "var(--shadow-lg)", fontFamily: "var(--font-sans)" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 16 }}>
              <span style={{ background: "rgba(255,255,255,0.22)", minWidth: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", fontSize: 14 }}>{count}</span>
              View order
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", fontSize: 18, background: "rgba(255,255,255,0.16)", padding: "8px 16px", borderRadius: 999 }}>
              {peso(total)} <ArrowRight size={18} />
            </span>
          </button>
        </div>
      )}

      {hasTabBar && <TabBar />}

      {active && (
        <ItemSheet item={active} ordering={ordering} onClose={() => setActive(null)} onAdd={addToOrder} />
      )}
      {showOrder && (
        <OrderSheet
          lines={lines}
          total={total}
          onClose={() => setShowOrder(false)}
          onPlace={() => {
            setShowOrder(false);
            setOrder({});
            setToast("Your server has been called");
          }}
        />
      )}
      <Toast msg={toast} />
    </div>
  );
}

/* ── Reusable bottom-sheet shell ─────────────────────────────────── */
function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} className="mesa-anim-fade" style={{ position: "absolute", inset: 0, background: "rgba(31,20,14,0.45)" }} />
      <div
        className="mesa-anim-sheet"
        style={{ position: "relative", width: "min(448px, 100%)", margin: "0 auto", background: "var(--surface-card)", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", maxHeight: "86vh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(31,20,14,0.25)" }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Item detail bottom sheet ────────────────────────────────────── */
function ItemSheet({
  item,
  ordering,
  onClose,
  onAdd,
}: {
  item: MenuItemType;
  ordering: boolean;
  onClose: () => void;
  onAdd: (item: MenuItemType, qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const canOrder = ordering && !item.soldOut;
  return (
    <Sheet onClose={onClose}>
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.img} alt="" style={{ width: "100%", height: 220, objectFit: "cover", display: "block", filter: item.soldOut ? "grayscale(0.9)" : "none" }} />
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <IconButton label="Close" variant="soft" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        {item.badge && !item.soldOut && (
          <div style={{ position: "absolute", top: 12, left: 16 }}>
            <Badge variant="highlight">{item.badge}</Badge>
          </div>
        )}
      </div>
      <div style={{ padding: "18px 20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, color: "var(--text-strong)" }}>{item.name}</h2>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text-strong)", whiteSpace: "nowrap" }}>{peso(item.price)}</span>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.5, marginTop: 8 }}>{item.desc}</p>

        {item.soldOut ? (
          <div style={{ marginTop: 20 }}>
            <Badge variant="soldout">Sold out for today — back tomorrow</Badge>
          </div>
        ) : canOrder ? (
          <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 14 }}>
            <Stepper value={qty} min={1} max={20} onChange={setQty} />
            <Button variant="primary" size="lg" block onClick={() => onAdd(item, qty)}>
              Add {qty} · {peso(item.price * qty)}
            </Button>
          </div>
        ) : (
          <p style={{ marginTop: 18, fontSize: 14, color: "var(--text-subtle)" }}>Ask your server to order this.</p>
        )}
      </div>
    </Sheet>
  );
}

/* ── Order review sheet ──────────────────────────────────────────── */
function OrderSheet({
  lines,
  total,
  onClose,
  onPlace,
}: {
  lines: (MenuItemType & { qty: number })[];
  total: number;
  onClose: () => void;
  onPlace: () => void;
}) {
  return (
    <Sheet onClose={onClose}>
      <div style={{ padding: "20px 20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 500, color: "var(--text-strong)" }}>Your order</h2>
          <IconButton label="Close" variant="ghost" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginBottom: 12 }}>
          Show this to your server when you&apos;re ready.
        </p>
        <div>
          {lines.map((l) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border-soft)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.img} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-strong)" }}>{l.name}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {peso(l.price)} × {l.qty}
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-strong)" }}>{peso(l.price * l.qty)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 18px" }}>
          <span style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 16 }}>Total</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--text-strong)" }}>{peso(total)}</span>
        </div>
        <Button variant="primary" size="lg" block onClick={onPlace}>
          <BellRing /> Call server to order
        </Button>
      </div>
    </Sheet>
  );
}

/* ── Toast ───────────────────────────────────────────────────────── */
function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 96, zIndex: 60, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div className="mesa-anim-rise" style={{ background: "var(--surface-inverse)", color: "var(--text-inverse)", padding: "12px 18px", borderRadius: 999, fontSize: 14, fontWeight: 500, boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", gap: 8 }}>
        <CheckCircle2 size={16} style={{ color: "var(--sage-300)" }} /> {msg}
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { X, ArrowRight, CheckCircle2, Send, Clock, ChefHat, BellRing, Check } from "lucide-react";
import { Badge, Button, IconButton, Input, Stepper } from "@/components/ds";
import { DEFAULT_BRAND, capsFor, clampBrand, clampTheme, resolveOrderMode, normalizeTags, type BrandKit, type Cafe, type MenuItem as MenuItemType, type MenuTag, type OptionGroup, type PlanId, type ThemeKey } from "@/lib/data";
import { brandVars, surfaceVars } from "@/lib/brand";
import { readStudioOverrides } from "@/lib/studio-store";
import { placeOrder, useMyOrders, type Order } from "@/lib/orders-store";
import { ThemeLayout, themeVars, HAS_TAB_BAR, TabBar } from "./menu-themes";

const peso = (n: number) => `₱${n}`;

// "Contains X" allergen presets are info-only, not offered as inclusion filters.
const ALLERGEN_TAG_IDS = new Set(["nuts", "dairy", "gluten"]);

/* ── Cart / option helpers ───────────────────────────────────────────
 * Choice ids are unique within an item, so a flat list of chosen ids is
 * enough to key, price, and label a configured line. */
type CartEntry = { itemId: string; qty: number; choiceIds: string[] };
type CartLineView = MenuItemType & { key: string; qty: number; choiceIds: string[]; unitPrice: number; optionLabels: string[] };

/** Stable cart key: the item id, plus its sorted choice ids when configured. */
const cartKey = (itemId: string, choiceIds: string[]) =>
  choiceIds.length ? `${itemId}#${[...choiceIds].sort().join(",")}` : itemId;

/** Base price plus every chosen option's delta. */
function unitPrice(item: MenuItemType, choiceIds: string[]): number {
  let p = item.price;
  for (const g of item.options ?? []) for (const c of g.choices) if (choiceIds.includes(c.id)) p += c.priceDelta ?? 0;
  return p;
}

/** Human labels for the chosen options (add-ons prefixed with "+"). */
function choiceLabels(item: MenuItemType, choiceIds: string[]): string[] {
  const out: string[] = [];
  for (const g of item.options ?? []) for (const c of g.choices) if (choiceIds.includes(c.id)) out.push(g.multi ? `+${c.label}` : c.label);
  return out;
}

/** Pre-select the first choice of each required single-select group. */
function defaultChoiceIds(item: MenuItemType): string[] {
  const ids: string[] = [];
  for (const g of item.options ?? []) if (g.required && !g.multi && g.choices[0]) ids.push(g.choices[0].id);
  return ids;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false // server snapshot: assume motion allowed
  );
}

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
      if (o.items) setMenu(o.items.map(normalizeTags));
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
  const [diet, setDiet] = useState<string[]>([]); // selected dietary filter tag ids
  const toggleDiet = (id: string) => setDiet((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  const [active, setActive] = useState<MenuItemType | null>(null);
  const [showOrder, setShowOrder] = useState(false);
  const [order, setOrder] = useState<Record<string, CartEntry>>({});
  const [table, setTable] = useState("");
  const [toast, setToast] = useState("");

  // Per-table QR codes carry the table number as ?t= (or ?table=); prefill it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const t = p.get("t") || p.get("table");
    if (t) setTable(t.slice(0, 12));
  }, []);

  // The guest's own placed orders, live as the owner advances them on the board.
  const [myOrders, myOrdersApi] = useMyOrders(cafe0.slug);
  const [statusOrderId, setStatusOrderId] = useState<string | null>(null);
  const [summaryOrder, setSummaryOrder] = useState<Order | null>(null);
  const liveOrder = myOrders[0] || null;
  const statusOrder = statusOrderId ? myOrders.find((o) => o.id === statusOrderId) || null : null;

  // Toast when one of my orders changes status (owner started / readied it).
  const seenStatus = useRef<Record<string, string>>({});
  useEffect(() => {
    myOrders.forEach((o) => {
      const prev = seenStatus.current[o.id];
      if (prev && prev !== o.status) {
        if (o.status === "ready") setToast(`Order ${o.code} is ready! 🎉`);
        else if (o.status === "preparing") setToast(`Order ${o.code} — now preparing`);
        else if (o.status === "cancelled") setToast(`Order ${o.code} was cancelled`);
      }
      seenStatus.current[o.id] = o.status;
    });
  }, [myOrders]);

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
    .map(([key, e]) => {
      const item = menu.find((m) => m.id === e.itemId);
      if (!item) return null;
      const up = unitPrice(item, e.choiceIds);
      return { ...item, key, qty: e.qty, choiceIds: e.choiceIds, unitPrice: up, optionLabels: choiceLabels(item, e.choiceIds) };
    })
    .filter(Boolean) as CartLineView[];
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);

  // `replace` swaps the line's quantity (the "Update" path); otherwise it stacks.
  const addToOrder = (item: MenuItemType, qty: number, choiceIds: string[], replace = false) => {
    const key = cartKey(item.id, choiceIds);
    setOrder((o) => ({ ...o, [key]: { itemId: item.id, qty: replace ? qty : (o[key]?.qty || 0) + qty, choiceIds } }));
    setActive(null);
    setToast(`${replace ? "Updated" : "Added"} ${item.name}`);
  };

  // Tags offered as diet filters: those used on the menu, minus the "contains"
  // allergen presets (filtering is positive/inclusion — e.g. show Vegan, Keto).
  const dietFilters = useMemo(() => {
    const out: MenuTag[] = [];
    const seen = new Set<string>();
    menu.forEach((m) => (m.tags ?? []).forEach((t) => {
      if (!ALLERGEN_TAG_IDS.has(t.id) && !seen.has(t.id)) { seen.add(t.id); out.push(t); }
    }));
    return out;
  }, [menu]);

  const groups = useMemo(() => {
    const pool = diet.length
      ? menu.filter((m) => diet.every((id) => (m.tags ?? []).some((t) => t.id === id)))
      : menu;
    let g: { c: string; items: MenuItemType[] }[];
    if (query) {
      const hits = pool.filter((m) => m.name.toLowerCase().includes(query) || m.desc.toLowerCase().includes(query));
      g = [{ c: hits.length ? "Results" : "No matches", items: hits }];
    } else if (cat === "All") {
      g = categories.filter((c) => c !== "All").map((c) => ({ c, items: pool.filter((m) => m.cat === c) })).filter((x) => x.items.length);
    } else {
      g = [{ c: cat, items: pool.filter((m) => m.cat === cat) }];
    }
    if (!g.length) g = [{ c: "No matches", items: [] }];
    return g;
  }, [query, cat, menu, categories, diet]);

  // Enforce the plan's branding entitlements on what diners actually see, so a
  // downgrade can't leak a higher tier's theme/colour/background/shape.
  const effBrand = clampBrand(brand, caps);
  const effTheme = clampTheme(theme, caps);

  const showRails = cat === "All" && !query && diet.length === 0;
  const hasTabBar = HAS_TAB_BAR.includes(effTheme);
  const filterBar = dietFilters.length > 0
    ? <DietFilterBar tags={dietFilters} selected={diet} onToggle={toggleDiet} />
    : null;
  // Effective order mode folds in the plan, the owner's chosen mode, and the
  // pause switch. "counter" = build a summary to show staff; "kitchen" = send
  // to the live board; "browse" = no ordering.
  const mode = resolveOrderMode(cafe, ordering);
  const acceptOrders = mode !== "browse";
  const counterMode = mode === "counter";
  const trayVisible = acceptOrders && count > 0 && !active && !showOrder;
  const trackerVisible = !!liveOrder && !active && !showOrder && !statusOrder;

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
        filterBar={filterBar}
      />

      {!acceptOrders && (
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-subtle)", padding: "0 20px 8px" }}>
          {cafe.acceptingOrders === false ? "Ordering paused — ask your server to order" : "Browse-only menu · ask your server to order"}
        </p>
      )}

      {/* spacer so the footer clears fixed overlays */}
      <div style={{ height: (hasTabBar ? 70 : 0) + (trayVisible ? 80 : 0) + (trackerVisible ? 76 : 0) }} />

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

      {/* Live order-status tracker (guest watches their order progress) */}
      {trackerVisible && liveOrder && (
        <div className="mesa-anim-rise" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: (hasTabBar ? 84 : 24) + (trayVisible ? 68 : 0), width: "min(416px, calc(100% - 32px))", zIndex: 29 }}>
          <OrderTrackerBar order={liveOrder} onOpen={() => setStatusOrderId(liveOrder.id)} />
        </div>
      )}

      {hasTabBar && <TabBar />}

      {active && (
        <ItemSheet item={active} ordering={acceptOrders} order={order} onClose={() => setActive(null)} onAdd={addToOrder} />
      )}
      {showOrder && (
        <OrderSheet
          lines={lines}
          total={total}
          table={table}
          counter={counterMode}
          onTable={setTable}
          onClose={() => setShowOrder(false)}
          onPlace={(note) => {
            // BACKEND SEAM: this writes to the front-end orders store. Kitchen
            // orders surface on the owner board; counter orders are logged for
            // analytics and shown back to the guest as a summary to present.
            const o = placeOrder(cafe0.slug, {
              // id is the composite cart key so option-variant lines stay distinct.
              lines: lines.map((l) => ({ id: l.key, name: l.name, price: l.unitPrice, qty: l.qty, options: l.optionLabels.length ? l.optionLabels : undefined })),
              total,
              table,
              note,
              channel: counterMode ? "counter" : "kitchen",
            });
            setShowOrder(false);
            setOrder({});
            if (counterMode) {
              setSummaryOrder(o);
            } else {
              myOrdersApi.track(o.id);
              seenStatus.current[o.id] = o.status;
              setToast(`Order ${o.code} sent to the kitchen`);
            }
          }}
        />
      )}
      {summaryOrder && (
        <CounterSummarySheet order={summaryOrder} onClose={() => setSummaryOrder(null)} />
      )}
      {statusOrder && (
        <OrderStatusSheet
          order={statusOrder}
          onClose={() => setStatusOrderId(null)}
          onDismiss={() => { myOrdersApi.dismiss(statusOrder.id); setStatusOrderId(null); }}
        />
      )}
      <Toast msg={toast} />
    </div>
  );
}

/* ── Reusable bottom-sheet shell ─────────────────────────────────────
 * A proper modal dialog: locks background scroll, closes on Escape / scrim /
 * swipe-down (from the grab handle), traps focus, and restores it on close.
 * Children render inside a scroll area; a child with `position: sticky` pins
 * to the bottom (the item sheet's action bar relies on this). */
function Sheet({ children, onClose, labelledBy }: { children: React.ReactNode; onClose: () => void; labelledBy?: string }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);

  // Lock background scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Escape to close, focus trap, and focus restore.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () =>
      panel
        ? Array.from(panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(
            (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
          )
        : [];
    (focusables()[0] ?? panel)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("keydown", onKey, true); prevFocus?.focus?.(); };
  }, [onClose]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (reduce) return;
    dragStart.current = e.clientY;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart.current == null) return;
    setDrag(Math.max(0, e.clientY - dragStart.current));
  };
  const onPointerEnd = () => {
    if (dragStart.current == null) return;
    dragStart.current = null;
    setDragging(false);
    setDrag((d) => { if (d > 120) onClose(); return 0; });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} className="mesa-anim-fade" style={{ position: "absolute", inset: 0, background: "rgba(31,20,14,0.45)" }} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="mesa-anim-sheet"
        style={{
          position: "relative",
          width: "min(448px, 100%)",
          margin: "0 auto",
          background: "var(--surface-card)",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          overflow: "hidden",
          maxHeight: "86vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -8px 40px rgba(31,20,14,0.25)",
          outline: "none",
          transform: drag ? `translateY(${drag}px)` : undefined,
          transition: dragging ? "none" : "transform var(--dur-base) var(--ease-out)",
        }}
      >
        {/* Grab handle — also the swipe-to-dismiss region. Kept narrow so the
            corner close buttons stay clickable. */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 120, height: 28, zIndex: 3, display: "grid", placeItems: "center", cursor: "grab", touchAction: "none" }}
        >
          <span style={{ marginTop: 8, width: 36, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.85)", boxShadow: "0 0 0 1px rgba(31,20,14,0.16)" }} />
        </div>
        <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}

/* ── Item detail bottom sheet ──────────────────────────────────────
 * Hero image → scrollable body (price, description, customization) → a
 * sticky action bar that stays in reach while the body scrolls. */
function OptionGroupBlock({
  group,
  chosen,
  onToggle,
}: {
  group: OptionGroup;
  chosen: string[];
  onToggle: (group: OptionGroup, choiceId: string) => void;
}) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 14.5 }}>{group.label}</span>
        <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-subtle)" }}>
          {group.multi ? "Optional" : "Required"}
        </span>
      </div>
      {group.multi ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {group.choices.map((c) => {
            const on = chosen.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(group, c.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", border: "1.5px solid", borderColor: on ? "var(--brand)" : "var(--border-default)", background: on ? "var(--brand-soft)" : "var(--surface-card)", borderRadius: "var(--radius-md)", padding: "11px 14px", cursor: "pointer", fontFamily: "var(--font-sans)" }}
              >
                <span style={{ width: 20, height: 20, borderRadius: 6, border: "1.5px solid", borderColor: on ? "var(--brand)" : "var(--border-default)", background: on ? "var(--brand)" : "transparent", color: "var(--brand-on)", display: "grid", placeItems: "center", flex: "none" }}>
                  {on && <Check size={14} />}
                </span>
                <span style={{ flex: 1, color: "var(--text-strong)", fontSize: 14.5 }}>{c.label}</span>
                {c.priceDelta ? <span style={{ color: "var(--text-muted)", fontSize: 13.5 }}>+{peso(c.priceDelta)}</span> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {group.choices.map((c) => {
            const on = chosen.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(group, c.id)}
                style={{ border: "1.5px solid", borderColor: on ? "var(--brand)" : "var(--border-default)", background: on ? "var(--brand)" : "var(--surface-card)", color: on ? "var(--brand-on)" : "var(--text-strong)", borderRadius: 999, padding: "9px 15px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
              >
                {c.label}{c.priceDelta ? ` +${peso(c.priceDelta)}` : ""}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ItemSheet({
  item,
  ordering,
  order,
  onClose,
  onAdd,
}: {
  item: MenuItemType;
  ordering: boolean;
  order: Record<string, CartEntry>;
  onClose: () => void;
  onAdd: (item: MenuItemType, qty: number, choiceIds: string[], replace?: boolean) => void;
}) {
  const titleId = `item-title-${item.id}`;
  const [choiceIds, setChoiceIds] = useState<string[]>(() => defaultChoiceIds(item));
  const key = cartKey(item.id, choiceIds);
  const existingQty = order[key]?.qty ?? 0;
  const [qty, setQty] = useState(existingQty > 0 ? existingQty : 1);
  // When the configuration changes to one already in the cart, mirror its qty
  // (so the stepper + "Update" CTA reflect what's there); otherwise reset to 1.
  // Adjusting state during render on a key change — React's recommended
  // alternative to an effect for this (no extra paint, no cascading render).
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setQty(existingQty > 0 ? existingQty : 1);
  }

  const inThisConfig = existingQty > 0;
  const totalForItem = Object.values(order).filter((e) => e.itemId === item.id).reduce((s, e) => s + e.qty, 0);
  const up = unitPrice(item, choiceIds);
  const canOrder = ordering && !item.soldOut;

  const toggle = (group: OptionGroup, choiceId: string) => {
    setChoiceIds((cur) => {
      if (group.multi) return cur.includes(choiceId) ? cur.filter((x) => x !== choiceId) : [...cur, choiceId];
      const groupIds = group.choices.map((c) => c.id);
      return [...cur.filter((x) => !groupIds.includes(x)), choiceId]; // single-select: replace
    });
  };

  return (
    <Sheet onClose={onClose} labelledBy={titleId}>
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.img} alt="" style={{ width: "100%", height: 232, objectFit: "cover", display: "block", filter: item.soldOut ? "grayscale(0.9)" : "none" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(31,20,14,0.28) 0%, rgba(31,20,14,0) 34%)" }} />
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <IconButton label="Close" variant="soft" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        {item.badge && !item.soldOut && (
          <div style={{ position: "absolute", top: 14, left: 16 }}>
            <Badge variant="highlight">{item.badge}</Badge>
          </div>
        )}
      </div>

      <div style={{ padding: "18px 20px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <h2 id={titleId} style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, color: "var(--text-strong)" }}>{item.name}</h2>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text-strong)", whiteSpace: "nowrap" }}>{peso(item.price)}</span>
        </div>
        {totalForItem > 0 && (
          <div style={{ marginTop: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--brand)", background: "var(--brand-soft)", padding: "4px 10px", borderRadius: 999 }}>
              <Check size={13} /> {totalForItem} in your order
            </span>
          </div>
        )}
        <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.5, marginTop: 10 }}>{item.desc}</p>

        {item.tags && item.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {item.tags.map((t) => (
              <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: "var(--text-body)", background: "var(--surface-muted)", border: "1px solid var(--border-soft)", padding: "4px 10px", borderRadius: 999 }}>
                {t.emoji && <span aria-hidden>{t.emoji}</span>} {t.label}
              </span>
            ))}
          </div>
        )}

        {canOrder && item.options?.map((g) => (
          <OptionGroupBlock key={g.id} group={g} chosen={choiceIds} onToggle={toggle} />
        ))}

        {item.soldOut ? (
          <div style={{ marginTop: 20 }}>
            <Badge variant="soldout">Sold out for today — back tomorrow</Badge>
          </div>
        ) : !canOrder ? (
          <p style={{ marginTop: 18, fontSize: 14, color: "var(--text-subtle)" }}>Ask your server to order this.</p>
        ) : null}
      </div>

      {canOrder && (
        <div style={{ position: "sticky", bottom: 0, background: "var(--surface-card)", borderTop: "1px solid var(--border-soft)", padding: "12px 20px calc(16px + env(safe-area-inset-bottom))", display: "flex", alignItems: "center", gap: 14 }}>
          <Stepper value={qty} min={1} max={20} onChange={setQty} />
          <Button variant="primary" size="lg" block onClick={() => onAdd(item, qty, choiceIds, inThisConfig)}>
            {inThisConfig ? `Update · ${peso(up * qty)}` : `Add ${qty} · ${peso(up * qty)}`}
          </Button>
        </div>
      )}
    </Sheet>
  );
}

/* ── Order review sheet ──────────────────────────────────────────── */
function OrderSheet({
  lines,
  total,
  table,
  counter,
  onTable,
  onClose,
  onPlace,
}: {
  lines: CartLineView[];
  total: number;
  table: string;
  counter: boolean;
  onTable: (v: string) => void;
  onClose: () => void;
  onPlace: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <Sheet onClose={onClose} labelledBy="order-sheet-title">
      <div style={{ padding: "20px 20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 id="order-sheet-title" style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 500, color: "var(--text-strong)" }}>Your order</h2>
          <IconButton label="Close" variant="ghost" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginBottom: 12 }}>
          {counter
            ? "Review your order — next you'll get a summary to show at the counter."
            : "Send it straight to the kitchen — your server will bring it over."}
        </p>
        <div>
          {lines.map((l) => (
            <div key={l.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border-soft)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.img} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover", flex: "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-strong)" }}>{l.name}</div>
                {l.optionLabels.length > 0 && (
                  <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 1, lineHeight: 1.35 }}>{l.optionLabels.join(" · ")}</div>
                )}
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 1 }}>
                  {peso(l.unitPrice)} × {l.qty}
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-strong)" }}>{peso(l.unitPrice * l.qty)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          {!counter && (
            <div style={{ width: 96, flex: "none" }}>
              <Input label="Table" value={table} onChange={(e) => onTable(e.target.value.slice(0, 12))} placeholder="e.g. 5" inputMode="numeric" />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value.slice(0, 120))} placeholder="No sugar, extra hot…" />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 18px" }}>
          <span style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 16 }}>Total</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--text-strong)" }}>{peso(total)}</span>
        </div>
        <Button variant="primary" size="lg" block onClick={() => onPlace(note)}>
          <Send /> {counter ? "Create order summary" : "Place order"}
        </Button>
      </div>
    </Sheet>
  );
}

/* ── Counter-order summary (show this to staff) ──────────────────────
 * For cafés that run their own POS: the guest builds the order, gets this
 * summary to present at the counter. No live status — the café keys it in. */
function CounterSummarySheet({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} labelledBy="summary-sheet-title">
      <div style={{ padding: "22px 20px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span style={{ display: "inline-grid", placeItems: "center", width: 48, height: 48, borderRadius: 14, background: "color-mix(in oklab, var(--brand) 14%, transparent)", color: "var(--brand)", marginBottom: 10 }}>
            <CheckCircle2 size={26} />
          </span>
          <h2 id="summary-sheet-title" style={{ fontFamily: "var(--font-display)", fontSize: 23, fontWeight: 500, color: "var(--text-strong)" }}>Show this at the counter</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginTop: 4 }}>Screenshot it or show this screen — staff will key it in.</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: "16px", background: "var(--surface-muted)", borderRadius: "var(--radius-md)", marginBottom: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-subtle)" }}>Order</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 600, color: "var(--text-strong)", lineHeight: 1.05, letterSpacing: "0.02em" }}>#{order.code}</div>
          </div>
          {order.table && (
            <>
              <span style={{ width: 1, alignSelf: "stretch", background: "var(--border-soft)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-subtle)" }}>Table</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 600, color: "var(--text-strong)", lineHeight: 1.05 }}>{order.table}</div>
              </div>
            </>
          )}
        </div>

        <div style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)", padding: "4px 14px" }}>
          {order.lines.map((l) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border-soft)" }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>{l.qty}×</span> {l.name}
                {l.options && l.options.length > 0 && (
                  <span style={{ display: "block", fontSize: 12, color: "var(--text-subtle)", marginLeft: 22, lineHeight: 1.35 }}>{l.options.join(" · ")}</span>
                )}
              </span>
              <span style={{ color: "var(--text-muted)", flex: "none" }}>{peso(l.price * l.qty)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
            <span style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 16 }}>Total</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--text-strong)" }}>{peso(order.total)}</span>
          </div>
        </div>

        {order.note && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>Note: “{order.note}”</p>
        )}

        <Button variant="primary" size="lg" block style={{ marginTop: 18 }} onClick={onClose}>Done</Button>
      </div>
    </Sheet>
  );
}

/* ── Live order-status tracker ───────────────────────────────────── */
const STAGE_ORDER = ["new", "preparing", "ready"] as const;

const STATUS_META: Record<Order["status"], { label: string; msg: string; icon: typeof Clock; tint: string; fg: string }> = {
  new: { label: "Order placed", msg: "We've sent your order to the kitchen.", icon: Clock, tint: "color-mix(in oklab, var(--brand) 14%, transparent)", fg: "var(--brand)" },
  preparing: { label: "Being prepared", msg: "Your order is being prepared.", icon: ChefHat, tint: "var(--honey-50)", fg: "var(--honey-700)" },
  ready: { label: "Ready!", msg: "Your order is ready — your server will bring it over.", icon: BellRing, tint: "var(--sage-50)", fg: "var(--sage-600)" },
  completed: { label: "Completed", msg: "Hope you enjoyed it! 🙏", icon: CheckCircle2, tint: "var(--sage-50)", fg: "var(--sage-600)" },
  cancelled: { label: "Cancelled", msg: "This order was cancelled — please ask your server.", icon: X, tint: "var(--surface-muted)", fg: "var(--text-muted)" },
};

function ProgressDots({ active }: { active: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: i <= active ? 16 : 8, height: 4, borderRadius: 999, background: i <= active ? "var(--brand)" : "var(--border-soft)", transition: "width .2s" }} />
      ))}
    </span>
  );
}

function OrderTrackerBar({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const st = STATUS_META[order.status];
  const idx = (STAGE_ORDER as readonly string[]).indexOf(order.status);
  return (
    <button
      onClick={onOpen}
      style={{ width: "100%", border: "1px solid var(--border-soft)", cursor: "pointer", textAlign: "left", background: "var(--surface-card)", borderRadius: 18, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--shadow-lg)", fontFamily: "var(--font-sans)" }}
    >
      <span style={{ width: 40, height: 40, borderRadius: 12, flex: "none", display: "grid", placeItems: "center", background: st.tint, color: st.fg }}>
        <st.icon size={20} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, color: "var(--text-strong)", fontSize: 14.5 }}>Order #{order.code}</span>
          {order.table && <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>· Table {order.table}</span>}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 5 }}>
          <span style={{ fontSize: 13, color: st.fg, fontWeight: 600 }}>{st.label}</span>
          {idx >= 0 && <ProgressDots active={idx} />}
        </span>
      </span>
      <ArrowRight size={18} style={{ color: "var(--text-subtle)", flex: "none" }} />
    </button>
  );
}

function OrderStatusSheet({ order, onClose, onDismiss }: { order: Order; onClose: () => void; onDismiss: () => void }) {
  const st = STATUS_META[order.status];
  const done = order.status === "ready" || order.status === "completed";
  const cancelled = order.status === "cancelled";
  const idx = order.status === "completed" ? 2 : (STAGE_ORDER as readonly string[]).indexOf(order.status);
  const stages: { label: string; icon: typeof Clock }[] = [
    { label: "Placed", icon: Clock },
    { label: "Preparing", icon: ChefHat },
    { label: "Ready", icon: BellRing },
  ];
  return (
    <Sheet onClose={onClose} labelledBy="status-sheet-title">
      <div style={{ padding: "20px 20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 id="status-sheet-title" style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 500, color: "var(--text-strong)" }}>
            Order #{order.code}
          </h2>
          <IconButton label="Close" variant="ghost" onClick={onClose}><X /></IconButton>
        </div>
        <p style={{ color: st.fg, fontSize: 14, fontWeight: 600, marginBottom: cancelled ? 16 : 22 }}>{st.msg}</p>

        {cancelled ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface-muted)", borderRadius: "var(--radius-md)", padding: "14px 16px", marginBottom: 20 }}>
            <X size={20} style={{ color: "var(--text-muted)" }} />
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>This order is no longer active.</span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 22 }}>
            {stages.map((s, i) => {
              const isDone = i < idx || order.status === "completed";
              const isCur = i === idx && order.status !== "completed";
              return (
                <React.Fragment key={s.label}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flex: "none", width: 76 }}>
                    <span style={{ width: 42, height: 42, borderRadius: 999, display: "grid", placeItems: "center", background: isDone || isCur ? "var(--brand)" : "var(--surface-muted)", color: isDone || isCur ? "var(--brand-on)" : "var(--text-subtle)", boxShadow: isCur ? "0 0 0 4px color-mix(in oklab, var(--brand) 22%, transparent)" : "none" }}>
                      {isDone ? <Check size={19} /> : <s.icon size={19} />}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isDone || isCur ? "var(--text-strong)" : "var(--text-subtle)" }}>{s.label}</span>
                  </div>
                  {i < stages.length - 1 && (
                    <span style={{ flex: 1, height: 3, borderRadius: 999, background: i < idx || order.status === "completed" ? "var(--brand)" : "var(--border-soft)", marginTop: 19 }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 14 }}>
          {order.lines.map((l) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, padding: "4px 0", color: "var(--text-body)" }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>{l.qty}×</span> {l.name}
                {l.options && l.options.length > 0 && (
                  <span style={{ display: "block", fontSize: 12, color: "var(--text-subtle)", marginLeft: 22, lineHeight: 1.35 }}>{l.options.join(" · ")}</span>
                )}
              </span>
              <span style={{ color: "var(--text-muted)", flex: "none" }}>{peso(l.price * l.qty)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>Total{order.table ? ` · Table ${order.table}` : ""}</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--text-strong)" }}>{peso(order.total)}</span>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          {done || cancelled ? (
            <Button variant="primary" size="lg" block onClick={onDismiss}><Check /> Done</Button>
          ) : (
            <Button variant="secondary" size="lg" block onClick={onClose}>Keep browsing</Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/* ── Dietary filter bar (rendered above the menu sections) ────────── */
function DietFilterBar({ tags, selected, onToggle }: { tags: MenuTag[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "16px 0 2px", scrollbarWidth: "none" }} role="group" aria-label="Filter by dietary tag">
      {tags.map((t) => {
        const on = selected.includes(t.id);
        return (
          <button
            key={t.id}
            onClick={() => onToggle(t.id)}
            aria-pressed={on}
            style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 6, border: "1.5px solid", borderColor: on ? "var(--brand)" : "var(--border-default)", background: on ? "var(--brand)" : "var(--surface-card)", color: on ? "var(--brand-on)" : "var(--text-body)", borderRadius: 999, minHeight: 44, padding: "0 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            {t.emoji && <span aria-hidden>{t.emoji}</span>} {t.label}
          </button>
        );
      })}
    </div>
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

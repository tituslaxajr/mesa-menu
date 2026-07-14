"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Utensils,
  Plus,
  X,
  ExternalLink,
  Check,
  Bell,
  BellOff,
  Smartphone,
  Eye,
  EyeOff,
  MessageSquare,
  Sun,
  Boxes,
  AlertTriangle,
  RefreshCw,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { Avatar, Button, IconButton } from "@/components/ds";
import { feedbackMailto } from "@/lib/site";
import { brandVars } from "@/lib/brand";
import { logout } from "@/lib/auth-actions";
import { applyPromosToMenu } from "@/lib/promo-pricing";
import { LivePreview } from "./LivePreview";
import {
  PLANS,
  type Cafe,
  type MenuItem,
  type ThemeKey,
  type BrandKit,
  type Promo,
} from "@/lib/data";
import { getMyThreads } from "@/lib/feedback-actions";
import { Brandmark, NAV_GROUPS, NAV_BY_ID, type TabId } from "./dashboard/shared";
import { StudioProvider, useStudio } from "./dashboard/StudioProvider";
import { FeedbackDrawer } from "./dashboard/FeedbackDrawer";
import { EditDrawer } from "./dashboard/EditDrawer";
import { HomeTab } from "./dashboard/tabs/HomeTab";
import { OrdersTab } from "./dashboard/tabs/OrdersTab";
import { PosTab } from "./dashboard/tabs/PosTab";
import { MenuTab } from "./dashboard/tabs/MenuTab";
import { CategoriesTab } from "./dashboard/tabs/CategoriesTab";
import { AppearanceTab } from "./dashboard/tabs/AppearanceTab";
import { QRTab } from "./dashboard/tabs/QRTab";
import { PromosTab } from "./dashboard/tabs/PromosTab";
import { AnalyticsTab } from "./dashboard/tabs/AnalyticsTab";
import { SubscriptionTab } from "./dashboard/tabs/SubscriptionTab";
import { SettingsTab } from "./dashboard/tabs/SettingsTab";

interface Props {
  cafe: Cafe;
  menu: MenuItem[];
  categories: string[];
  planId: string;
  /** Owner's café uuid — required for DB persistence. */
  cafeId?: string;
  /** Member is owner/manager (may void/refund POS sales). Staff = false. */
  canManage?: boolean;
  /** Saved brand kit / promos from the DB (db mode); fall back to defaults. */
  initialBrand?: BrandKit;
  initialPromos?: Promo[];
  /** "db" persists edits to Supabase (real owner); "local" is the /demo sandbox. */
  persistence?: "db" | "local";
  /** Demo showcase: restrict the nav to the items worth demoing. */
  demo?: boolean;
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
        <LivePreview cafe={cafe} menu={items} categories={categories} theme={theme} brand={brand} plan={cafe.plan} width={300} height={640} />
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
            <LivePreview cafe={cafe} menu={items} categories={categories} theme={theme} brand={brand} plan={cafe.plan} width={300} height={640} />
            <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", maxWidth: 280 }}>{caption}</span>
          </aside>
        </div>
      )}
    </>
  );
}

/** Small "Beta" pill marking this as a beta build. Uses the app brand accent. */
function BetaBadge() {
  return (
    <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brand)", border: "1px solid var(--brand)", borderRadius: 999, padding: "1px 7px", lineHeight: 1.5, flex: "none" }}>
      Beta
    </span>
  );
}

export function DashboardShell(props: Props) {
  return (
    <StudioProvider {...props}>
      <ShellInner />
    </StudioProvider>
  );
}

function ShellInner() {
  const {
    slug,
    planId,
    dbSave,
    saveStatus,
    retrySave,
    items,
    cafe,
    setCafe,
    brand,
    setBrand,
    theme,
    setTheme,
    promos,
    setPromos,
    categories,
    setCategories,
    uploadImage,
    orders,
    ordersApi,
    kitchenOrders,
    newOrders,
    pendingOrders,
    soundOn,
    toggleSound,
    showPreview,
    setShowPreview,
    caps,
    editing,
    setEditing,
    toastMsg,
    toast,
    onSwitchPlan,
    allowedTabs,
    toggle,
    deleteCategory,
    moveItem,
    duplicateItem,
    addItem,
    loadSampleMenu,
    setCategorySoldOut,
    save,
    customTags,
  } = useStudio();

  const [tab, setTab] = useState<TabId>("home");
  const [navOpen, setNavOpen] = useState(false); // mobile nav drawer
  const [previewOpen, setPreviewOpen] = useState(false); // narrow-screen live-preview drawer
  const [feedbackOpen, setFeedbackOpen] = useState(false); // in-app Messages drawer (café ↔ Mesa)
  const [feedbackUnread, setFeedbackUnread] = useState(0);

  // Preview menu with live promo discounts applied (render-time evaluation is
  // enough here — the pane re-renders on every edit).
  const previewMenu = useMemo(() => applyPromosToMenu(items, promos), [items, promos]);

  // Lock background scroll while the mobile nav drawer is open.
  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [navOpen]);

  // Seed the "Messages" unread badge on load (db mode only — the /demo sandbox
  // has no session, so the feedback server actions would 401/redirect).
  useEffect(() => {
    if (!dbSave) return;
    let active = true;
    getMyThreads()
      .then((rows) => { if (active) setFeedbackUnread(rows.filter((t) => t.unread).length); })
      .catch(() => {});
    return () => { active = false; };
  }, [dbSave]);

  const soldOut = items.filter((i) => i.soldOut).length;
  const tabMeta: Record<TabId, { t: string; s: string }> = {
    home: { t: `Good morning, ${cafe.name}.`, s: "Here's what's happening with your menu today." },
    orders: { t: "Orders", s: newOrders ? `${newOrders} new · live from your tables` : "Live orders from your tables." },
    pos: { t: "Register", s: "Ring up a sale and take payment at the counter." },
    menu: { t: "Menu", s: `${items.length} items · ${soldOut} sold out today` },
    categories: { t: "Menu sections", s: "Organise your menu into sections." },
    appearance: { t: "Look studio", s: "The look of your menu — theme, logo, colours and fonts." },
    qr: { t: "Print shop", s: "Print it and put it on every table." },
    promos: { t: "Promos library", s: "Highlight specials and limited offers." },
    analytics: { t: "The Books", s: "How your café is doing." },
    subscription: { t: "Plan", s: "Your Mesa plan and billing." },
    settings: { t: "Café settings", s: "Your café profile and menu display." },
  };
  const meta = tabMeta[tab];

  // One renderer for every tab in the dashboard.
  const renderTab = (t: TabId): React.ReactNode => {
    switch (t) {
      case "home": return <HomeTab items={items} cafe={cafe} theme={theme} brand={brand} orders={orders} setTab={setTab} />;
      case "orders": return <OrdersTab orders={kitchenOrders} api={ordersApi} items={items} slug={slug} />;
      case "pos": return <PosTab />;
      case "menu": return <MenuTab items={items} categories={categories} onMove={moveItem} onDuplicate={duplicateItem} onToggle={toggle} onCategorySoldOut={setCategorySoldOut} onAdd={addItem} onEdit={setEditing} onLoadSample={loadSampleMenu} />;
      case "categories": return <CategoriesTab items={items} categories={categories} setCategories={setCategories} onDelete={deleteCategory} toast={toast} />;
      case "appearance": return <AppearanceTab theme={theme} setTheme={setTheme} brand={brand} setBrand={setBrand} cafe={cafe} setCafe={setCafe} items={items} categories={categories} caps={caps} plan={cafe.plan} uploadImage={uploadImage} />;
      case "qr": return <QRTab cafe={cafe} brand={brand} caps={caps} toast={toast} />;
      case "promos": return <PromosTab promos={promos} setPromos={setPromos} categories={categories} items={items} toast={toast} />;
      case "analytics": return <AnalyticsTab orders={orders} cafeName={cafe.name} />;
      case "subscription": return <SubscriptionTab currentId={planId} onSwitch={onSwitchPlan} />;
      case "settings": return <SettingsTab cafe={cafe} setCafe={setCafe} toast={toast} showPreview={showPreview} onTogglePreview={setShowPreview} />;
    }
  };

  const ordersSurfaceOn = tab === "orders";
  const menuSurfaceOn = tab === "menu";

  // Sidebar / drawer nav — the classic tabs grouped into labelled sections and
  // filtered to the plan's allowed tabs. Groups with nothing visible are hidden.
  const navItems = (onPick: () => void) =>
    NAV_GROUPS.map((group, gi) => {
      const ids = group.items.filter((id) => allowedTabs.includes(id));
      if (ids.length === 0) return null;
      return (
        <div key={group.label} style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: gi === 0 ? 0 : 14 }}>
          <div style={{ padding: "0 10px 4px", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-subtle)" }}>{group.label}</div>
          {ids.map((id) => {
            const n = NAV_BY_ID[id];
            const on = tab === id;
            const badge = id === "orders" ? newOrders : id === "pos" ? pendingOrders.length : 0;
            return (
              <button key={id} onClick={() => { setTab(id); onPick(); }} style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 44, padding: "11px 14px", borderRadius: "var(--radius-md)", border: 0, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14.5, fontWeight: 600, textAlign: "left", background: on ? "var(--brand)" : "transparent", color: on ? "var(--brand-on)" : "var(--text-body)" }}>
                <n.icon size={18} /> {n.label}
                {badge > 0 && (
                  <span style={{ marginLeft: "auto", minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, background: on ? "var(--brand-on)" : "var(--brand)", color: on ? "var(--brand)" : "var(--brand-on)" }}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>
      );
    });

  // Feedback entry — real owners get the in-app Messages drawer (with an unread
  // badge); the /demo sandbox (no session) keeps the plain mailto link.
  const feedbackEntry = (onPick: () => void, extra: React.CSSProperties) => {
    const base: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 9, padding: "11px 14px", borderRadius: "var(--radius-md)", color: "var(--text-body)", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-sans)", textDecoration: "none", ...extra };
    if (!dbSave) {
      return <a href={feedbackMailto} style={base}><MessageSquare size={18} /> Send feedback</a>;
    }
    return (
      <button onClick={() => { onPick(); setFeedbackOpen(true); }} style={{ ...base, background: "transparent", border: 0, cursor: "pointer", width: "100%", textAlign: "left" }}>
        <MessageSquare size={18} /> Messages
        {feedbackUnread > 0 && (
          <span style={{ marginLeft: "auto", minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, background: "var(--brand)", color: "var(--brand-on)" }}>{feedbackUnread}</span>
        )}
      </button>
    );
  };

  // Log out — real owner sessions only (the /demo sandbox has no session, so the
  // sign-out server action would have nothing to clear).
  const logoutEntry = (extra: React.CSSProperties) => {
    if (!dbSave) return null;
    return (
      <form action={logout} style={{ display: "block", ...extra }}>
        <button type="submit" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "11px 14px", borderRadius: "var(--radius-md)", color: "var(--text-body)", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-sans)", background: "transparent", border: 0, cursor: "pointer", width: "100%", textAlign: "left" }}>
          <LogOut size={18} /> Log out
        </button>
      </form>
    );
  };

  return (
    <div className="mesa-dayroot" style={{ display: "flex", minHeight: "100dvh", ...(brandVars(brand) as React.CSSProperties) }}>
      {/* Sidebar (desktop) */}
      <aside className="mesa-dash-sidebar" style={{ width: 236, flex: "none", background: "var(--surface-card)", borderRight: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", padding: "20px 14px", position: "sticky", top: 0, height: "100dvh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 20px" }}>
          <Brandmark logo={brand.logo} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cafe.name}</span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {navItems(() => {})}
        </nav>
        {feedbackEntry(() => {}, { marginTop: "auto" })}
        {logoutEntry({})}
        <div style={{ paddingTop: 14, borderTop: "1px solid var(--border-soft)", display: "flex", alignItems: "center", gap: 11 }}>
          {brand.logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={brand.logo} alt="" style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover" }} />
            : <Avatar name={cafe.name} size="sm" />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cafe.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 7 }}>{PLANS.find((p) => p.id === planId)?.name} plan <BetaBadge /></div>
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
            {feedbackEntry(() => setNavOpen(false), { marginTop: "auto" })}
            {logoutEntry({})}
            <div style={{ paddingTop: 14, borderTop: "1px solid var(--border-soft)", fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 7 }}>
              {PLANS.find((p) => p.id === planId)?.name} plan <BetaBadge />
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
          <BetaBadge />
          <Button as="a" href={`/m/${cafe.slug}`} target="_blank" variant="ghost" size="md" aria-label="View live menu"><ExternalLink /></Button>
        </div>

        <div className="mesa-dash-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 28px", borderBottom: "1px solid var(--border-soft)", background: "color-mix(in oklab, var(--day-bg, var(--surface-page)) 82%, transparent)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 6 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, color: "var(--text-strong)", lineHeight: 1.1 }}>{meta.t}</h1>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 2 }}>{meta.s}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
            {ordersSurfaceOn && (
              <Button variant={soundOn ? "secondary" : "ghost"} onClick={toggleSound} aria-pressed={soundOn} title={soundOn ? "New-order chime is on" : "New-order chime is off"}>
                {soundOn ? <Bell /> : <BellOff />} {soundOn ? "Alerts on" : "Alerts off"}
              </Button>
            )}
            {menuSurfaceOn && (
              <Button variant="secondary" onClick={addItem}>
                <Plus /> Add item
              </Button>
            )}
            {dbSave && (saveStatus === "saving" || saveStatus === "saved") && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, flex: "none", background: saveStatus === "saving" ? "var(--brand)" : "var(--sage-400, #6E8B5B)" }} />
                {saveStatus === "saving" ? "Saving…" : "Saved"}
              </span>
            )}
            {showPreview && (
              <span className="mesa-dash-preview-toggle">
                <Button variant="secondary" onClick={() => setPreviewOpen(true)}><Smartphone /> Preview</Button>
              </span>
            )}
            {/* Wide screens: one-click show/hide of the persistent preview column. */}
            <span className="mesa-dash-preview-switch">
              <Button variant="ghost" onClick={() => setShowPreview(!showPreview)} title={showPreview ? "Hide live preview" : "Show live preview"}>
                {showPreview ? <EyeOff /> : <Eye />} {showPreview ? "Hide preview" : "Show preview"}
              </Button>
            </span>
            <Button as="a" href={`/m/${cafe.slug}`} target="_blank" variant="primary"><ExternalLink /> View live menu</Button>
          </div>
        </div>

        {dbSave && saveStatus === "error" && (
          <div
            role="alert"
            style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "0", padding: "12px 28px", background: "var(--soldout-soft, #F6E4DE)", borderBottom: "1px solid var(--soldout, #b42318)", color: "var(--text-strong)" }}
          >
            <AlertTriangle size={18} style={{ color: "var(--soldout, #b42318)", flex: "none" }} />
            <span style={{ flex: 1, minWidth: 200, fontSize: 13.5, fontWeight: 600 }}>
              Your last change didn’t save — the live menu on your tables may be out of date.
            </span>
            <Button variant="primary" size="sm" onClick={() => void retrySave()}>
              <RefreshCw /> Retry save
            </Button>
          </div>
        )}

        {renderTab(tab)}
      </div>

      {/* Live guest-menu preview — right column on wide screens, drawer on narrow.
          Promo-applied menu so a live deal shows its struck-through price here too.
          Owner can hide it from Settings for more editing space. */}
      {showPreview && (
        <PreviewPane open={previewOpen} onClose={() => setPreviewOpen(false)} cafe={cafe} items={previewMenu} categories={categories} theme={theme} brand={brand} />
      )}

      {/* In-app Messages drawer — the café side of the café ↔ Mesa conversation */}
      {dbSave && feedbackOpen && (
        <FeedbackDrawer onClose={() => setFeedbackOpen(false)} onUnreadChange={setFeedbackUnread} />
      )}

      {/* Mobile bottom tab bar — fast access to the daily-use screens */}
      <nav className="mesa-dash-bottombar" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 8, background: "var(--surface-card)", borderTop: "1px solid var(--border-soft)", paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "0 -2px 16px rgba(31,20,14,0.06)" }}>
        {([{ id: "home", label: "Home", icon: Sun }, { id: "menu", label: "Menu", icon: Utensils }] as { id: TabId; label: string; icon: LucideIcon }[]).map((item) => {
          const on = tab === item.id;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} style={{ flex: 1, border: 0, background: "transparent", cursor: "pointer", padding: "8px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? "var(--brand)" : "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
              <item.icon size={21} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>{item.label}</span>
            </button>
          );
        })}
        <button onClick={() => setNavOpen(true)} style={{ flex: 1, border: 0, background: "transparent", cursor: "pointer", padding: "8px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: !["home", "menu"].includes(tab) ? "var(--brand)" : "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
          <Boxes size={21} />
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

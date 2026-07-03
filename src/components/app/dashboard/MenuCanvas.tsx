"use client";
// The Menu place — edit what your guests see. The café's real theme renders
// full-bleed (the same ThemeLayout the live menu and preview use), and
// tapping any item opens an owner action sheet instead of the diner detail:
// edit, sold out, move, duplicate. Autosave makes every change live, so the
// tagline is literal: you're editing the real menu. The old row manager
// stays one toggle away as the bulk-work power tool.
import React, { useMemo, useState } from "react";
import { Pencil, Copy, ChevronUp, ChevronDown, X, Smartphone, List as ListIcon, Palette, LayoutList } from "lucide-react";
import { Button, IconButton, Switch, Badge } from "@/components/ds";
import { useLocalStore } from "@/lib/useLocalStore";
import { ThemeLayout, themeVars } from "../menu-themes";
import { brandVars, surfaceVars } from "@/lib/brand";
import { capsFor, clampBrand, clampTheme, type MenuItem } from "@/lib/data";
import { useStudio } from "./StudioProvider";
import { MenuTab } from "./tabs/MenuTab";
import { PLACEHOLDER_IMG, type TabId } from "./shared";

/* ── owner action sheet (replaces the diner detail on tap) ─────────── */
function Action({ icon: Icon, label, onClick }: { icon: typeof Pencil; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "13px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-soft)", background: "var(--surface-card)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14.5, fontWeight: 600, color: "var(--text-strong)", textAlign: "left" }}>
      <Icon size={18} style={{ color: "var(--brand)", flex: "none" }} /> {label}
    </button>
  );
}

function OwnerItemSheet({ itemId, onClose, onGoEdit }: { itemId: string; onClose: () => void; onGoEdit: (m: MenuItem) => void }) {
  const { items, toggle, moveItem, duplicateItem, toast } = useStudio();
  const item = items.find((i) => i.id === itemId);
  if (!item) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 58, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div className="mesa-anim-fade" onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(31,20,14,0.45)" }} />
      <div className="mesa-anim-sheet" style={{ position: "relative", background: "var(--surface-page)", borderRadius: "22px 22px 0 0", padding: "16px 16px calc(20px + env(safe-area-inset-bottom))", maxWidth: 560, width: "100%", margin: "0 auto", boxShadow: "0 -12px 48px rgba(31,20,14,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.img || PLACEHOLDER_IMG} alt="" style={{ width: 54, height: 54, borderRadius: 12, objectFit: "cover", flex: "none", opacity: item.soldOut ? 0.5 : 1 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
              ₱{item.price} · {item.cat}
              {item.soldOut && <Badge variant="neutral">Sold out</Badge>}
            </div>
          </div>
          <IconButton label="Close" variant="ghost" onClick={onClose}><X /></IconButton>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-soft)", background: "var(--surface-card)" }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-strong)", fontFamily: "var(--font-sans)" }}>Sold out today</span>
            <Switch checked={!!item.soldOut} tone="brand" onChange={() => { toggle(item.id); toast(item.soldOut ? `${item.name} is back` : `${item.name} marked sold out`); }} label="" />
          </div>
          <Action icon={Pencil} label="Edit details" onClick={() => { onGoEdit(item); onClose(); }} />
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><Action icon={ChevronUp} label="Move up" onClick={() => moveItem(item.id, -1)} /></div>
            <div style={{ flex: 1 }}><Action icon={ChevronDown} label="Move down" onClick={() => moveItem(item.id, 1)} /></div>
          </div>
          <Action icon={Copy} label="Duplicate" onClick={() => { duplicateItem(item.id); onClose(); }} />
        </div>
      </div>
    </div>
  );
}

/* ── the Menu place ─────────────────────────────────────────────────── */
export function MenuPlace({ onGo }: { onGo: (place: "backroom", tab: TabId) => void }) {
  const {
    items, categories, cafe, theme: theme0, brand: brand0,
    setEditing, toggle, moveItem, duplicateItem, addItem, loadSampleMenu, setCategorySoldOut,
  } = useStudio();
  const [view, setView] = useLocalStore<"canvas" | "list">("mesa.flags.menuView", "canvas");
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [sheetItem, setSheetItem] = useState<string | null>(null);

  // Same plan-clamping as the live menu, so the canvas never shows a look the
  // café's tier can't actually publish.
  const caps = capsFor(cafe.plan);
  const brand = clampBrand(brand0, caps);
  const theme = clampTheme(theme0, caps);

  const query = q.trim().toLowerCase();
  const visible = useMemo(
    () => (query ? items.filter((m) => (m.name + " " + m.desc).toLowerCase().includes(query)) : items),
    [items, query],
  );
  const groups = useMemo(() => {
    if (cat === "All") {
      return categories
        .filter((c) => c !== "All")
        .map((c) => ({ c, items: visible.filter((m) => m.cat === c) }))
        .filter((g) => g.items.length);
    }
    return [{ c: cat, items: visible.filter((m) => m.cat === cat) }];
  }, [cat, visible, categories]);

  const toolbar = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "14px 28px 0", maxWidth: 900 }}>
      <div style={{ display: "inline-flex", borderRadius: 999, border: "1px solid var(--border-default)", overflow: "hidden" }}>
        {([["canvas", "Canvas", Smartphone], ["list", "List", LayoutList]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setView(id)} aria-pressed={view === id} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 15px", border: 0, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, background: view === id ? "var(--brand)" : "var(--surface-card)", color: view === id ? "var(--brand-on)" : "var(--text-body)" }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
      {view === "canvas" && (
        <span style={{ fontSize: 12.5, color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
          This is the real menu — tap anything to change it.
        </span>
      )}
      <span style={{ flex: 1 }} />
      <Button variant="ghost" onClick={() => onGo("backroom", "categories")}><ListIcon /> Sections</Button>
      <Button variant="ghost" onClick={() => onGo("backroom", "appearance")}><Palette /> Look studio</Button>
    </div>
  );

  if (view === "list") {
    return (
      <div>
        {toolbar}
        <MenuTab items={items} categories={categories} onMove={moveItem} onDuplicate={duplicateItem} onToggle={toggle} onCategorySoldOut={setCategorySoldOut} onAdd={addItem} onEdit={setEditing} onLoadSample={loadSampleMenu} />
      </div>
    );
  }

  return (
    <div>
      {toolbar}
      <div style={{ padding: "18px 16px 80px", display: "flex", justifyContent: "center" }}>
        <div
          className="mesa-menucanvas"
          style={{
            width: "100%",
            maxWidth: 520,
            borderRadius: 22,
            overflow: "hidden",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-lg)",
            background: "var(--surface-page)",
            fontFamily: "var(--font-sans)",
            ...(themeVars(theme) as React.CSSProperties),
            ...(brandVars(brand) as React.CSSProperties),
            ...(brand.surface && theme !== "bold" ? (surfaceVars(brand.surface) as React.CSSProperties) : {}),
          }}
        >
          <ThemeLayout
            theme={theme}
            cafe={cafe}
            logo={brand.logo}
            whiteLabel={caps.whiteLabel}
            menu={visible}
            groups={groups}
            cats={categories}
            cat={cat}
            setCat={setCat}
            onOpen={(m) => setSheetItem(m.id)}
            q={q}
            setQ={setQ}
            showRails={cat === "All" && !query}
          />
        </div>
      </div>
      {sheetItem && <OwnerItemSheet itemId={sheetItem} onClose={() => setSheetItem(null)} onGoEdit={(m) => setEditing({ ...m })} />}
    </div>
  );
}

"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ThemeLayout, themeVars } from "./menu-themes";
import { brandVars, surfaceVars } from "@/lib/brand";
import { capsFor, clampBrand, clampTheme, type BrandKit, type Cafe, type MenuItem, type PlanId, type ThemeKey } from "@/lib/data";

interface Props {
  cafe: Cafe;
  menu: MenuItem[];
  categories: string[];
  theme: ThemeKey;
  brand: BrandKit;
  /** When set, the preview shows only what this plan's tier is entitled to. */
  plan?: PlanId;
  width?: number;
  height?: number;
}

/**
 * A live phone-frame preview of the guest menu, reflecting the current theme +
 * brand kit (accent, fonts, logo) and any menu edits. Tapping an item swaps the
 * frame to a read-only detail view (photo, description, options, tags) — like
 * the live menu, minus ordering. Used in the dashboard's live-preview pane.
 */
export function LivePreview({ cafe, menu, categories, theme: theme0, brand: brand0, plan, width = 300, height = 600 }: Props) {
  const [cat, setCat] = useState("All");
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const caps = plan ? capsFor(plan) : null;
  const brand = caps ? clampBrand(brand0, caps) : brand0;
  const theme = caps ? clampTheme(theme0, caps) : theme0;

  // Reset scroll to the top whenever we switch between the menu and an item
  // detail, so the detail starts at the top (and the menu does too on Back).
  useEffect(() => {
    screenRef.current?.scrollTo({ top: 0 });
  }, [openItem]);

  const groups = useMemo(() => {
    if (cat === "All") {
      return categories
        .filter((c) => c !== "All")
        .map((c) => ({ c, items: menu.filter((m) => m.cat === c) }))
        .filter((g) => g.items.length);
    }
    return [{ c: cat, items: menu.filter((m) => m.cat === cat) }];
  }, [cat, menu, categories]);

  return (
    <div style={{ width, flex: "none", borderRadius: 40, background: "#1F140E", padding: 10, boxShadow: "var(--shadow-xl)" }}>
      <div
        ref={screenRef}
        className="mesa-preview-screen"
        style={{
          borderRadius: 31,
          overflow: "hidden",
          height,
          overflowY: "auto",
          overscrollBehavior: "contain",
          background: "var(--surface-page)",
          // Re-declared (not just inherited from <body>) so descendant text
          // without its own fontFamily picks up this café's body font.
          fontFamily: "var(--font-sans)",
          ...(themeVars(theme) as React.CSSProperties),
          ...(brandVars(brand) as React.CSSProperties),
          ...(brand.surface && theme !== "bold" ? (surfaceVars(brand.surface) as React.CSSProperties) : {}),
        }}
      >
        {openItem ? (
          <div className="mesa-preview-sheet" style={{ minHeight: "100%", background: "var(--surface-page)", color: "var(--text-strong)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: 10 }}>
              <button
                onClick={() => setOpenItem(null)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, border: 0, background: "var(--surface-card)", color: "var(--text-strong)", borderRadius: 999, padding: "7px 13px", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "var(--shadow-sm)" }}
              >
                ← Back
              </button>
            </div>
            {openItem.img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={openItem.img} alt="" style={{ width: "100%", height: 180, objectFit: "cover" }} />
            )}
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: 0, lineHeight: 1.2 }}>{openItem.name}</h3>
                <span style={{ fontWeight: 700, flex: "none" }}>
                  {openItem.origPrice != null && <s style={{ opacity: 0.55, marginRight: 6, fontWeight: 500 }}>₱{openItem.origPrice}</s>}
                  ₱{openItem.price}
                </span>
              </div>
              {openItem.desc && <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>{openItem.desc}</p>}
              {openItem.tags && openItem.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {openItem.tags.map((t) => (
                    <span key={t.id} style={{ fontSize: 12, padding: "3px 9px", borderRadius: 999, background: "var(--surface-card)", color: "var(--text-body)" }}>
                      {t.emoji ? `${t.emoji} ` : ""}{t.label}
                    </span>
                  ))}
                </div>
              )}
              {(openItem.options ?? []).map((g) => (
                <div key={g.id}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    {g.label}
                    <span style={{ fontWeight: 500, color: "var(--text-subtle)" }}>{g.required ? "" : " · optional"}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {g.choices.map((c) => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, color: "var(--text-body)", padding: "8px 11px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-soft)" }}>
                        <span>{c.label}</span>
                        {c.priceDelta ? <span style={{ color: "var(--text-muted)" }}>+₱{c.priceDelta}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 2 }}>Preview · guests order from the live menu.</p>
            </div>
          </div>
        ) : (
          <ThemeLayout
            theme={theme}
            cafe={cafe}
            logo={brand.logo}
            whiteLabel={caps?.whiteLabel}
            menu={menu}
            groups={groups}
            cats={categories}
            cat={cat}
            setCat={setCat}
            onOpen={(m) => setOpenItem(m)}
            q=""
            setQ={() => {}}
            showRails={cat === "All"}
          />
        )}
      </div>
    </div>
  );
}

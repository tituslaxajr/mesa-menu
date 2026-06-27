"use client";

import React, { useMemo, useState } from "react";
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
 * brand kit (accent, fonts, logo) and any menu edits. Read-only — item taps are
 * inert here. Used in the Studio's Appearance tab.
 */
export function LivePreview({ cafe, menu, categories, theme: theme0, brand: brand0, plan, width = 300, height = 600 }: Props) {
  const [cat, setCat] = useState("All");
  const caps = plan ? capsFor(plan) : null;
  const brand = caps ? clampBrand(brand0, caps) : brand0;
  const theme = caps ? clampTheme(theme0, caps) : theme0;

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
        style={{
          borderRadius: 31,
          overflow: "hidden",
          height,
          overflowY: "auto",
          background: "var(--surface-page)",
          ...(themeVars(theme) as React.CSSProperties),
          ...(brandVars(brand) as React.CSSProperties),
          ...(brand.surface && theme !== "bold" ? (surfaceVars(brand.surface) as React.CSSProperties) : {}),
        }}
      >
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
          onOpen={() => {}}
          q=""
          setQ={() => {}}
          showRails={cat === "All"}
        />
      </div>
    </div>
  );
}

"use client";
// Public, interactive demo: the real owner dashboard (+ its live phone preview)
// running on the demo café. All edits go to localStorage under the "demo" slug,
// so they stay in the visitor's browser and never touch the DB-backed /m/demo.
// "Reset demo" clears those keys.
import Link from "next/link";
import { RotateCcw, ArrowRight, Smartphone } from "lucide-react";
import { DashboardShell } from "./DashboardShell";
import { studioKey, type StudioPart } from "@/lib/studio-store";
import type { BrandKit, Cafe, MenuItem, PlanId, Promo } from "@/lib/data";

const PARTS: StudioPart[] = ["items", "cafe", "brand", "theme", "promos", "categories"];

export function DemoExperience({
  cafe,
  menu,
  categories,
  planId,
  brand,
  promos,
}: {
  cafe: Cafe;
  menu: MenuItem[];
  categories: string[];
  planId: PlanId;
  brand: BrandKit;
  promos: Promo[];
}) {
  const resetDemo = () => {
    const slug = cafe.slug;
    PARTS.forEach((p) => localStorage.removeItem(studioKey(slug, p)));
    localStorage.removeItem(`mesa.orders.${slug}`);
    localStorage.removeItem(`mesa.myorders.${slug}`);
    localStorage.removeItem(`mesa.orders.${slug}.sound`);
    location.reload();
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "8px 16px",
          padding: "10px 18px",
          background: "var(--surface-inverse)",
          color: "var(--text-inverse)",
          fontFamily: "var(--font-sans)",
          fontSize: 13.5,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Smartphone size={15} style={{ flex: "none", opacity: 0.85 }} />
          <strong style={{ fontWeight: 700 }}>Live demo.</strong>
          <span style={{ opacity: 0.85 }}>
            Edit the menu, theme and colours — the phone updates live. Changes stay in your browser.
          </span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={resetDemo}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "1px solid color-mix(in oklab, var(--text-inverse) 35%, transparent)",
              color: "var(--text-inverse)",
              borderRadius: 999,
              padding: "5px 12px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            <RotateCcw size={14} /> Reset demo
          </button>
          <Link
            href="/signup"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              color: "var(--text-inverse)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Create your own <ArrowRight size={15} />
          </Link>
        </span>
      </div>

      <DashboardShell
        cafe={cafe}
        menu={menu}
        categories={categories}
        planId={planId}
        initialBrand={brand}
        initialPromos={promos}
        persistence="local"
        demo
      />
    </div>
  );
}

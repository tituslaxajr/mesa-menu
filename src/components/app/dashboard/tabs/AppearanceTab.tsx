"use client";

import React, { useState } from "react";
import {
  Check,
  Sparkles,
  Image as ImageIcon,
  UploadCloud,
  Wand2,
  LayoutTemplate,
  Paintbrush,
  CircleAlert,
  Trash2,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { Button, Select, Badge, Card } from "@/components/ds";
import { palette, hue, extractBrandColor, accentContrast, surfaceContrast, type ContrastLevel } from "@/lib/color";
import {
  THEMES,
  ACCENT_PRESETS,
  SURFACE_PRESETS,
  PAIRINGS,
  HEADING_FONTS,
  BODY_FONTS,
  FONT_VARS,
  type BrandCaps,
  type PlanId,
  pairingForHue,
  type Cafe,
  type MenuItem,
  type ThemeKey,
  type BrandKit,
} from "@/lib/data";
import { SectionTitle, UploadZone, type UploadImage } from "../shared";

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

function BrandKitSubTab({ brand, setBrand, cafe, setCafe, theme, caps, uploadImage }: { brand: BrandKit; setBrand: (f: (b: BrandKit) => BrandKit) => void; cafe: Cafe; setCafe: (f: (c: Cafe) => Cafe) => void; theme: ThemeKey; caps: BrandCaps; uploadImage: UploadImage }) {
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
            <UploadZone height={80} onFile={(src) => set({ logo: src })} upload={(f) => uploadImage(f, "logo")}>
              <UploadCloud size={22} style={{ color: "var(--brand)" }} />
              <div style={{ fontSize: 13, color: "var(--text-body)", fontWeight: 600 }}>Drop your logo or click to upload</div>
            </UploadZone>
          </div>
          {brand.logo && <Button variant="ghost" onClick={() => set({ logo: null })}><Trash2 /> Remove</Button>}
        </div>
      </Card>

      {/* COVER PHOTO */}
      <Card variant="flat" padded>
        <SectionTitle>Cover photo</SectionTitle>
        <div style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: -8, marginBottom: 14 }}>
          The header image behind your café name. Shown on the <strong>Warm</strong> and <strong>Bold</strong> themes.
        </div>
        {theme !== "warm" && theme !== "bold" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-muted)", background: "var(--surface-muted)", borderRadius: "var(--radius-md)", padding: "10px 12px", marginBottom: 14 }}>
            <CircleAlert size={15} style={{ flex: "none" }} /> Your current theme doesn&apos;t use a cover photo — switch to Warm or Bold to show it.
          </div>
        )}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ width: 132, height: 84, borderRadius: "var(--radius-md)", background: "var(--surface-sunken)", display: "grid", placeItems: "center", flex: "none", overflow: "hidden", border: "1px solid var(--border-soft)" }}>
            {cafe.cover
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={cafe.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <ImageIcon size={24} style={{ color: "var(--text-subtle)" }} />}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <UploadZone height={84} onFile={(src) => setCafe((c) => ({ ...c, cover: src }))} upload={(f) => uploadImage(f, "cover")}>
              <UploadCloud size={22} style={{ color: "var(--brand)" }} />
              <div style={{ fontSize: 13, color: "var(--text-body)", fontWeight: 600 }}>Drop a cover photo or click to upload</div>
              <div style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 2 }}>A wide landscape shot works best (about 3:2)</div>
            </UploadZone>
          </div>
          {cafe.cover && <Button variant="ghost" onClick={() => setCafe((c) => ({ ...c, cover: "" }))}><Trash2 /> Remove</Button>}
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

export function AppearanceTab(props: {
  theme: ThemeKey; setTheme: (t: ThemeKey) => void; brand: BrandKit; setBrand: (f: (b: BrandKit) => BrandKit) => void;
  cafe: Cafe; setCafe: (f: (c: Cafe) => Cafe) => void; items: MenuItem[]; categories: string[]; caps: BrandCaps; plan: PlanId; uploadImage: UploadImage;
}) {
  const [sub, setSub] = useState<"theme" | "brand">("theme");
  const subs: [("theme" | "brand"), string, LucideIcon][] = [["theme", "Menu theme", LayoutTemplate], ["brand", "Brand kit", Paintbrush]];
  return (
    <div className="mesa-dash-page" style={{ padding: "20px 28px 60px" }}>
      <div style={{ display: "inline-flex", gap: 4, background: "var(--surface-muted)", borderRadius: 999, padding: 4, marginBottom: 18 }}>
        {subs.map(([k, label, Icon]) => {
          const on = sub === k;
          return (
            <button key={k} onClick={() => setSub(k)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 44, border: 0, cursor: "pointer", borderRadius: 999, padding: "0 18px", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-sans)", background: on ? "var(--surface-card)" : "transparent", color: on ? "var(--text-strong)" : "var(--text-muted)", boxShadow: on ? "var(--shadow-xs)" : "none" }}>
              <Icon size={16} /> {label}
            </button>
          );
        })}
      </div>
      <div style={{ maxWidth: 720, minWidth: 0 }}>
        {sub === "theme"
          ? <ThemeSubTab theme={props.theme} setTheme={props.setTheme} accent={props.brand.accent} caps={props.caps} />
          : <BrandKitSubTab brand={props.brand} setBrand={props.setBrand} cafe={props.cafe} setCafe={props.setCafe} theme={props.theme} caps={props.caps} uploadImage={props.uploadImage} />}
      </div>
    </div>
  );
}

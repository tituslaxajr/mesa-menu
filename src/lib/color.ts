// ============================================================================
// Mesa — color helpers (ported from the prototype's MesaColor).
// Derives the full --brand* set the design system expects from one base color,
// and supports pulling a dominant accent out of an uploaded brand image.
// ============================================================================

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

function hex2rgb(h: string): [number, number, number] {
  let s = h.replace("#", "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function rgb2hex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("");
}

export function mix(hex: string, target: "white" | "black", amt: number): string {
  const [r, g, b] = hex2rgb(hex);
  const t = target === "white" ? [255, 255, 255] : [0, 0, 0];
  return rgb2hex(r + (t[0] - r) * amt, g + (t[1] - g) * amt, b + (t[2] - b) * amt);
}

export function luminance(hex: string): number {
  const [r, g, b] = hex2rgb(hex).map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function hue(hex: string): number {
  const [r, g, b] = hex2rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

export interface BrandPalette {
  brand: string;
  brandHover: string;
  brandActive: string;
  brandSoft: string;
  brandOn: string;
}

/** Derive the full --brand* ramp the design system expects from one base color. */
export function palette(base: string): BrandPalette {
  return {
    brand: base,
    brandHover: mix(base, "black", 0.12),
    brandActive: mix(base, "black", 0.24),
    brandSoft: mix(base, "white", 0.86),
    brandOn: luminance(base) > 0.55 ? "#2A1D16" : "#FFFFFF",
  };
}

/** WCAG contrast ratio between two colors (1 = identical, 21 = black-on-white). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastLevel = "good" | "large" | "low";
export interface ContrastVerdict {
  level: ContrastLevel;
  ratio: number;
  /** Which role of the accent is the weakest link. */
  role: "button" | "text";
}

/**
 * Judge whether an accent colour stays readable in the two roles the menu uses
 * it for: the solid CTA button (auto-contrasted text on the accent) and accent
 * text/prices on a light surface. Reports the weaker of the two against WCAG AA
 * (4.5 = good for body text, 3 = large text only, below = low).
 */
export function accentContrast(accent: string, surface = "#FFFFFF"): ContrastVerdict {
  const onButton = contrastRatio(palette(accent).brandOn, accent);
  const asText = contrastRatio(accent, surface);
  const role = onButton <= asText ? "button" : "text";
  const ratio = Math.min(onButton, asText);
  // Tuned for accent/price use (not body copy): >=4 reads comfortably, 3-4 is a
  // gentle nudge, <3 is genuinely hard to read. Keeps the curated presets green.
  const level: ContrastLevel = ratio >= 4 ? "good" : ratio >= 3 ? "large" : "low";
  return { level, ratio, role };
}

/**
 * Readability of body text on a chosen page-background tint. Uses the better of
 * dark/light text (matching what `surfaceVars` picks), so it reports the real
 * worst case the diner sees. Body copy wants ~4.5; 3-4.5 is a nudge.
 */
export function surfaceContrast(surface: string): ContrastVerdict {
  const ratio = Math.max(contrastRatio("#2A1D16", surface), contrastRatio("#FBF6EE", surface));
  const level: ContrastLevel = ratio >= 4.5 ? "good" : ratio >= 3 ? "large" : "low";
  return { level, ratio, role: "text" };
}

/** Pull a dominant, vibrant color out of a loaded brand image (client only). */
export function extractBrandColor(img: HTMLImageElement): string | null {
  const N = 56;
  const cv = document.createElement("canvas");
  cv.width = N;
  cv.height = N;
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, N, N);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, N, N).data;
  } catch {
    return null;
  }
  const buckets: Record<number, { w: number; r: number; g: number; b: number }> = {};
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 200) continue;
    const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2, d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (l > 0.93 || l < 0.07 || s < 0.18) continue; // skip near-white/black & greys
    const hx = rgb2hex(r, g, b);
    const h = Math.round(hue(hx) / 24) * 24; // 15 hue buckets
    if (!buckets[h]) buckets[h] = { w: 0, r: 0, g: 0, b: 0 };
    const w = s + 0.2;
    buckets[h].w += w;
    buckets[h].r += r * w;
    buckets[h].g += g * w;
    buckets[h].b += b * w;
  }
  let best: { w: number; r: number; g: number; b: number } | null = null;
  Object.values(buckets).forEach((bk) => {
    if (!best || bk.w > best.w) best = bk;
  });
  if (!best) return null;
  const b = best as { w: number; r: number; g: number; b: number };
  return rgb2hex(b.r / b.w, b.g / b.w, b.b / b.w);
}

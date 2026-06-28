import { palette, mix, contrastRatio } from "./color";
import { FONT_VARS, type BrandKit } from "./data";

/**
 * Turn an owner's brand kit (accent + fonts) into CSS-variable overrides that
 * the design system reads. Layered on top of a theme's own variables.
 */
export function brandVars(brand: BrandKit): Record<string, string> {
  const v: Record<string, string> = {};
  const hs = FONT_VARS[brand.headingFont];
  const bs = FONT_VARS[brand.bodyFont];
  if (hs) v["--font-display"] = hs;
  if (bs) v["--font-sans"] = bs;
  if (brand.accent) {
    const p = palette(brand.accent);
    v["--brand"] = p.brand;
    v["--brand-hover"] = p.brandHover;
    v["--brand-active"] = p.brandActive;
    v["--brand-soft"] = p.brandSoft;
    v["--brand-on"] = p.brandOn;
  }
  Object.assign(v, shapeVars(brand.shape));
  return v;
}

/**
 * Corner style for cards & images. Overrides the rectangular radius scale only —
 * pills/buttons keep their full radius in every mode. Applies to all themes.
 */
export function shapeVars(shape: BrandKit["shape"] | undefined): Record<string, string> {
  if (shape === "sharp") {
    return { "--radius-xs": "2px", "--radius-sm": "3px", "--radius-md": "5px", "--radius-lg": "7px", "--radius-xl": "9px", "--radius-2xl": "12px" };
  }
  if (shape === "soft") {
    return { "--radius-xs": "10px", "--radius-sm": "14px", "--radius-md": "18px", "--radius-lg": "26px", "--radius-xl": "34px", "--radius-2xl": "44px" };
  }
  return {};
}

const CREAM = "#FBF6EE";
const INK = "#2A1D16";

/**
 * Turn an owner's chosen page-background tint into the surface/text/border CSS
 * vars the themes read. Text colour is picked by whichever (light/dark) reads
 * better on the tint, so both pale and deep backgrounds stay legible. Returned
 * vars are layered *after* themeVars + brandVars so they override theme defaults.
 *
 * Not applied to the Bold theme — its hero and type use hardcoded dark colours.
 */
export function surfaceVars(surface: string): Record<string, string> {
  const lightText = contrastRatio(CREAM, surface) > contrastRatio(INK, surface);
  if (lightText) {
    // Deep background → light text, cards a touch lighter than the page.
    return {
      "--surface-page": surface,
      "--surface-card": mix(surface, "white", 0.08),
      "--surface-raised": mix(surface, "white", 0.08),
      "--surface-muted": mix(surface, "white", 0.14),
      "--surface-sunken": mix(surface, "white", 0.14),
      "--text-strong": CREAM,
      "--text-body": mix(surface, "white", 0.8),
      "--text-muted": mix(surface, "white", 0.56),
      "--text-subtle": mix(surface, "white", 0.42),
      "--border-soft": "rgba(255,255,255,0.10)",
      "--border-default": "rgba(255,255,255,0.18)",
    };
  }
  // Pale background → keep the warm dark text, clean white cards on the tint.
  return {
    "--surface-page": surface,
    "--surface-card": "#FFFFFF",
    "--surface-raised": "#FFFFFF",
    "--surface-muted": mix(surface, "black", 0.05),
    "--surface-sunken": mix(surface, "black", 0.07),
    "--text-strong": INK,
    "--text-body": "#3B2A21",
    "--text-muted": "#6B5142",
    "--text-subtle": "#806451",
    "--border-soft": "rgba(31,20,14,0.08)",
    "--border-default": "rgba(31,20,14,0.14)",
  };
}

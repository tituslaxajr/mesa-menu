// ============================================================================
// Mesa — studio store (front-end shared state)
// The owner Studio persists each café's edits to localStorage under
// slug-scoped keys; the public menu (/m/[slug]) reads the same keys so changes
// show up live. This is the front-end stand-in for a real backend.
// BACKEND SEAM: replace read/write with API calls; the key set stays the same.
// ============================================================================

import type { BrandKit, Cafe, MenuItem, Promo, ThemeKey } from "./data";

export type StudioPart = "items" | "cafe" | "brand" | "theme" | "promos" | "categories";

export const studioKey = (slug: string, part: StudioPart) => `mesa.studio.${slug}.${part}`;

function read<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    return raw != null ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export interface StudioOverrides {
  items?: MenuItem[];
  cafe?: Cafe;
  brand?: BrandKit;
  theme?: ThemeKey;
  promos?: Promo[];
  categories?: string[];
}

/** Read any saved Studio edits for a café (empty object if none / SSR). */
export function readStudioOverrides(slug: string): StudioOverrides {
  return {
    items: read<MenuItem[]>(studioKey(slug, "items")),
    cafe: read<Cafe>(studioKey(slug, "cafe")),
    brand: read<BrandKit>(studioKey(slug, "brand")),
    theme: read<ThemeKey>(studioKey(slug, "theme")),
    promos: read<Promo[]>(studioKey(slug, "promos")),
    categories: read<string[]>(studioKey(slug, "categories")),
  };
}

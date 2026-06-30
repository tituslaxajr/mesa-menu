// Canonical public base URL for the app. Set NEXT_PUBLIC_SITE_URL on the host
// (and in .env.local for dev) to the live origin; this is the single source of
// truth for shareable links, printed QR codes, and metadata.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://mesa.cortanatechsolutions.com";

/** Full public guest-menu URL for a café — what the QR code and share link point to. */
export const menuUrl = (slug: string) => `${SITE_URL}/m/${slug}`;

/** Host + path for display, e.g. "menu.cortanatechsolutions.com/m/demo". */
export const menuLabel = (slug: string) => `${SITE_URL.replace(/^https?:\/\//, "")}/m/${slug}`;

/** Support / feedback / privacy contact. Override with NEXT_PUBLIC_FEEDBACK_EMAIL. */
export const FEEDBACK_EMAIL = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL || "support@cortanatechsolutions.com";
export const feedbackMailto = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("Mesa beta feedback")}`;

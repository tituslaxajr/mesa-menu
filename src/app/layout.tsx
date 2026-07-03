import type { Metadata } from "next";
import {
  Gelasio,
  Newsreader,
  Hanken_Grotesk,
  Playfair_Display,
  DM_Serif_Display,
  Space_Grotesk,
  Work_Sans,
  DM_Sans,
  Fraunces,
  Cormorant_Garamond,
  Libre_Baskerville,
  Abril_Fatface,
  Poppins,
  Bricolage_Grotesque,
  Inter,
  Nunito_Sans,
  Karla,
  Manrope,
} from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

// Display serif — headlines, menu names, prices, warm italic accents.
// Gelasio is metric-compatible with Georgia: devices that ship Georgia
// (Windows/macOS/iOS) use it natively; everyone else gets the same look here.
const gelasio = Gelasio({
  variable: "--font-gelasio",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

// Former display serif — still selectable in the owner's Brand kit.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// UI / body sans fallback — the system stack leads with Segoe UI; Hanken
// covers platforms without it. Also selectable in the Brand kit.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Extra families selectable in the owner's Brand kit (applied to the menu).
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const dmSerif = DM_Serif_Display({ variable: "--font-dmserif", subsets: ["latin"], weight: ["400"], display: "swap" });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const workSans = Work_Sans({ variable: "--font-worksans", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const dmSans = DM_Sans({ variable: "--font-dmsans", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

// Additional heading (display) fonts — widen the brand kit's font-pairing range.
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], display: "swap" });
const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const libreBaskerville = Libre_Baskerville({ variable: "--font-librebaskerville", subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const abrilFatface = Abril_Fatface({ variable: "--font-abril", subsets: ["latin"], weight: ["400"], display: "swap" });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });

// Additional body (UI) fonts.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const nunitoSans = Nunito_Sans({ variable: "--font-nunitosans", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const karla = Karla({ variable: "--font-karla", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

const BRAND_FONTS = [
  playfair, dmSerif, spaceGrotesk, workSans, dmSans,
  fraunces, cormorant, libreBaskerville, abrilFatface, poppins, bricolage,
  inter, nunitoSans, karla, manrope,
]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mesa — A better menu for every table",
    template: "%s · Mesa",
  },
  description:
    "Mesa gives small cafés a warm, always-fresh QR-code menu guests browse from their table. One QR code, live updates, set up the same afternoon. Made for cafés in San Fernando, Pampanga and beyond.",
  keywords: [
    "QR menu",
    "café menu",
    "digital menu Philippines",
    "San Fernando Pampanga café",
    "online menu",
  ],
  openGraph: {
    title: "Mesa — A better menu for every table",
    description:
      "A warm, always-fresh QR-code menu your guests browse from their table — just a scan away.",
    type: "website",
    locale: "en_PH",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${gelasio.variable} ${newsreader.variable} ${hanken.variable} ${BRAND_FONTS}`}>
      <body>{children}</body>
    </html>
  );
}

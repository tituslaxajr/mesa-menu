import type { Metadata } from "next";
import {
  Newsreader,
  Hanken_Grotesk,
  Playfair_Display,
  DM_Serif_Display,
  Space_Grotesk,
  Work_Sans,
  DM_Sans,
} from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

// Display serif — headlines, menu names, prices, warm italic accents.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// UI / body sans — everything functional.
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

const BRAND_FONTS = [playfair, dmSerif, spaceGrotesk, workSans, dmSans]
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
    <html lang="en" className={`${newsreader.variable} ${hanken.variable} ${BRAND_FONTS}`}>
      <body>{children}</body>
    </html>
  );
}

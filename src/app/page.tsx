import type { Metadata } from "next";
import { DayStory } from "@/components/marketing/DayStory";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: {
    absolute: "Mesa — Change your menu in one tap. The reprints stop today.",
  },
  description:
    "QR menus for Filipino cafés. Sold out, price change, or a merienda promo — update once with Mesa and every table sees it. Free while in beta, no card required.",
  openGraph: {
    title: "Mesa — Change your menu in one tap",
    description:
      "Live QR menus for small cafés. The reprints stop today. Free while in beta.",
  },
};

export default function LandingPage() {
  return (
    <div style={{ background: "var(--bean-950)" }}>
      <DayStory />
      <Footer variant="landing" />
    </div>
  );
}

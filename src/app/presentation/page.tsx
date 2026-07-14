import type { Metadata } from "next";
import { BetaDeck } from "@/components/marketing/BetaDeck";

export const metadata: Metadata = {
  title: "Beta preview — Mesa for cafés",
  description:
    "A quick tour of Mesa for beta cafés: the pain of paper menus, how a live QR menu fixes it, the benefits, how the beta works, and how to register.",
  openGraph: {
    title: "Mesa — the reprints stop today",
    description:
      "Why cafés in the beta love Mesa, and how to join. Free while in beta.",
  },
};

export default function PresentationPage() {
  return <BetaDeck />;
}

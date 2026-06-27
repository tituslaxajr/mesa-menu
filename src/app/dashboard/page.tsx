import type { Metadata } from "next";
import { DEMO_CAFE, getMenu, getCategories } from "@/lib/data";
import { DashboardShell } from "@/components/app/DashboardShell";

export const metadata: Metadata = {
  title: "Owner dashboard",
  description: "Manage your Mesa menu — items, themes, brand kit, QR code, promos, analytics, and settings.",
};

export default function DashboardPage() {
  // BACKEND SEAM: the demo café stands in for the logged-in owner's café.
  const cafe = DEMO_CAFE;
  const menu = getMenu(cafe.slug);
  const categories = getCategories(cafe.slug);

  return <DashboardShell cafe={cafe} menu={menu} categories={categories} planId={cafe.plan} />;
}

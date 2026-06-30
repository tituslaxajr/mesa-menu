import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getOwnerCafeData } from "@/lib/queries";
import { DashboardShell } from "@/components/app/DashboardShell";

export const metadata: Metadata = {
  title: "Owner dashboard",
  description: "Manage your Mesa menu — items, themes, brand kit, QR code, promos, analytics, and settings.",
};

export default async function DashboardPage() {
  await verifySession(); // redirects to /login if signed out
  const owner = await getOwnerCafeData();
  // Signed in but no café yet → first-run onboarding.
  if (!owner) redirect("/dashboard/new");

  const { data, planId, cafeId } = owner;
  return (
    <DashboardShell
      cafe={data.cafe}
      menu={data.menu}
      categories={data.categories}
      planId={planId}
      cafeId={cafeId}
      initialBrand={data.brand}
      initialPromos={data.promos}
      persistence="db"
    />
  );
}

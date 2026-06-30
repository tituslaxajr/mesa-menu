import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getOwnerCafeData } from "@/lib/queries";
import { OnboardingForm } from "@/components/app/OnboardingForm";

export const metadata: Metadata = { title: "Set up your café — Mesa" };

export default async function NewCafePage() {
  await verifySession(); // redirects to /login if signed out
  // If they already have a café, onboarding is done — go to the dashboard.
  const owner = await getOwnerCafeData();
  if (owner) redirect("/dashboard");

  return <OnboardingForm />;
}

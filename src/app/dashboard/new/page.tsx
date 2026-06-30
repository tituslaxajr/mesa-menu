import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getOwnerCafeData } from "@/lib/queries";
import { OnboardingForm } from "@/components/app/OnboardingForm";
import type { PlanId } from "@/lib/data";

export const metadata: Metadata = { title: "Set up your café — Mesa" };

export default async function NewCafePage() {
  const user = await verifySession(); // redirects to /login if signed out
  // If they already have a café, onboarding is done — go to the dashboard.
  const owner = await getOwnerCafeData();
  if (owner) redirect("/dashboard");

  // Preselect the tier they clicked on the pricing page (carried via signup metadata).
  const metaPlan = user.user_metadata?.plan;
  const initialPlan: PlanId | undefined =
    metaPlan === "starter" || metaPlan === "brew" || metaPlan === "roast" ? metaPlan : undefined;

  return <OnboardingForm initialPlan={initialPlan} />;
}

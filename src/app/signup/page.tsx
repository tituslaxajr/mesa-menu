import type { Metadata } from "next";
import { AuthForm } from "@/components/app/AuthForm";

export const metadata: Metadata = { title: "Sign up — Mesa" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const sp = await searchParams;
  return <AuthForm mode="signup" presetPlan={sp.plan} />;
}

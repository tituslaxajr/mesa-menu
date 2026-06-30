import type { Metadata } from "next";
import { AuthForm } from "@/components/app/AuthForm";

export const metadata: Metadata = { title: "Log in — Mesa" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ "check-email"?: string }>;
}) {
  const sp = await searchParams;
  return (
    <AuthForm
      mode="login"
      notice={sp["check-email"] ? "Check your email to confirm your account, then log in." : undefined}
    />
  );
}

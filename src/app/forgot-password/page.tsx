import type { Metadata } from "next";
import { AuthForm } from "@/components/app/AuthForm";

export const metadata: Metadata = { title: "Reset password — Mesa" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const sp = await searchParams;
  return (
    <AuthForm
      mode="forgot"
      notice={sp.sent ? "If that email has an account, a reset link is on its way. Check your inbox." : undefined}
    />
  );
}

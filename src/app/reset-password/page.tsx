import type { Metadata } from "next";
import { AuthForm } from "@/components/app/AuthForm";

export const metadata: Metadata = { title: "Set a new password — Mesa" };

export default function ResetPasswordPage() {
  return <AuthForm mode="reset" />;
}

import type { Metadata } from "next";
import { BetaRequestForm } from "@/components/app/BetaRequestForm";

export const metadata: Metadata = { title: "Apply for the beta — Mesa" };

export default function RequestAccessPage() {
  return <BetaRequestForm />;
}

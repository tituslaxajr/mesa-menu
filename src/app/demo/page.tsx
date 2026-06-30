import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCafeData } from "@/lib/queries";
import { DemoExperience } from "@/components/app/DemoExperience";

export const metadata: Metadata = {
  title: "Live demo — Mesa",
  description: "Try Mesa's owner dashboard and watch the guest menu update live on the phone preview.",
};

// Public, no login. Reuses the demo café's live data.
export default async function DemoPage() {
  const data = await getCafeData("demo");
  if (!data) notFound();

  return (
    <DemoExperience
      cafe={data.cafe}
      menu={data.menu}
      categories={data.categories}
      planId={data.cafe.plan}
    />
  );
}

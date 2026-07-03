import { DayStory } from "@/components/marketing/DayStory";
import { Footer } from "@/components/marketing/Footer";

export default function LandingPage() {
  return (
    <div style={{ background: "var(--surface-page)" }}>
      <DayStory />
      <Footer />
    </div>
  );
}

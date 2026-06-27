import { Nav } from "@/components/marketing/Nav";
import { Hero } from "@/components/marketing/Hero";
import { CustomerApp } from "@/components/marketing/CustomerApp";
import { OwnerDashboard } from "@/components/marketing/OwnerDashboard";
import { Customization } from "@/components/marketing/Customization";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Pricing } from "@/components/marketing/Pricing";
import { Footer } from "@/components/marketing/Footer";

export default function LandingPage() {
  return (
    <div style={{ background: "var(--surface-page)" }}>
      <Nav />
      <main>
        <Hero />
        <CustomerApp />
        <OwnerDashboard />
        <Customization />
        <HowItWorks />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}

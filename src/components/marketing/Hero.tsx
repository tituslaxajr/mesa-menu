import { QrCode, Play } from "lucide-react";
import { Button, Badge } from "@/components/ds";
import { PhoneMock } from "./PhoneMock";

export function Hero() {
  return (
    <section className="mesa-container" style={{ paddingTop: 72, paddingBottom: 16, textAlign: "center" }}>
      <div className="mesa-rise" style={{ maxWidth: 760, margin: "0 auto" }}>
        <Badge variant="brand" style={{ letterSpacing: "var(--tracking-caps)", textTransform: "uppercase" }}>
          For cafés in San Fernando &amp; beyond
        </Badge>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(40px, 6vw, 68px)",
            fontWeight: 500,
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            color: "var(--text-strong)",
            margin: "20px 0 0",
          }}
        >
          Ditch the clunky Canva PDF.
          <br />
          Give them a menu that feels <span style={{ fontStyle: "italic", color: "var(--brand)" }}>like an app.</span>
        </h1>
        <p
          style={{
            fontSize: 19,
            color: "var(--text-muted)",
            lineHeight: 1.55,
            margin: "22px auto 0",
            maxWidth: 600,
          }}
        >
          One QR code. A menu that&apos;s fast on any phone, always up to date, and looks exactly
          like your café. Subscribe and you&apos;re live the same afternoon.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 30, justifyContent: "center", flexWrap: "wrap" }}>
          <Button as="a" href="#pricing" variant="primary" size="lg">
            <QrCode /> Start free for 14 days
          </Button>
          <Button as="a" href="/m/demo" variant="secondary" size="lg">
            <Play /> See a live menu
          </Button>
        </div>
        <p style={{ marginTop: 16, color: "var(--text-subtle)", fontSize: 13.5 }}>
          14-day free trial · no card required
        </p>
      </div>

      <div style={{ display: "grid", placeItems: "center", marginTop: 48 }}>
        <PhoneMock width={300} />
      </div>
    </section>
  );
}

import Link from "next/link";
import { Logo } from "@/components/ds";

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border-soft)", background: "var(--surface-card)" }}>
      <div
        className="mesa-container"
        style={{ paddingTop: 32, paddingBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Logo size="md" subtitle />
          <nav style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <Link href="/m/demo" style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
              See a live menu
            </Link>
            <Link href="/dashboard" style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
              Owner dashboard
            </Link>
            <a href="#pricing" style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
              Pricing
            </a>
            <Link href="/signup" style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
              Try the beta
            </Link>
            <Link href="/terms" style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
              Terms
            </Link>
            <Link href="/privacy" style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
              Privacy
            </Link>
          </nav>
        </div>
        <span style={{ fontSize: 13.5, color: "var(--text-subtle)" }}>
          Mesa is in beta · Made with care for small cafés in the Philippines · © 2026
        </span>
      </div>
    </footer>
  );
}

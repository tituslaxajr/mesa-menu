import Link from "next/link";
import { Logo } from "@/components/ds";

export function Footer({ variant = "default" }: { variant?: "default" | "landing" }) {
  const landing = variant === "landing";
  return (
    <footer
      className={landing ? "mesa-land-footer" : undefined}
      style={
        landing
          ? undefined
          : {
              borderTop: "1px solid var(--border-soft)",
              background: "var(--surface-card)",
            }
      }
    >
      <div
        className="mesa-container"
        style={{
          paddingTop: 32,
          paddingBottom: 32,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Logo size="md" subtitle tone={landing ? "ondark" : "default"} />
          <nav style={{ display: "flex", gap: 18, flexWrap: "wrap" }} aria-label="Footer">
            <Link
              href="/m/demo"
              style={{
                fontSize: 13.5,
                color: landing ? undefined : "var(--text-muted)",
              }}
            >
              See a live menu
            </Link>
            <Link
              href="/demo"
              style={{
                fontSize: 13.5,
                color: landing ? undefined : "var(--text-muted)",
              }}
            >
              Live demo
            </Link>
            <a
              href="#pricing"
              style={{
                fontSize: 13.5,
                color: landing ? undefined : "var(--text-muted)",
              }}
            >
              Pricing
            </a>
            <Link
              href="/request-access"
              style={{
                fontSize: 13.5,
                color: landing ? undefined : "var(--text-muted)",
              }}
            >
              Start free
            </Link>
            <Link
              href="/login"
              style={{
                fontSize: 13.5,
                color: landing ? undefined : "var(--text-muted)",
              }}
            >
              Log in
            </Link>
            <Link
              href="/terms"
              style={{
                fontSize: 13.5,
                color: landing ? undefined : "var(--text-muted)",
              }}
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              style={{
                fontSize: 13.5,
                color: landing ? undefined : "var(--text-muted)",
              }}
            >
              Privacy
            </Link>
          </nav>
        </div>
        <span
          className={landing ? "mesa-land-footer-copy" : undefined}
          style={{
            fontSize: 13.5,
            color: landing ? undefined : "var(--text-subtle)",
          }}
        >
          Mesa is in beta · Made with care for small cafés in the Philippines · © 2026 · powered by{" "}
          <a
            href="https://cortanatechsolutions.com"
            target="_blank"
            rel="noopener noreferrer"
            style={
              landing
                ? undefined
                : { color: "var(--text-muted)", textDecoration: "underline" }
            }
          >
            CortanaTech Solutions, Inc.
          </a>
        </span>
      </div>
    </footer>
  );
}

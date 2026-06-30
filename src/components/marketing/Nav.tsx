import Link from "next/link";
import { Logo } from "@/components/ds";

const LINKS = [
  { label: "Customer app", href: "#customer-app" },
  { label: "Owner dashboard", href: "#owner-dashboard" },
  { label: "Customization", href: "#customization" },
  { label: "Pricing", href: "#pricing" },
];

export function Nav() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "color-mix(in oklab, var(--surface-page) 85%, transparent)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      <div
        className="mesa-container"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, paddingTop: 14, paddingBottom: 14 }}
      >
        <Link href="/" aria-label="Mesa home" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <Logo size="md" subtitle />
          <span style={{ fontSize: 12.5, color: "var(--text-subtle)", borderLeft: "1px solid var(--border-default)", paddingLeft: 12 }} className="mesa-nav__tagline">
            A better menu for every table.
          </span>
        </Link>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "var(--surface-card)",
            border: "1px solid var(--border-soft)",
            borderRadius: "var(--radius-pill)",
            padding: 5,
            boxShadow: "var(--shadow-xs)",
          }}
        >
          {LINKS.map((l, i) => {
            const last = i === LINKS.length - 1;
            return (
              <a
                key={l.href}
                href={l.href}
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "8px 16px",
                  borderRadius: "var(--radius-pill)",
                  textDecoration: "none",
                  color: last ? "var(--text-on-clay)" : "var(--text-body)",
                  background: last ? "var(--brand)" : "transparent",
                }}
                className={last ? "mesa-nav__link" : "mesa-nav__link mesa-nav__link--section"}
              >
                {l.label}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

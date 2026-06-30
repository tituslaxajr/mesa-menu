import Link from "next/link";
import { Logo } from "@/components/ds";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main style={{ minHeight: "100dvh", background: "var(--surface-page)" }}>
      <header style={{ borderBottom: "1px solid var(--border-soft)", background: "var(--surface-card)" }}>
        <div className="mesa-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, paddingBottom: 16 }}>
          <Link href="/" aria-label="Mesa home" style={{ textDecoration: "none" }}>
            <Logo size="md" subtitle />
          </Link>
          <Link href="/" style={{ fontSize: 13.5, color: "var(--text-muted)" }}>← Back to site</Link>
        </div>
      </header>

      <article className="mesa-container mesa-legal" style={{ maxWidth: 760, paddingTop: 36, paddingBottom: 64 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 600, color: "var(--text-strong)", margin: "0 0 6px" }}>{title}</h1>
        <p style={{ color: "var(--text-subtle)", fontSize: 13.5, margin: "0 0 20px" }}>Last updated: {updated}</p>
        <div style={{ background: "var(--surface-muted)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)", padding: "12px 14px", fontSize: 13, color: "var(--text-muted)", margin: "0 0 26px" }}>
          Mesa is in beta. This is a plain-language draft to get us started — please have it reviewed by a lawyer before you rely on it.
        </div>
        {children}
      </article>
    </main>
  );
}

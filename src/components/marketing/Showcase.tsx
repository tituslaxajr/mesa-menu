import React from "react";
import { Check } from "lucide-react";

export interface ShowcaseProps {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  bullets: string[];
  visual: React.ReactNode;
  /** Put the visual on the left instead of the right. */
  reverse?: boolean;
}

/** Two-column marketing section: copy on one side, a visual on the other. */
export function Showcase({ id, eyebrow, title, body, bullets, visual, reverse }: ShowcaseProps) {
  return (
    <section id={id} className="mesa-container" style={{ paddingTop: 72, paddingBottom: 24, scrollMarginTop: 80 }}>
      <div
        className="mesa-showcase"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 48,
          alignItems: "center",
          direction: reverse ? "rtl" : "ltr",
        }}
      >
        <div style={{ direction: "ltr" }}>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: "var(--tracking-caps)",
              textTransform: "uppercase",
              color: "var(--brand)",
            }}
          >
            {eyebrow}
          </span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(30px, 4vw, 42px)",
              fontWeight: 500,
              color: "var(--text-strong)",
              letterSpacing: "-0.015em",
              margin: "12px 0 0",
              lineHeight: 1.1,
            }}
          >
            {title}
          </h2>
          <p style={{ fontSize: 17, color: "var(--text-muted)", lineHeight: 1.6, marginTop: 16, maxWidth: 480 }}>
            {body}
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0", display: "flex", flexDirection: "column", gap: 12 }}>
            {bullets.map((b) => (
              <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15.5, color: "var(--text-body)" }}>
                <span
                  style={{
                    flex: "none",
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    background: "var(--available-soft)",
                    color: "var(--sage-600)",
                    display: "grid",
                    placeItems: "center",
                    marginTop: 1,
                  }}
                >
                  <Check size={15} />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ direction: "ltr", display: "grid", placeItems: "center" }}>{visual}</div>
      </div>
    </section>
  );
}

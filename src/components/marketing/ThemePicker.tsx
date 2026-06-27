import { Card } from "@/components/ds";
import { THEMES } from "@/lib/data";

const ACCENTS = ["#C8592E", "#7A5230", "#6E8B5B", "#E0A53F", "#B6493F", "#3B2A21"];

/** Static visual for the Customization section: theme tiles + accent swatches. */
export function ThemePicker() {
  return (
    <Card variant="raised" padded style={{ width: "100%", maxWidth: 460 }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--text-strong)", marginBottom: 12 }}>
        Menu theme
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {THEMES.map((t, i) => (
          <div
            key={t.key}
            style={{
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              border: i === 0 ? "2px solid var(--brand)" : "1px solid var(--border-default)",
              background: t.swatch[0],
            }}
          >
            <div style={{ height: 46, background: t.swatch[0], display: "flex", alignItems: "flex-end", padding: 6, gap: 4 }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, background: t.swatch[1] }} />
              <span style={{ flex: 1, height: 8, borderRadius: 4, background: t.swatch[2], opacity: 0.5 }} />
            </div>
            <div style={{ padding: "6px 7px 8px", fontSize: 10.5, fontWeight: 600, color: "var(--text-body)", lineHeight: 1.2, background: "var(--surface-card)" }}>
              {t.name}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--text-strong)", margin: "20px 0 12px" }}>
        Accent colour
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {ACCENTS.map((c, i) => (
          <span
            key={c}
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: c,
              boxShadow: i === 0 ? "0 0 0 2px var(--surface-card), 0 0 0 4px var(--brand)" : "var(--shadow-xs)",
            }}
          />
        ))}
      </div>
    </Card>
  );
}

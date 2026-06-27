import { Card, Badge } from "@/components/ds";
import { MENU } from "@/lib/data";

/** Static visual of the owner menu manager (browser-window framed). */
export function DashboardMock() {
  const rows = MENU.slice(0, 4);
  return (
    <Card variant="raised" style={{ width: "100%", maxWidth: 460 }}>
      {/* window chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "12px 16px",
          background: "var(--surface-sunken)",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <span style={{ width: 11, height: 11, borderRadius: 999, background: "var(--berry-300)" }} />
        <span style={{ width: 11, height: 11, borderRadius: 999, background: "var(--honey-300)" }} />
        <span style={{ width: 11, height: 11, borderRadius: 999, background: "var(--sage-300)" }} />
        <span style={{ marginLeft: 10, fontSize: 12, color: "var(--text-subtle)", fontFamily: "var(--font-sans)" }}>
          mesa.menu/studio
        </span>
      </div>

      <div style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, color: "var(--text-strong)" }}>
            Your menu
          </span>
          <Badge variant="available" dot>
            Live
          </Badge>
        </div>

        {rows.map((m) => {
          const available = !m.soldOut;
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 0",
                borderBottom: "1px solid var(--border-soft)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.img}
                alt=""
                style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover", filter: available ? "none" : "grayscale(0.9)" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--text-strong)" }}>{m.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>₱{m.price}</div>
              </div>
              {/* static toggle visual mirroring the DS Switch */}
              <span
                aria-hidden
                style={{
                  position: "relative",
                  width: 46,
                  height: 28,
                  flex: "none",
                  borderRadius: 999,
                  background: available ? "var(--available)" : "var(--bean-300)",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: available ? 21 : 3,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "var(--white)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                />
              </span>
            </div>
          );
        })}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13, color: "var(--text-subtle)" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--brand)" }} />
          Saved · your live menu is updated
        </div>
      </div>
    </Card>
  );
}

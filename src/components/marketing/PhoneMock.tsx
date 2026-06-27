import { ShieldCheck } from "lucide-react";
import { DEMO_CAFE, MENU } from "@/lib/data";

/**
 * Small phone mockup rendering a slice of the live Mesa menu. Presentational —
 * used in the hero and showcase sections. Width is controlled by the caller.
 */
export function PhoneMock({ width = 290 }: { width?: number }) {
  const items = MENU.slice(0, 3);
  return (
    <div
      style={{
        width,
        flex: "none",
        borderRadius: 40,
        background: "#1F140E",
        padding: 10,
        boxShadow: "var(--shadow-xl)",
      }}
    >
      <div style={{ borderRadius: 31, overflow: "hidden", background: "var(--surface-page)" }}>
        <div style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DEMO_CAFE.cover}
            alt=""
            style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, rgba(31,20,14,0) 40%, rgba(31,20,14,0.8))",
            }}
          />
          <div style={{ position: "absolute", left: 16, bottom: 12, color: "#FBF6EE" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500 }}>
              {DEMO_CAFE.name}
            </div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>Open now · San Fernando</div>
          </div>
        </div>
        <div style={{ padding: "14px 16px 18px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <span style={{ background: "var(--brand)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 999 }}>
              Hot Coffee
            </span>
            <span style={{ background: "var(--surface-card)", border: "1px solid var(--border-default)", color: "var(--text-muted)", fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 999 }}>
              Iced
            </span>
          </div>
          {items.map((m) => (
            <div
              key={m.id}
              style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border-soft)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.img} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--text-strong)" }}>
                    {m.name}
                  </span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--text-strong)" }}>
                    ₱{m.price}
                  </span>
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1.3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.desc}
                </div>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 12, color: "var(--text-subtle)", fontSize: 10 }}>
            <ShieldCheck size={11} /> powered by{" "}
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-muted)" }}>
              Mesa
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

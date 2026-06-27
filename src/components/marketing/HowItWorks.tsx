const STEPS = [
  { n: "1", t: "Add your menu", d: "Type your items or paste them in. Add photos and prices." },
  { n: "2", t: "Print your QR", d: "Get a Mesa QR code for every table and your counter." },
  { n: "3", t: "Guests browse & order", d: "They scan, browse a beautiful menu, and order with your server." },
];

export function HowItWorks() {
  return (
    <section style={{ background: "var(--accent-espresso)", color: "var(--bean-50)", marginTop: 48 }}>
      <div className="mesa-container" style={{ paddingTop: 72, paddingBottom: 72 }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(30px, 4vw, 42px)",
            fontWeight: 500,
            color: "#fff",
            textAlign: "center",
            letterSpacing: "-0.015em",
          }}
        >
          Up and running this afternoon
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 28,
            marginTop: 44,
          }}
        >
          {STEPS.map((s) => (
            <div key={s.n}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  background: "var(--brand)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                {s.n}
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "#fff", marginTop: 16 }}>
                {s.t}
              </h3>
              <p style={{ fontSize: 15, color: "var(--bean-200)", lineHeight: 1.55, marginTop: 6 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

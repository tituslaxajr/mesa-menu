"use client";
import { useActionState, useState } from "react";
import { Coffee } from "lucide-react";
import { createCafe, type CafeFormState } from "@/lib/cafe-actions";
import { PLANS, type PlanId } from "@/lib/data";

const field: React.CSSProperties = {
  width: "100%",
  height: 46,
  borderRadius: "var(--radius-md)",
  border: "1.5px solid var(--border-default)",
  background: "var(--surface-card)",
  color: "var(--text-strong)",
  padding: "0 14px",
  fontSize: 15,
  fontFamily: "var(--font-sans)",
};
const label: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-body)",
  marginBottom: 6,
  fontFamily: "var(--font-sans)",
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<CafeFormState | undefined, FormData>(
    createCafe,
    undefined,
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState<PlanId>("brew");
  const effectiveSlug = slug ? slugify(slug) : slugify(name);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "var(--surface-page)",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--surface-card)",
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          padding: "30px 26px",
        }}
      >
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "var(--brand)",
            display: "grid",
            placeItems: "center",
            marginBottom: 16,
          }}
        >
          <Coffee size={22} style={{ color: "var(--brand-on)" }} />
        </span>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 25, color: "var(--text-strong)", margin: "0 0 4px" }}>
          Let’s set up your café
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 22px", fontFamily: "var(--font-sans)" }}>
          This creates your menu and its shareable link. You can change everything later.
        </p>

        <form action={formAction} style={{ display: "grid", gap: 16 }}>
          <div>
            <label htmlFor="name" style={label}>Café name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Kape Kalye"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={field}
            />
          </div>
          <div>
            <label htmlFor="slug" style={label}>Menu link</label>
            <input
              id="slug"
              name="slug"
              type="text"
              placeholder="auto from your name"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              style={field}
            />
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6, fontFamily: "var(--font-sans)" }}>
              Your menu will live at{" "}
              <span style={{ color: "var(--brand-active)", fontWeight: 600 }}>
                /m/{effectiveSlug || "your-cafe"}
              </span>
            </p>
          </div>

          <div>
            <label style={label}>Your plan</label>
            <input type="hidden" name="plan" value={plan} />
            <div style={{ display: "grid", gap: 8 }}>
              {PLANS.map((p) => {
                const on = plan === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPlan(p.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      textAlign: "left",
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      background: on ? "var(--brand-soft)" : "var(--surface-card)",
                      border: on ? "2px solid var(--brand)" : "1px solid var(--border-default)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    <span style={{ marginTop: 1, width: 18, height: 18, borderRadius: 999, flex: "none", border: on ? "5px solid var(--brand)" : "2px solid var(--border-default)" }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontWeight: 700, color: "var(--text-strong)", fontSize: 14.5 }}>{p.name}</span>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>₱{p.monthly}/mo</span>
                        {p.popular && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brand-active)" }}>Popular</span>}
                      </span>
                      <span style={{ display: "block", fontSize: 12.5, color: "var(--text-muted)" }}>{p.tagline}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: 6, fontFamily: "var(--font-sans)" }}>
              Beta: pick any tier to try it — no payment. Your tier is set at sign-up.
            </p>
          </div>

          {state?.error && (
            <p role="alert" style={{ fontSize: 13.5, color: "var(--danger, #b42318)", margin: 0, fontFamily: "var(--font-sans)" }}>
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{
              height: 48,
              border: 0,
              borderRadius: 999,
              background: "var(--brand)",
              color: "var(--brand-on)",
              fontSize: 15,
              fontWeight: 700,
              cursor: pending ? "default" : "pointer",
              opacity: pending ? 0.7 : 1,
              fontFamily: "var(--font-sans)",
              marginTop: 4,
            }}
          >
            {pending ? "Creating…" : "Create my menu"}
          </button>
        </form>
      </div>
    </main>
  );
}

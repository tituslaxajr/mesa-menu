"use client";
import { useActionState } from "react";
import Link from "next/link";
import { requestBetaAccess, type BetaRequestState } from "@/lib/beta-actions";

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
const textarea: React.CSSProperties = {
  ...field,
  height: "auto",
  minHeight: 88,
  padding: "12px 14px",
  resize: "vertical",
};
const label: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-body)",
  marginBottom: 6,
  fontFamily: "var(--font-sans)",
};

export function BetaRequestForm() {
  const [state, formAction, pending] = useActionState<BetaRequestState | undefined, FormData>(
    requestBetaAccess,
    undefined,
  );

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "var(--surface-page)", padding: 20 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--surface-card)",
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          padding: "28px 24px",
        }}
      >
        {state?.success ? (
          <>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--text-strong)", margin: "0 0 8px" }}>
              Thanks — request sent!
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, fontFamily: "var(--font-sans)" }}>
              We&apos;ll review your café and reach out. If you already have approved access,{" "}
              <Link href="/login" style={{ color: "var(--brand)", fontWeight: 600 }}>log in here</Link>.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--text-strong)", margin: "0 0 4px" }}>
              Apply for the Mesa beta
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 20px", fontFamily: "var(--font-sans)" }}>
              Mesa is invite-only while in beta. Tell us about your café and we&apos;ll follow up.
            </p>

            <form action={formAction} style={{ display: "grid", gap: 14 }}>
              <div>
                <label htmlFor="cafe_name" style={label}>Café name</label>
                <input id="cafe_name" name="cafe_name" type="text" placeholder="e.g. Kape Kalye" required style={field} />
              </div>
              <div>
                <label htmlFor="contact_name" style={label}>Your name</label>
                <input id="contact_name" name="contact_name" type="text" required style={field} />
              </div>
              <div>
                <label htmlFor="email" style={label}>Email</label>
                <input id="email" name="email" type="email" autoComplete="email" required style={field} />
              </div>
              <div>
                <label htmlFor="phone" style={label}>Phone <span style={{ fontWeight: 400, color: "var(--text-subtle)" }}>(optional)</span></label>
                <input id="phone" name="phone" type="tel" style={field} />
              </div>
              <div>
                <label htmlFor="message" style={label}>Anything else? <span style={{ fontWeight: 400, color: "var(--text-subtle)" }}>(optional)</span></label>
                <textarea id="message" name="message" placeholder="Café location, table count, current menu setup…" style={textarea} />
              </div>

              {state?.error && (
                <p role="alert" style={{ fontSize: 13.5, color: "var(--danger, #b42318)", margin: 0, fontFamily: "var(--font-sans)" }}>{state.error}</p>
              )}

              <button
                type="submit"
                disabled={pending}
                style={{ height: 48, border: 0, borderRadius: 999, background: "var(--brand)", color: "var(--brand-on)", fontSize: 15, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, fontFamily: "var(--font-sans)", marginTop: 4 }}
              >
                {pending ? "Sending…" : "Request access"}
              </button>
            </form>

            <p style={{ fontSize: 13.5, color: "var(--text-muted)", textAlign: "center", margin: "18px 0 0", fontFamily: "var(--font-sans)" }}>
              Already approved? <Link href="/signup" style={{ color: "var(--brand)", fontWeight: 600 }}>Create your account</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, signup, requestPasswordReset, updatePassword, type AuthState } from "@/lib/auth-actions";

type Mode = "login" | "signup" | "forgot" | "reset";

const ACTIONS: Record<Mode, (s: AuthState | undefined, f: FormData) => Promise<AuthState>> = {
  login,
  signup,
  forgot: requestPasswordReset,
  reset: updatePassword,
};

const COPY: Record<Mode, { title: string; sub: string; submit: string; submitting: string }> = {
  login: { title: "Welcome back", sub: "Log in to manage your café.", submit: "Log in", submitting: "Logging in…" },
  signup: { title: "Create your Mesa account", sub: "Start your café's menu in minutes.", submit: "Create account", submitting: "Creating…" },
  forgot: { title: "Reset your password", sub: "Enter your email and we'll send you a reset link.", submit: "Send reset link", submitting: "Sending…" },
  reset: { title: "Set a new password", sub: "Choose a new password for your account.", submit: "Update password", submitting: "Updating…" },
};

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

export function AuthForm({ mode, notice, presetPlan }: { mode: Mode; notice?: string; presetPlan?: string }) {
  const [state, formAction, pending] = useActionState<AuthState | undefined, FormData>(
    ACTIONS[mode],
    undefined,
  );
  const c = COPY[mode];
  const showCafe = mode === "signup";
  const showEmail = mode === "login" || mode === "signup" || mode === "forgot";
  const showPassword = mode === "login" || mode === "signup" || mode === "reset";
  const newPassword = mode === "signup" || mode === "reset";

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "var(--surface-page)", padding: 20 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--surface-card)",
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          padding: "28px 24px",
        }}
      >
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--text-strong)", margin: "0 0 4px" }}>{c.title}</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 20px", fontFamily: "var(--font-sans)" }}>{c.sub}</p>

        {notice && (
          <p style={{ fontSize: 13.5, color: "var(--brand-active)", background: "var(--brand-soft)", borderRadius: "var(--radius-md)", padding: "10px 12px", margin: "0 0 16px", fontFamily: "var(--font-sans)" }}>
            {notice}
          </p>
        )}

        <form action={formAction} style={{ display: "grid", gap: 14 }}>
          {showCafe && presetPlan && <input type="hidden" name="plan" value={presetPlan} />}
          {showCafe && (
            <div>
              <label htmlFor="cafe_name" style={label}>Café name</label>
              <input id="cafe_name" name="cafe_name" type="text" placeholder="e.g. Kape Kalye" style={field} />
            </div>
          )}
          {showEmail && (
            <div>
              <label htmlFor="email" style={label}>Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required style={field} />
            </div>
          )}
          {showPassword && (
            <div>
              <label htmlFor="password" style={label}>{mode === "reset" ? "New password" : "Password"}</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={newPassword ? "new-password" : "current-password"}
                required
                minLength={newPassword ? 8 : undefined}
                style={field}
              />
              {mode === "login" && (
                <div style={{ textAlign: "right", marginTop: 6 }}>
                  <Link href="/forgot-password" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Forgot password?</Link>
                </div>
              )}
            </div>
          )}

          {state?.error && (
            <p role="alert" style={{ fontSize: 13.5, color: "var(--danger, #b42318)", margin: 0, fontFamily: "var(--font-sans)" }}>{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{ height: 48, border: 0, borderRadius: 999, background: "var(--brand)", color: "var(--brand-on)", fontSize: 15, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, fontFamily: "var(--font-sans)", marginTop: 4 }}
          >
            {pending ? c.submitting : c.submit}
          </button>
        </form>

        <p style={{ fontSize: 13.5, color: "var(--text-muted)", textAlign: "center", margin: "18px 0 0", fontFamily: "var(--font-sans)" }}>
          {mode === "signup" ? (
            <>Already have an account? <Link href="/login" style={{ color: "var(--brand)", fontWeight: 600 }}>Log in</Link></>
          ) : mode === "login" ? (
            <>New to Mesa? <Link href="/signup" style={{ color: "var(--brand)", fontWeight: 600 }}>Create an account</Link></>
          ) : (
            <Link href="/login" style={{ color: "var(--brand)", fontWeight: 600 }}>Back to log in</Link>
          )}
        </p>
      </div>
    </main>
  );
}

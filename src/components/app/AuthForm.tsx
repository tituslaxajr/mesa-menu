"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, signup, type AuthState } from "@/lib/auth-actions";

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

export function AuthForm({ mode, notice }: { mode: "login" | "signup"; notice?: string }) {
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState<AuthState | undefined, FormData>(
    action,
    undefined,
  );
  const isSignup = mode === "signup";

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
          maxWidth: 400,
          background: "var(--surface-card)",
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          padding: "28px 24px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            color: "var(--text-strong)",
            margin: "0 0 4px",
          }}
        >
          {isSignup ? "Create your Mesa account" : "Welcome back"}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 20px", fontFamily: "var(--font-sans)" }}>
          {isSignup ? "Start your café's menu in minutes." : "Log in to manage your café."}
        </p>

        {notice && (
          <p
            style={{
              fontSize: 13.5,
              color: "var(--brand-active)",
              background: "var(--brand-soft)",
              borderRadius: "var(--radius-md)",
              padding: "10px 12px",
              margin: "0 0 16px",
              fontFamily: "var(--font-sans)",
            }}
          >
            {notice}
          </p>
        )}

        <form action={formAction} style={{ display: "grid", gap: 14 }}>
          {isSignup && (
            <div>
              <label htmlFor="cafe_name" style={label}>Café name</label>
              <input id="cafe_name" name="cafe_name" type="text" placeholder="e.g. Kape Kalye" style={field} />
            </div>
          )}
          <div>
            <label htmlFor="email" style={label}>Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required style={field} />
          </div>
          <div>
            <label htmlFor="password" style={label}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={isSignup ? 8 : undefined}
              style={field}
            />
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
            {pending ? "Please wait…" : isSignup ? "Create account" : "Log in"}
          </button>
        </form>

        <p style={{ fontSize: 13.5, color: "var(--text-muted)", textAlign: "center", margin: "18px 0 0", fontFamily: "var(--font-sans)" }}>
          {isSignup ? (
            <>Already have an account? <Link href="/login" style={{ color: "var(--brand)", fontWeight: 600 }}>Log in</Link></>
          ) : (
            <>New to Mesa? <Link href="/signup" style={{ color: "var(--brand)", fontWeight: 600 }}>Create an account</Link></>
          )}
        </p>
      </div>
    </main>
  );
}

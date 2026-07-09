"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "var(--surface-page)", padding: 20, fontFamily: "var(--font-sans)" }}>
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--text-strong)" }}>Something went wrong</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          We&apos;ve been notified and are looking into it.
        </p>
        <button
          onClick={() => reset()}
          style={{ marginTop: 16, padding: "8px 18px", borderRadius: 999, border: "none", background: "var(--brand)", color: "var(--brand-on)", fontWeight: 600, cursor: "pointer" }}
        >
          Try again
        </button>
        {error.digest && (
          <p style={{ color: "var(--text-subtle)", fontSize: 12, marginTop: 14 }}>Reference: {error.digest}</p>
        )}
      </div>
    </main>
  );
}

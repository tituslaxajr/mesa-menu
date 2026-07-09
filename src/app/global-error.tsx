"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fdfaf6" }}>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ textAlign: "center", maxWidth: 360 }}>
            <h1 style={{ fontSize: 22, color: "#241c14" }}>Something went wrong</h1>
            <p style={{ color: "#6b5d4f", marginTop: 6 }}>
              We&apos;ve been notified and are looking into it. Please try refreshing the page.
            </p>
            {error.digest && (
              <p style={{ color: "#a89a89", fontSize: 12, marginTop: 14 }}>Reference: {error.digest}</p>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}

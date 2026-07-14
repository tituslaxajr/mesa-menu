// Shared chrome for the whole /admin area. This is the single place the
// platform-admin gate lives now — every admin page renders as this layout's
// `children`, so a non-admin never sees any of them (and RLS returns them no
// rows regardless). Also owns the sticky header + tab nav and computes the two
// attention counts the nav badges show.
import type { ReactNode } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { Logo, Badge } from "@/components/ds";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await verifySession();
  const supabase = await createClient();

  const { data: adminRow } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "var(--surface-page)",
          padding: 20,
          fontFamily: "var(--font-sans)",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontSize: 34, marginBottom: 8 }} aria-hidden>
            🔒
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--text-strong)" }}>
            Not authorized
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
            This area is for Mesa platform admins only.
          </p>
          <p style={{ marginTop: 16 }}>
            <Link href="/dashboard" style={{ color: "var(--brand)", fontWeight: 600 }}>
              Go to your dashboard →
            </Link>
          </p>
        </div>
      </main>
    );
  }

  const [{ data: reqRows }, { data: fbRows }] = await Promise.all([
    supabase.from("beta_requests").select("status").eq("status", "pending"),
    supabase.from("admin_feedback_overview").select("needs_reply"),
  ]);
  const pending = (reqRows ?? []).length;
  const needsReply = (fbRows ?? []).filter((f) => (f as { needs_reply: boolean }).needs_reply).length;

  return (
    <div style={{ minHeight: "100dvh", background: "var(--surface-page)", fontFamily: "var(--font-sans)" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "color-mix(in oklab, var(--surface-card) 88%, transparent)",
          backdropFilter: "saturate(1.4) blur(8px)",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size="sm" />
            <Badge variant="brand" size="sm">
              Admin
            </Badge>
          </div>
          <Link
            href="/dashboard"
            style={{ fontSize: 13.5, color: "var(--text-muted)", fontWeight: 600, textDecoration: "none" }}
          >
            My dashboard →
          </Link>
        </div>
        <AdminNav pending={pending} needsReply={needsReply} />
      </header>

      {children}
    </div>
  );
}

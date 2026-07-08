import type { Metadata } from "next";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getBetaRequests } from "@/lib/beta-actions";
import { RequestActions } from "./RequestActions";

export const metadata: Metadata = { title: "Beta requests — Mesa" };

const fmt = (ms: number | null) =>
  ms ? new Date(ms).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const cell: React.CSSProperties = { padding: "10px 12px", fontSize: 13.5, color: "var(--text-body)", borderBottom: "1px solid var(--border-soft)", verticalAlign: "top" };
const head: React.CSSProperties = { ...cell, fontWeight: 700, color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1.5px solid var(--border-default)" };

export default async function AdminRequestsPage() {
  const user = await verifySession();
  const supabase = await createClient();

  const { data: adminRow } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "var(--surface-page)", padding: 20, fontFamily: "var(--font-sans)" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--text-strong)" }}>Not authorized</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 6 }}>This page is for Mesa platform admins.</p>
          <p style={{ marginTop: 16 }}><Link href="/dashboard" style={{ color: "var(--brand)", fontWeight: 600 }}>Go to your dashboard →</Link></p>
        </div>
      </main>
    );
  }

  const rows = await getBetaRequests();
  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <main style={{ minHeight: "100dvh", background: "var(--surface-page)", padding: "32px 24px", fontFamily: "var(--font-sans)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          <div>
            <Link href="/admin" style={{ fontSize: 13, color: "var(--brand)", fontWeight: 600 }}>← Beta overview</Link>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--text-strong)", marginTop: 4 }}>Beta requests</h1>
          </div>
          <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
            {rows.length} request{rows.length === 1 ? "" : "s"}{pending > 0 ? ` · ${pending} pending` : ""}
          </span>
        </div>

        <div style={{ overflowX: "auto", background: "var(--surface-card)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-lg)" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 820 }}>
            <thead>
              <tr>
                <th style={{ ...head, textAlign: "left" }}>Café / contact</th>
                <th style={{ ...head, textAlign: "left" }}>Email / phone</th>
                <th style={{ ...head, textAlign: "left" }}>Message</th>
                <th style={{ ...head, textAlign: "center" }}>Status</th>
                <th style={{ ...head, textAlign: "left" }}>Submitted</th>
                <th style={{ ...head, textAlign: "left" }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td style={cell} colSpan={6}>No beta requests yet.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...cell, color: "var(--text-strong)", fontWeight: 600 }}>
                      {r.cafeName}
                      <div style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>{r.contactName}</div>
                    </td>
                    <td style={cell}>
                      {r.email}
                      {r.phone && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.phone}</div>}
                    </td>
                    <td style={{ ...cell, whiteSpace: "normal", maxWidth: 320, color: "var(--text-muted)" }}>{r.message || "—"}</td>
                    <td style={{ ...cell, textAlign: "center", textTransform: "capitalize" }}>{r.status}</td>
                    <td style={cell}>
                      {fmt(r.createdAt)}
                      {r.reviewedAt && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>reviewed {fmt(r.reviewedAt)}</div>}
                    </td>
                    <td style={cell}>
                      {r.usedAt ? (
                        <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Signed up {fmt(r.usedAt)}</span>
                      ) : (
                        <RequestActions id={r.id} status={r.status} />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

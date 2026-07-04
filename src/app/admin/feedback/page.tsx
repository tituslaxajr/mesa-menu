import type { Metadata } from "next";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getAdminInbox } from "@/lib/feedback-actions";

export const metadata: Metadata = { title: "Feedback inbox — Mesa" };

const fmt = (ms: number) =>
  new Date(ms).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const cell: React.CSSProperties = { padding: "10px 12px", fontSize: 13.5, color: "var(--text-body)", borderBottom: "1px solid var(--border-soft)", whiteSpace: "nowrap" };
const head: React.CSSProperties = { ...cell, fontWeight: 700, color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1.5px solid var(--border-default)" };

export default async function AdminFeedbackPage() {
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

  const rows = await getAdminInbox();
  const needsReply = rows.filter((r) => r.needsReply).length;

  return (
    <main style={{ minHeight: "100dvh", background: "var(--surface-page)", padding: "32px 24px", fontFamily: "var(--font-sans)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          <div>
            <Link href="/admin" style={{ fontSize: 13, color: "var(--brand)", fontWeight: 600 }}>← Beta overview</Link>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--text-strong)", marginTop: 4 }}>Feedback inbox</h1>
          </div>
          <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
            {rows.length} thread{rows.length === 1 ? "" : "s"}{needsReply > 0 ? ` · ${needsReply} need${needsReply === 1 ? "s" : ""} reply` : ""}
          </span>
        </div>

        <div style={{ overflowX: "auto", background: "var(--surface-card)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-lg)" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ ...head, textAlign: "left" }}>Subject</th>
                <th style={{ ...head, textAlign: "left" }}>Café</th>
                <th style={{ ...head, textAlign: "center" }}>Status</th>
                <th style={{ ...head, textAlign: "right" }}>Msgs</th>
                <th style={{ ...head, textAlign: "left" }}>Last activity</th>
                <th style={{ ...head, textAlign: "left" }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td style={cell} colSpan={6}>No feedback yet.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.threadId}>
                    <td style={{ ...cell, color: "var(--text-strong)", fontWeight: 600, whiteSpace: "normal", maxWidth: 320 }}>
                      <Link href={`/admin/feedback/${r.threadId}`} style={{ color: "inherit", textDecoration: "none" }}>{r.subject}</Link>
                      {r.needsReply && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "var(--brand)", border: "1px solid var(--brand)", borderRadius: 999, padding: "1px 7px" }}>Needs reply</span>}
                    </td>
                    <td style={cell}>{r.cafeName ?? r.accountName}<div style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>{r.accountName}</div></td>
                    <td style={{ ...cell, textAlign: "center", textTransform: "capitalize" }}>{r.status}</td>
                    <td style={{ ...cell, textAlign: "right" }}>{r.messageCount}</td>
                    <td style={cell}>{fmt(r.lastMessageAt)}<div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.lastSenderRole === "admin" ? "you replied" : "café sent"}</div></td>
                    <td style={cell}><Link href={`/admin/feedback/${r.threadId}`} style={{ color: "var(--brand)", fontWeight: 600 }}>Open →</Link></td>
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

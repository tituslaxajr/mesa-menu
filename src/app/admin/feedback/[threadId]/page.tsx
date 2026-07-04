import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getAdminThread, markRead } from "@/lib/feedback-actions";
import { ReplyComposer } from "./ReplyComposer";

export const metadata: Metadata = { title: "Feedback thread — Mesa" };

type Params = { threadId: string };

const fmt = (ms: number) =>
  new Date(ms).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function AdminFeedbackThreadPage({ params }: { params: Promise<Params> }) {
  const { threadId } = await params;
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

  const thread = await getAdminThread(threadId);
  if (!thread) notFound();
  // Opening the thread clears the admin's unread marker for it.
  await markRead(threadId);

  return (
    <main style={{ minHeight: "100dvh", background: "var(--surface-page)", padding: "32px 24px", fontFamily: "var(--font-sans)" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link href="/admin/feedback" style={{ fontSize: 13, color: "var(--brand)", fontWeight: 600 }}>← Feedback inbox</Link>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginTop: 4, marginBottom: 6 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--text-strong)" }}>{thread.subject}</h1>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "capitalize", color: thread.status === "open" ? "var(--brand)" : "var(--text-muted)" }}>{thread.status}</span>
        </div>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 18 }}>
          {thread.cafeName ?? thread.accountName}{thread.cafeName ? ` · ${thread.accountName}` : ""}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--surface-card)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-lg)", padding: 18 }}>
          {thread.messages.map((m) => {
            const mine = m.senderRole === "admin"; // admin viewing → own replies on the right
            return (
              <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%" }}>
                <div style={{ background: mine ? "var(--brand)" : "var(--surface-page)", color: mine ? "var(--brand-on)" : "var(--text-body)", border: mine ? "none" : "1px solid var(--border-soft)", borderRadius: 14, padding: "9px 13px", fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {m.body}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, textAlign: mine ? "right" : "left" }}>
                  {mine ? "You (Mesa)" : "Café"} · {fmt(m.createdAt)}
                </div>
              </div>
            );
          })}
        </div>

        <ReplyComposer threadId={thread.id} status={thread.status} />
      </div>
    </main>
  );
}

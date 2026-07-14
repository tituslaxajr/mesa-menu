import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminThread, markRead } from "@/lib/feedback-actions";
import { ThreadStatusBadge } from "../../ui";
import { ReplyComposer } from "./ReplyComposer";

export const metadata: Metadata = { title: "Feedback thread — Mesa" };

type Params = { threadId: string };

const fmt = (ms: number) =>
  new Date(ms).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function AdminFeedbackThreadPage({ params }: { params: Promise<Params> }) {
  const { threadId } = await params;

  // Gate is in layout.tsx. getAdminThread is RLS-scoped to admins.
  const thread = await getAdminThread(threadId);
  if (!thread) notFound();
  // Opening the thread clears the admin's unread marker for it.
  await markRead(threadId);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 24px 64px" }}>
      <Link
        href="/admin/feedback"
        style={{ fontSize: 13, color: "var(--brand)", fontWeight: 600, textDecoration: "none" }}
      >
        ← Feedback inbox
      </Link>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 8,
          marginBottom: 4,
        }}
      >
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 25, color: "var(--text-strong)", letterSpacing: "-0.01em" }}>
          {thread.subject}
        </h1>
        <ThreadStatusBadge status={thread.status} />
      </div>
      <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 18 }}>
        {thread.cafeName ?? thread.accountName}
        {thread.cafeName ? ` · ${thread.accountName}` : ""}
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "var(--surface-card)",
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xs)",
          padding: 18,
        }}
      >
        {thread.messages.map((m) => {
          const mine = m.senderRole === "admin"; // admin viewing → own replies on the right
          return (
            <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%" }}>
              <div
                style={{
                  background: mine ? "var(--brand)" : "var(--surface-sunken)",
                  color: mine ? "var(--brand-on)" : "var(--text-body)",
                  border: mine ? "none" : "1px solid var(--border-soft)",
                  borderRadius: 16,
                  borderBottomRightRadius: mine ? 5 : 16,
                  borderBottomLeftRadius: mine ? 16 : 5,
                  padding: "10px 14px",
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.body}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-subtle)",
                  marginTop: 4,
                  textAlign: mine ? "right" : "left",
                }}
              >
                {mine ? "You (Mesa)" : "Café"} · {fmt(m.createdAt)}
              </div>
            </div>
          );
        })}
      </div>

      <ReplyComposer threadId={thread.id} status={thread.status} />
    </div>
  );
}

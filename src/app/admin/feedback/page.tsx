import type { Metadata } from "next";
import Link from "next/link";
import { getAdminInbox } from "@/lib/feedback-actions";
import { Badge } from "@/components/ds";
import {
  contentWrap,
  PageHeading,
  StatRow,
  StatCard,
  tableCard,
  cell,
  head,
  EmptyState,
  ThreadStatusBadge,
} from "../ui";

export const metadata: Metadata = { title: "Feedback inbox — Mesa" };

const fmt = (ms: number) =>
  new Date(ms).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function AdminFeedbackPage() {
  // Gate is in layout.tsx. getAdminInbox returns zero rows to non-admins.
  const rows = await getAdminInbox();
  const needsReply = rows.filter((r) => r.needsReply).length;
  const open = rows.filter((r) => r.status === "open").length;

  return (
    <div style={contentWrap}>
      <PageHeading
        title="Feedback inbox"
        subtitle="Two-way conversations with cafés. Open a thread to read and reply."
      />

      <StatRow>
        <StatCard label="Threads" value={rows.length} />
        <StatCard label="Needs reply" value={needsReply} tone="alert" hint="Café is waiting on you" />
        <StatCard label="Open" value={open} />
        <StatCard label="Closed" value={rows.length - open} />
      </StatRow>

      {rows.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No feedback yet"
          hint="When a café sends feedback or a support message, the thread shows up here."
        />
      ) : (
        <div style={tableCard}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
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
              {rows.map((r) => (
                <tr key={r.threadId} style={r.needsReply ? { background: "var(--soldout-soft)" } : undefined}>
                  <td style={{ ...cell, whiteSpace: "normal", maxWidth: 340 }}>
                    <Link
                      href={`/admin/feedback/${r.threadId}`}
                      style={{ color: "var(--text-strong)", fontWeight: 600, textDecoration: "none" }}
                    >
                      {r.subject}
                    </Link>
                    {r.needsReply && (
                      <span style={{ marginLeft: 8, display: "inline-block", verticalAlign: "middle" }}>
                        <Badge variant="soldout" size="sm" dot>
                          Needs reply
                        </Badge>
                      </span>
                    )}
                  </td>
                  <td style={cell}>
                    {r.cafeName ?? r.accountName}
                    {r.cafeName && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.accountName}</div>
                    )}
                  </td>
                  <td style={{ ...cell, textAlign: "center" }}>
                    <ThreadStatusBadge status={r.status} />
                  </td>
                  <td style={{ ...cell, textAlign: "right" }}>{r.messageCount}</td>
                  <td style={cell}>
                    {fmt(r.lastMessageAt)}
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {r.lastSenderRole === "admin" ? "you replied" : "café sent"}
                    </div>
                  </td>
                  <td style={cell}>
                    <Link href={`/admin/feedback/${r.threadId}`} style={{ color: "var(--brand)", fontWeight: 600, textDecoration: "none" }}>
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

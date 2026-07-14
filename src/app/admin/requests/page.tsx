import type { Metadata } from "next";
import { getBetaRequests } from "@/lib/beta-actions";
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
  BetaStatusBadge,
  EmailLink,
} from "../ui";
import { RequestActions } from "./RequestActions";

export const metadata: Metadata = { title: "Beta applicants — Mesa" };

const fmt = (ms: number | null) =>
  ms ? new Date(ms).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export default async function AdminRequestsPage() {
  // Gate is in layout.tsx. getBetaRequests is RLS-scoped to admins.
  const rows = await getBetaRequests();
  const pending = rows.filter((r) => r.status === "pending").length;
  const approved = rows.filter((r) => r.status === "approved").length;
  const signedUp = rows.filter((r) => r.usedAt).length;

  return (
    <div style={contentWrap}>
      <PageHeading
        title="Beta applicants"
        subtitle="Everyone who applied for beta access. Approve to let them sign up; reject to decline."
      />

      <StatRow>
        <StatCard label="Applicants" value={rows.length} />
        <StatCard label="Awaiting review" value={pending} tone="alert" hint="Need a decision" />
        <StatCard label="Approved" value={approved} tone="good" />
        <StatCard label="Signed up" value={signedUp} />
      </StatRow>

      {rows.length === 0 ? (
        <EmptyState
          icon="📥"
          title="No applicants yet"
          hint="Applications land here when someone submits the “request access” form."
        />
      ) : (
        <div style={tableCard}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 860 }}>
            <thead>
              <tr>
                <th style={{ ...head, textAlign: "left" }}>Café / contact</th>
                <th style={{ ...head, textAlign: "left" }}>Email / phone</th>
                <th style={{ ...head, textAlign: "left" }}>Message</th>
                <th style={{ ...head, textAlign: "center" }}>Status</th>
                <th style={{ ...head, textAlign: "left" }}>Submitted</th>
                <th style={{ ...head, textAlign: "left" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ ...cell, color: "var(--text-strong)", fontWeight: 600 }}>
                    {r.cafeName}
                    <div style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>{r.contactName}</div>
                  </td>
                  <td style={cell}>
                    <EmailLink email={r.email} />
                    {r.phone && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.phone}</div>}
                  </td>
                  <td style={{ ...cell, whiteSpace: "normal", maxWidth: 320, color: "var(--text-muted)" }}>
                    {r.message || "—"}
                  </td>
                  <td style={{ ...cell, textAlign: "center" }}>
                    <BetaStatusBadge status={r.status} />
                  </td>
                  <td style={cell}>
                    {fmt(r.createdAt)}
                    {r.reviewedAt && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>reviewed {fmt(r.reviewedAt)}</div>
                    )}
                  </td>
                  <td style={cell}>
                    {r.usedAt ? (
                      <Badge variant="neutral" size="sm">
                        Signed up {fmt(r.usedAt)}
                      </Badge>
                    ) : (
                      <RequestActions id={r.id} status={r.status} />
                    )}
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

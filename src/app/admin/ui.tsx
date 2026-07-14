// Shared presentational helpers for the platform-admin area. Plain server
// components (no client interactivity) so they compose inside the admin pages,
// which are all server components. Keeps the tables, stat tiles, status pills,
// and empty states consistent across Overview / Requests / Feedback.
import React from "react";
import Link from "next/link";
import { Badge, type BadgeVariant } from "@/components/ds";

/* ---- Layout container the pages render their content into ------------------ */
export const contentWrap: React.CSSProperties = {
  maxWidth: 1120,
  margin: "0 auto",
  padding: "28px 24px 64px",
};

/* ---- Section heading ------------------------------------------------------- */
export function PageHeading({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 20,
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 27,
            lineHeight: 1.15,
            color: "var(--text-strong)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 5 }}>{subtitle}</p>
        )}
      </div>
      {right && <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{right}</div>}
    </div>
  );
}

/* ---- Stat tiles ------------------------------------------------------------ */
export function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 12,
        marginBottom: 22,
      }}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** "alert" tints the tile when the number needs attention (and is > 0). */
  tone?: "default" | "alert" | "good";
}) {
  const active = tone !== "default" && value !== 0 && value !== "0";
  const accent =
    tone === "alert" ? "var(--soldout)" : tone === "good" ? "var(--available)" : "var(--border-default)";
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-soft)",
        borderLeft: `3px solid ${active ? accent : "var(--border-default)"}`,
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".05em",
          color: "var(--text-subtle)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 28,
          lineHeight: 1.1,
          marginTop: 4,
          color: active ? accent : "var(--text-strong)",
        }}
      >
        {value}
      </div>
      {hint && <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

/* ---- Table shell (scrolls horizontally on narrow screens) ------------------ */
export const tableCard: React.CSSProperties = {
  overflowX: "auto",
  background: "var(--surface-card)",
  border: "1px solid var(--border-soft)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-xs)",
};

export const cell: React.CSSProperties = {
  padding: "13px 14px",
  fontSize: 13.5,
  color: "var(--text-body)",
  borderBottom: "1px solid var(--border-soft)",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

export const head: React.CSSProperties = {
  ...cell,
  padding: "11px 14px",
  fontWeight: 700,
  color: "var(--text-subtle)",
  fontSize: 11.5,
  textTransform: "uppercase",
  letterSpacing: ".05em",
  background: "var(--surface-sunken)",
  borderBottom: "1.5px solid var(--border-default)",
  position: "sticky",
  top: 0,
};

/* ---- Empty state ----------------------------------------------------------- */
export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: string;
  title: string;
  hint?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: "56px 24px",
        background: "var(--surface-card)",
        border: "1px dashed var(--border-default)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div style={{ fontSize: 34, marginBottom: 8, lineHeight: 1 }} aria-hidden>
        {icon}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-strong)" }}>
        {title}
      </div>
      {hint && (
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 5, maxWidth: 360 }}>{hint}</p>
      )}
    </div>
  );
}

/* ---- Status pills ---------------------------------------------------------- */
const BETA: Record<string, { variant: BadgeVariant; label: string }> = {
  pending: { variant: "highlight", label: "Pending" },
  approved: { variant: "available", label: "Approved" },
  rejected: { variant: "soldout", label: "Rejected" },
};
export function BetaStatusBadge({ status }: { status: string }) {
  const s = BETA[status] ?? { variant: "neutral" as BadgeVariant, label: status };
  return (
    <Badge variant={s.variant} size="sm" dot>
      {s.label}
    </Badge>
  );
}

export function ThreadStatusBadge({ status }: { status: "open" | "closed" }) {
  return status === "open" ? (
    <Badge variant="brand" size="sm" dot>
      Open
    </Badge>
  ) : (
    <Badge variant="neutral" size="sm">
      Closed
    </Badge>
  );
}

/* ---- Copy-friendly email (mailto) ------------------------------------------ */
export function EmailLink({ email }: { email: string }) {
  return (
    <Link
      href={`mailto:${email}`}
      style={{ color: "var(--brand)", fontWeight: 600, textDecoration: "none" }}
    >
      {email}
    </Link>
  );
}

"use client";
// Platform-admin tab bar. A Client Component so it can highlight the active
// route with usePathname (a server layout can't read the pathname — it's cached
// across navigations). Counts are passed down from the server layout.
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  href: string;
  label: string;
  /** Number shown as an attention chip; hidden when 0. */
  count?: number;
  tone?: "info" | "alert";
}

export function AdminNav({ pending, needsReply }: { pending: number; needsReply: number }) {
  const pathname = usePathname();
  const tabs: Tab[] = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/requests", label: "Applicants", count: pending, tone: "info" },
    { href: "/admin/feedback", label: "Feedback", count: needsReply, tone: "alert" },
  ];

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav
      style={{
        display: "flex",
        gap: 4,
        overflowX: "auto",
        maxWidth: 1120,
        margin: "0 auto",
        padding: "0 24px",
      }}
    >
      {tabs.map((t) => {
        const active = isActive(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 14px",
              fontSize: 14,
              fontWeight: active ? 700 : 600,
              color: active ? "var(--brand)" : "var(--text-muted)",
              textDecoration: "none",
              whiteSpace: "nowrap",
              borderBottom: `2.5px solid ${active ? "var(--brand)" : "transparent"}`,
              marginBottom: -1,
            }}
          >
            {t.label}
            {t.count ? (
              <span
                style={{
                  minWidth: 19,
                  height: 19,
                  padding: "0 6px",
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "var(--brand-on)",
                  background: t.tone === "alert" ? "var(--soldout)" : "var(--brand)",
                }}
              >
                {t.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

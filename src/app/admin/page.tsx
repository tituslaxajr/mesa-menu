import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
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
} from "./ui";

export const metadata: Metadata = { title: "Beta overview — Mesa" };

interface Row {
  account_name: string;
  plan: string;
  plan_status: string;
  cafe_name: string;
  slug: string;
  published: boolean;
  menu_items_count: number;
  orders_total: number;
  orders_open: number;
  last_order_at: string | null;
  created_at: string;
}

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : "—";

export default async function AdminPage() {
  // The gate lives in layout.tsx; this view just reads the RLS-scoped,
  // non-PII overview (admins only — returns zero rows to everyone else).
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_cafe_overview")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  const liveCount = rows.filter((r) => r.published).length;
  const totalOrders = rows.reduce((n, r) => n + r.orders_total, 0);
  const openOrders = rows.reduce((n, r) => n + r.orders_open, 0);

  return (
    <div style={contentWrap}>
      <PageHeading
        title="Beta overview"
        subtitle="Every café on Mesa at a glance — no order contents, diner data, or team identities."
      />

      <StatRow>
        <StatCard label="Cafés" value={rows.length} />
        <StatCard label="Live menus" value={liveCount} hint={`${rows.length - liveCount} in draft`} tone="good" />
        <StatCard label="Orders" value={totalOrders} />
        <StatCard label="Open orders" value={openOrders} tone="alert" />
      </StatRow>

      {rows.length === 0 ? (
        <EmptyState icon="🍽️" title="No cafés yet" hint="Cafés appear here once an approved applicant finishes signing up." />
      ) : (
        <div style={tableCard}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 780 }}>
            <thead>
              <tr>
                <th style={{ ...head, textAlign: "left" }}>Café</th>
                <th style={{ ...head, textAlign: "left" }}>Account</th>
                <th style={{ ...head, textAlign: "left" }}>Plan</th>
                <th style={{ ...head, textAlign: "center" }}>Status</th>
                <th style={{ ...head, textAlign: "right" }}>Items</th>
                <th style={{ ...head, textAlign: "right" }}>Orders</th>
                <th style={{ ...head, textAlign: "left" }}>Last order</th>
                <th style={{ ...head, textAlign: "left" }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.slug}>
                  <td style={{ ...cell, color: "var(--text-strong)", fontWeight: 600 }}>
                    {r.cafe_name}
                    <div style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>/m/{r.slug}</div>
                  </td>
                  <td style={cell}>{r.account_name}</td>
                  <td style={cell}>
                    <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{r.plan}</span>
                    <span style={{ color: "var(--text-subtle)" }}> · {r.plan_status}</span>
                  </td>
                  <td style={{ ...cell, textAlign: "center" }}>
                    {r.published ? (
                      <Badge variant="available" size="sm" dot>
                        Live
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        Draft
                      </Badge>
                    )}
                  </td>
                  <td style={{ ...cell, textAlign: "right" }}>{r.menu_items_count}</td>
                  <td style={{ ...cell, textAlign: "right" }}>
                    {r.orders_total}
                    {r.orders_open ? (
                      <span style={{ color: "var(--soldout)", fontWeight: 600 }}> · {r.orders_open} open</span>
                    ) : null}
                  </td>
                  <td style={cell}>{fmtDate(r.last_order_at)}</td>
                  <td style={cell}>{fmtDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

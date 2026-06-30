import type { Metadata } from "next";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Beta overview — Mesa" };

/* eslint-disable @typescript-eslint/no-explicit-any */
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

const cell: React.CSSProperties = { padding: "10px 12px", fontSize: 13.5, color: "var(--text-body)", borderBottom: "1px solid var(--border-soft)", whiteSpace: "nowrap" };
const head: React.CSSProperties = { ...cell, fontWeight: 700, color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1.5px solid var(--border-default)" };

export default async function AdminPage() {
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

  const { data } = await supabase
    .from("admin_cafe_overview")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <main style={{ minHeight: "100dvh", background: "var(--surface-page)", padding: "32px 24px", fontFamily: "var(--font-sans)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--text-strong)" }}>Beta overview</h1>
          <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{rows.length} café{rows.length === 1 ? "" : "s"}</span>
        </div>

        <div style={{ overflowX: "auto", background: "var(--surface-card)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-lg)" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
            <thead>
              <tr>
                <th style={{ ...head, textAlign: "left" }}>Café</th>
                <th style={{ ...head, textAlign: "left" }}>Account</th>
                <th style={{ ...head, textAlign: "left" }}>Plan</th>
                <th style={{ ...head, textAlign: "center" }}>Live</th>
                <th style={{ ...head, textAlign: "right" }}>Items</th>
                <th style={{ ...head, textAlign: "right" }}>Orders</th>
                <th style={{ ...head, textAlign: "left" }}>Last order</th>
                <th style={{ ...head, textAlign: "left" }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td style={cell} colSpan={8}>No cafés yet.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.slug}>
                    <td style={{ ...cell, color: "var(--text-strong)", fontWeight: 600 }}>{r.cafe_name}<div style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>/m/{r.slug}</div></td>
                    <td style={cell}>{r.account_name}</td>
                    <td style={cell}><span style={{ textTransform: "capitalize" }}>{r.plan}</span> <span style={{ color: "var(--text-subtle)" }}>· {r.plan_status}</span></td>
                    <td style={{ ...cell, textAlign: "center" }}>{r.published ? "✅" : "—"}</td>
                    <td style={{ ...cell, textAlign: "right" }}>{r.menu_items_count}</td>
                    <td style={{ ...cell, textAlign: "right" }}>{r.orders_total}{r.orders_open ? ` (${r.orders_open} open)` : ""}</td>
                    <td style={cell}>{fmtDate(r.last_order_at)}</td>
                    <td style={cell}>{fmtDate(r.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: 14 }}>
          Read-only beta overview — no order contents, diner data, or team identities are shown.
        </p>
      </div>
    </main>
  );
}

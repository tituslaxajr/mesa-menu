"use client";

import { useState } from "react";
import {
  Download,
  Printer,
  Banknote,
  TrendingUp,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { Button, Select, Card } from "@/components/ds";
import { type Order } from "@/lib/orders-store";
import { computeSales, ordersInScope, downloadCSV, printReport, fmtDate, dayStartOf, DAY_MS } from "@/lib/sales";
import { useNow, PageWrap, StatCard, SectionTitle } from "../shared";

/* ════ ANALYTICS ═══════════════════════════════════════════════════ */
function LineChart({ series, days }: { series: number[]; days: string[] }) {
  const w = 560, h = 200, pad = 28;
  const max = Math.max(...series, 1) * 1.12;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (series.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const pts = series.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${pad},${h - pad} ${pts} ${w - pad},${h - pad}`;
  const peak = series.indexOf(Math.max(...series));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="mesaArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((g, i) => (
        <line key={i} x1={pad} x2={w - pad} y1={pad + g * (h - pad * 2)} y2={pad + g * (h - pad * 2)} stroke="var(--border-soft)" strokeWidth="1" />
      ))}
      <polygon points={area} fill="url(#mesaArea)" />
      <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {series.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === peak ? 5 : 3.5} fill={i === peak ? "var(--brand)" : "var(--surface-card)"} stroke="var(--brand)" strokeWidth="2" />
      ))}
      {days.map((d, i) => (
        <text key={i} x={x(i)} y={h - 8} textAnchor="middle" fontSize="10.5" fill="var(--text-subtle)" fontFamily="var(--font-sans)">{d}</text>
      ))}
    </svg>
  );
}

export function AnalyticsTab({ orders, cafeName }: { orders: Order[]; cafeName: string }) {
  const now = useNow(60000);
  const s = computeSales(orders, now);
  const money = (n: number) => `₱${n.toLocaleString("en-PH")}`;
  const [scope, setScope] = useState("today");

  if (!s.hasData) {
    return (
      <PageWrap max={560}>
        <Card variant="flat" padded>
          <div style={{ textAlign: "center", padding: "30px 12px" }}>
            <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--brand-soft)", color: "var(--brand-active)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><BarChart3 size={26} /></span>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "var(--text-strong)" }}>No sales yet</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "6px auto 0", maxWidth: 340 }}>
              Once guests start ordering, your daily revenue, busiest days, and best-selling items will show up here.
            </p>
          </div>
        </Card>
      </PageWrap>
    );
  }

  const peakDay = s.series.indexOf(Math.max(...s.series));
  const nowTs = now;
  const scopeList = ordersInScope(orders, scope, nowTs);
  const dateLabel = scope === "7d" ? `${fmtDate(dayStartOf(nowTs) - 6 * DAY_MS)} – ${fmtDate(nowTs)}` : fmtDate(nowTs);
  const fileStamp = new Date(nowTs).toISOString().slice(0, 10);
  return (
    <PageWrap>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 18 }}>
        <StatCard icon={Banknote} value={money(s.revenueToday)} label="Revenue today" />
        <StatCard icon={ClipboardList} value={s.ordersToday} label="Orders today" />
        <StatCard icon={TrendingUp} value={money(s.revenueWeek)} label="Revenue · 7 days" />
        <StatCard icon={Banknote} value={money(s.avgOrder)} label="Avg order value" />
      </div>
      <div className="mesa-dash-2col" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
        <Card variant="flat" padded>
          <SectionTitle>Revenue · last 7 days</SectionTitle>
          <LineChart series={s.series} days={s.days} />
          <div style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: 6, textAlign: "center" }}>
            Busiest: {s.days[peakDay]} · {money(s.series[peakDay])}
          </div>
        </Card>
        <Card variant="flat" padded>
          <SectionTitle>Best sellers · 7 days</SectionTitle>
          {s.topItems.length === 0 ? (
            <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>No items sold in the last 7 days.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {s.topItems.map((it, i) => (
                <div key={it.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--border-soft)" : 0 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--text-subtle)", width: 18 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: "var(--text-strong)", fontWeight: 600 }}>{it.name}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{it.qty} sold · {money(it.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card variant="flat" padded style={{ marginTop: 18 }}>
        <SectionTitle
          right={<Select value={scope} onChange={(e) => setScope(e.target.value)} options={[{ value: "today", label: "Today" }, { value: "7d", label: "Last 7 days" }]} />}
        >End-of-day report</SectionTitle>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 14 }}>
          Download a spreadsheet or print a clean summary of {scope === "7d" ? "the last 7 days" : "today"}&rsquo;s orders — totals, best sellers, and every ticket.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="primary" disabled={!scopeList.length} onClick={() => downloadCSV(`mesa-sales-${scope}-${fileStamp}.csv`, scopeList)}>
            <Download /> Download CSV
          </Button>
          <Button variant="secondary" disabled={!scopeList.length} onClick={() => printReport(cafeName, scope === "7d" ? "Last 7 days" : "Today", dateLabel, scopeList)}>
            <Printer /> Print report
          </Button>
        </div>
        {!scopeList.length && <p style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: 12 }}>No orders in this range yet.</p>}
      </Card>
    </PageWrap>
  );
}

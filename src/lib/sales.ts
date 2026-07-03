import type { Order } from "@/lib/orders-store";
import { orderStatusText } from "@/components/app/dashboard/shared";

export const DAY_MS = 86400000;
export function dayStartOf(ts: number) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }

export function computeSales(orders: Order[], now: number) {
  const paid = orders.filter((o) => o.status !== "cancelled");
  const today0 = dayStartOf(now);
  const weekStart = today0 - 6 * DAY_MS;

  const today = paid.filter((o) => o.placedAt >= today0);
  const week = paid.filter((o) => o.placedAt >= weekStart);
  const sum = (arr: Order[]) => arr.reduce((s, o) => s + o.total, 0);
  const revenueWeek = sum(week);

  // Revenue per day for the last 7 days (oldest → today).
  const dayBuckets = Array.from({ length: 7 }, (_, i) => today0 - (6 - i) * DAY_MS);
  const series = dayBuckets.map((d0) => sum(paid.filter((o) => o.placedAt >= d0 && o.placedAt < d0 + DAY_MS)));
  const days = dayBuckets.map((d0) => new Date(d0).toLocaleDateString("en-PH", { weekday: "short" }));

  // Top sellers by quantity (this week).
  const byItem = new Map<string, { name: string; qty: number; revenue: number }>();
  week.forEach((o) => o.lines.forEach((l) => {
    const e = byItem.get(l.name) || { name: l.name, qty: 0, revenue: 0 };
    e.qty += l.qty;
    e.revenue += l.price * l.qty;
    byItem.set(l.name, e);
  }));
  const topItems = [...byItem.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  return {
    ordersToday: today.length,
    revenueToday: sum(today),
    ordersWeek: week.length,
    revenueWeek,
    avgOrder: week.length ? Math.round(revenueWeek / week.length) : 0,
    series,
    days,
    topItems,
    hasData: paid.length > 0,
  };
}

// ── End-of-day report (CSV + printable) ─────────────────────────────
export function ordersInScope(orders: Order[], scope: string, now: number): Order[] {
  const start = dayStartOf(now) - (scope === "7d" ? 6 * DAY_MS : 0);
  return orders.filter((o) => o.placedAt >= start).slice().sort((a, b) => a.placedAt - b.placedAt);
}
function lineText(o: Order): string {
  return o.lines.map((l) => `${l.qty}× ${l.name}${l.options && l.options.length ? ` (${l.options.join(", ")})` : ""}`).join("; ");
}
const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
export const fmtDate = (ts: number) => new Date(ts).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export function summarize(list: Order[]) {
  const paid = list.filter((o) => o.status !== "cancelled");
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const byItem = new Map<string, { name: string; qty: number; revenue: number }>();
  paid.forEach((o) => o.lines.forEach((l) => {
    const e = byItem.get(l.name) || { name: l.name, qty: 0, revenue: 0 };
    e.qty += l.qty; e.revenue += l.price * l.qty; byItem.set(l.name, e);
  }));
  const top = [...byItem.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
  return { count: paid.length, revenue, avg: paid.length ? Math.round(revenue / paid.length) : 0, top };
}

export function downloadCSV(filename: string, list: Order[]) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [["Time", "Order", "Table", "Items", "Note", "Status", "Total (PHP)"]];
  list.forEach((o) => rows.push([fmtTime(o.placedAt), `#${o.code}`, o.table || "", lineText(o), o.note || "", orderStatusText(o), String(o.total)]));
  const s = summarize(list);
  rows.push([]);
  rows.push(["", "", "", "", "", `Orders: ${s.count}`, `Total: ${s.revenue}`]);
  const csv = rows.map((r) => r.map((c) => esc(c)).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printReport(cafeName: string, scopeLabel: string, dateLabel: string, list: Order[]) {
  const s = summarize(list);
  const esc = (v: string) => v.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
  const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;
  const rows = list.map((o) => `<tr><td>${fmtTime(o.placedAt)}</td><td>#${o.code}</td><td>${o.table ? esc(o.table) : "—"}</td><td>${esc(lineText(o))}${o.note ? `<br><em>“${esc(o.note)}”</em>` : ""}</td><td class="s ${o.status}">${orderStatusText(o)}</td><td class="r">${peso(o.total)}</td></tr>`).join("");
  const tops = s.top.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t.name)}</td><td class="r">${t.qty}</td><td class="r">${peso(t.revenue)}</td></tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(cafeName)} — Sales report</title>
<style>
  *{box-sizing:border-box}body{font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#241a12;margin:32px;}
  h1{font-size:22px;margin:0}h2{font-size:15px;margin:24px 0 8px;color:#6b4f3a}
  .sub{color:#8a7563;margin-top:2px}
  .cards{display:flex;gap:16px;margin:18px 0}
  .card{flex:1;border:1px solid #e7ddd2;border-radius:10px;padding:12px 14px}
  .card .v{font-size:24px;font-weight:600}.card .l{color:#8a7563;font-size:12px}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #eee;vertical-align:top;font-size:12.5px}
  th{color:#8a7563;font-weight:600;border-bottom:1px solid #d9ccbd}
  .r{text-align:right;white-space:nowrap}.s{text-transform:capitalize}
  .s.cancelled{color:#b03b3b}.s.completed{color:#3f7a4f}
  .foot{margin-top:26px;color:#a08a76;font-size:11px;text-align:center}
  @media print{body{margin:14px}.card{break-inside:avoid}}
</style></head><body>
  <h1>${esc(cafeName)}</h1>
  <div class="sub">Sales report · ${esc(scopeLabel)} · ${esc(dateLabel)}</div>
  <div class="cards">
    <div class="card"><div class="v">${s.count}</div><div class="l">Orders</div></div>
    <div class="card"><div class="v">${peso(s.revenue)}</div><div class="l">Gross revenue</div></div>
    <div class="card"><div class="v">${peso(s.avg)}</div><div class="l">Avg order</div></div>
  </div>
  <h2>Best sellers</h2>
  <table><thead><tr><th>#</th><th>Item</th><th class="r">Qty</th><th class="r">Revenue</th></tr></thead><tbody>${tops || '<tr><td colspan="4">No sales.</td></tr>'}</tbody></table>
  <h2>Orders</h2>
  <table><thead><tr><th>Time</th><th>Order</th><th>Table</th><th>Items</th><th>Status</th><th class="r">Total</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No orders.</td></tr>'}</tbody></table>
  <div class="foot">Generated by Mesa</div>
</body></html>`;
  const w = window.open("", "_blank", "width=820,height=920");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* user can print manually */ } }, 350);
  return true;
}

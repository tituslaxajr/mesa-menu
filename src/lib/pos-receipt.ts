// ============================================================================
// POS printing — a customer receipt + X/Z shift readings. Same new-window
// print pattern as sales.ts/printReport (window.open → document.write → print),
// kept POS-specific so the receipt stays narrow and thermal-printer friendly.
// All amounts are whole ₱. Receipts are a courtesy, NOT a BIR Official Receipt.
// ============================================================================
import type { PosSale, Shift } from "@/lib/pos-actions";

const peso = (n: number) => `₱${(n ?? 0).toLocaleString("en-PH")}`;
const esc = (v: string) => v.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
const fmtDateTime = (ts: number) =>
  new Date(ts).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Open an HTML doc in a print window and trigger the print dialog. */
function printHtml(html: string, width = 380): boolean {
  const w = window.open("", "_blank", `width=${width},height=760`);
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* user can print manually */ } }, 300);
  return true;
}

const RECEIPT_CSS = `
  *{box-sizing:border-box}
  body{font:12.5px/1.5 "Courier New",ui-monospace,monospace;color:#1a1a1a;margin:0;padding:16px;max-width:300px}
  h1{font-size:16px;margin:0;text-align:center}
  .sub{text-align:center;color:#555;font-size:11px;margin:2px 0 10px}
  .rule{border-top:1px dashed #999;margin:8px 0}
  .row{display:flex;justify-content:space-between;gap:8px}
  .row .r{text-align:right;white-space:nowrap}
  .muted{color:#555}
  .opts{color:#666;font-size:11px;padding-left:12px}
  .total{font-weight:700;font-size:14px}
  .foot{text-align:center;color:#777;font-size:10.5px;margin-top:12px}
  @media print{body{padding:0}}
`;

/** Narrow customer receipt for a single POS sale. */
export function printReceipt(cafeName: string, sale: PosSale): boolean {
  const goods = sale.total - (sale.serviceCharge ?? 0); // VAT-inclusive goods subtotal
  const when = sale.paidAt ?? sale.completedAt ?? sale.placedAt;
  const lines = sale.lines.map((l) => `
    <div class="row"><span>${l.qty}× ${esc(l.name)}</span><span class="r">${peso(l.price * l.qty)}</span></div>
    ${l.options?.length ? `<div class="opts">${esc(l.options.join(", "))}</div>` : ""}
  `).join("");
  const tender = sale.tenderType === "cash" ? "Cash"
    : sale.tenderLabel ? `${cap(sale.tenderType ?? "")} · ${esc(sale.tenderLabel)}`
    : cap(sale.tenderType ?? "");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt #${esc(sale.code)}</title><style>${RECEIPT_CSS}</style></head><body>
    <h1>${esc(cafeName)}</h1>
    <div class="sub">${fmtDateTime(when)} · #${esc(sale.code)}</div>
    <div class="rule"></div>
    ${lines}
    <div class="rule"></div>
    <div class="row"><span>Subtotal</span><span class="r">${peso(goods)}</span></div>
    <div class="row muted"><span>VAT included (12%)</span><span class="r">${peso(sale.vatAmount ?? 0)}</span></div>
    ${sale.serviceCharge ? `<div class="row muted"><span>Service charge</span><span class="r">${peso(sale.serviceCharge)}</span></div>` : ""}
    <div class="row total"><span>TOTAL</span><span class="r">${peso(sale.total)}</span></div>
    <div class="rule"></div>
    <div class="row"><span>${esc(tender)}</span><span class="r">${sale.amountTendered != null ? peso(sale.amountTendered) : ""}</span></div>
    ${sale.tenderType === "cash" ? `<div class="row"><span>Change</span><span class="r">${peso(sale.changeDue ?? 0)}</span></div>` : ""}
    <div class="foot">This is a courtesy receipt, not a BIR Official Receipt.<br>Salamat! 🙏</div>
  </body></html>`;
  return printHtml(html, 320);
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

interface ReadingTotals {
  count: number;
  gross: number;
  cash: number;
  nonCash: number;
  vat: number;
  service: number;
}
function tally(sales: PosSale[]): ReadingTotals {
  const live = sales.filter((s) => s.status !== "cancelled" && s.status !== "refunded");
  return {
    count: live.length,
    gross: live.reduce((s, o) => s + o.total, 0),
    cash: live.filter((o) => o.tenderType === "cash").reduce((s, o) => s + o.total, 0),
    nonCash: live.filter((o) => o.tenderType !== "cash").reduce((s, o) => s + o.total, 0),
    vat: live.reduce((s, o) => s + (o.vatAmount ?? 0), 0),
    service: live.reduce((s, o) => s + (o.serviceCharge ?? 0), 0),
  };
}

const READING_CSS = `
  *{box-sizing:border-box}
  body{font:13px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#241a12;margin:28px}
  h1{font-size:20px;margin:0}
  .sub{color:#8a7563;margin:2px 0 16px;font-size:12.5px}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  td{padding:7px 4px;border-bottom:1px solid #eee}
  td.r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  .grp{font-weight:700;color:#6b4f3a;padding-top:14px}
  .big td{font-size:15px;font-weight:700;border-top:2px solid #d9ccbd}
  .os-over{color:#3f7a4f}.os-short{color:#b03b3b}
  .foot{margin-top:22px;color:#a08a76;font-size:11px;text-align:center}
  @media print{body{margin:14px}}
`;

/** Shared X/Z reading body. Z passes the closed shift (float/expected/counted). */
function readingHtml(kind: "X" | "Z", cafeName: string, shift: Shift, sales: PosSale[], nowLabel: string): string {
  const t = tally(sales);
  const os = shift.overShort ?? 0;
  const zRows = kind === "Z" ? `
    <tr><td class="grp" colspan="2">Cash drawer</td></tr>
    <tr><td>Starting float</td><td class="r">${peso(shift.startingFloat)}</td></tr>
    <tr><td>+ Cash sales</td><td class="r">${peso(t.cash)}</td></tr>
    <tr><td>Expected in drawer</td><td class="r">${peso(shift.expectedCash ?? shift.startingFloat + t.cash)}</td></tr>
    <tr><td>Counted</td><td class="r">${peso(shift.countedCash ?? 0)}</td></tr>
    <tr><td>Over / short</td><td class="r ${os >= 0 ? "os-over" : "os-short"}">${os >= 0 ? "+" : "−"}${peso(Math.abs(os))}</td></tr>
  ` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${kind} reading — ${esc(cafeName)}</title><style>${READING_CSS}</style></head><body>
    <h1>${esc(cafeName)}</h1>
    <div class="sub">${kind === "Z" ? "Z reading · end of shift" : "X reading · mid-shift"} · ${esc(nowLabel)}</div>
    <table>
      <tr><td class="grp" colspan="2">Sales</td></tr>
      <tr><td>Transactions</td><td class="r">${t.count}</td></tr>
      <tr class="big"><td>Gross sales</td><td class="r">${peso(t.gross)}</td></tr>
      <tr><td>Cash</td><td class="r">${peso(t.cash)}</td></tr>
      <tr><td>Non-cash</td><td class="r">${peso(t.nonCash)}</td></tr>
      <tr><td>VAT included (12%)</td><td class="r">${peso(t.vat)}</td></tr>
      <tr><td>Service charge</td><td class="r">${peso(t.service)}</td></tr>
      ${zRows}
    </table>
    <div class="foot">Opened ${fmtDateTime(shift.openedAt)}${shift.closedAt ? ` · Closed ${fmtDateTime(shift.closedAt)}` : ""}<br>Generated by Mesa · not a BIR document.</div>
  </body></html>`;
}

export function printXReading(cafeName: string, shift: Shift, sales: PosSale[], now: number): boolean {
  return printHtml(readingHtml("X", cafeName, shift, sales, fmtDateTime(now)), 460);
}

export function printZReading(cafeName: string, shift: Shift, sales: PosSale[]): boolean {
  return printHtml(readingHtml("Z", cafeName, shift, sales, fmtDateTime(shift.closedAt ?? shift.openedAt)), 460);
}

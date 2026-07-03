"use client";

import {
  Download,
  Link2,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { Logo, Button, Input, Card } from "@/components/ds";
import { useLocalStore } from "@/lib/useLocalStore";
import { menuUrl } from "@/lib/site";
import { palette } from "@/lib/color";
import { FONT_VARS, type BrandCaps, type Cafe, type BrandKit } from "@/lib/data";

/* ════ QR ══════════════════════════════════════════════════════════ */
export function QRTab({ cafe, brand, caps, toast }: { cafe: Cafe; brand: BrandKit; caps: BrandCaps; toast: (m: string) => void }) {
  const url = menuUrl(cafe.slug);
  const qrImg = (data: string, size = 320) => `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&color=2A1D16&bgcolor=FFFFFF&margin=10`;
  // QR modules stay dark for reliable scanning; branding goes on the poster around it.
  const qr = qrImg(url, 320);
  const branded = caps.brandedQR;
  const accent = palette(brand.accent).brand;
  const headFont = branded ? FONT_VARS[brand.headingFont] : "var(--font-display)";

  // Per-table codes: each encodes ?t=N so the guest's table auto-fills on the order.
  const [tableCount, setTableCount] = useLocalStore<number>(`mesa.qr.${cafe.slug}.tables`, 8);
  const tableUrl = (n: number) => `${url}?t=${n}`;
  const tables = Array.from({ length: Math.max(0, tableCount) }, (_, k) => k + 1);
  const printTableSheet = () => {
    const esc = (v: string) => v.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    const cells = tables.map((n) => `<div class="cell"><img src="${qrImg(tableUrl(n), 360)}" width="200" height="200"><div class="t">Table ${n}</div><div class="u">${esc(cafe.name)}</div></div>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(cafe.name)} — Table QR codes</title>
<style>
  body{font:14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:#241a12;margin:24px}
  h1{font-size:18px;margin:0 0 16px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .cell{border:1px solid #e7ddd2;border-radius:12px;padding:14px;text-align:center;break-inside:avoid}
  .cell img{display:block;margin:0 auto}
  .t{font-size:18px;font-weight:600;margin-top:8px}.u{font-size:12px;color:#8a7563}
  @media print{body{margin:10mm}}
</style></head><body>
  <h1>${esc(cafe.name)} — Table QR codes</h1>
  <div class="grid">${cells}</div>
  <script>window.onload=function(){setTimeout(function(){window.print()},200)}<\/script>
</body></html>`;
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) { toast("Allow pop-ups to print the sheet"); return; }
    w.document.write(html); w.document.close(); w.focus();
  };
  return (
    <div className="mesa-dash-page" style={{ padding: "32px 28px 60px", display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
      <Card variant="raised" style={{ width: 320, padding: 26, textAlign: "center" }}>
        <div style={{ minHeight: 44, marginBottom: 16, display: "grid", placeItems: "center" }}>
          {branded && brand.logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={brand.logo} alt="" style={{ height: 44, maxWidth: 200, objectFit: "contain" }} />
            : branded
              ? <div style={{ fontFamily: headFont, fontSize: 23, fontWeight: 500, color: accent }}>{cafe.name}</div>
              : <Logo size="sm" />}
        </div>
        <div style={{ background: "#fff", border: branded ? `2px solid ${accent}` : "1px solid var(--border-soft)", borderRadius: "var(--radius-lg)", padding: 14, display: "inline-block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Menu QR code" width={232} height={232} style={{ display: "block" }} />
        </div>
        <div style={{ marginTop: 14, fontFamily: headFont, fontSize: 19, color: "var(--text-strong)" }}>Scan for our menu</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{url}</div>
        {!caps.whiteLabel && (
          <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-subtle)" }}>
            powered by <Logo size="sm" />
          </div>
        )}
      </Card>
      <div style={{ flex: 1, minWidth: 280, maxWidth: 440 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 23, fontWeight: 500, color: "var(--text-strong)" }}>Your table QR code</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.55, marginTop: 8 }}>
          Print it for your tables or counter. It always points to your live menu — change a price and guests see it instantly, no reprinting.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
          <Button as="a" href={qr} download variant="primary"><Download /> Download PNG</Button>
          <Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(url); toast("Link copied"); }}><Link2 /> Copy link</Button>
          <Button as="a" href={`/m/${cafe.slug}`} variant="ghost"><Printer /> Open menu</Button>
        </div>
        <div style={{ marginTop: 22, padding: 16, background: "var(--available-soft)", borderRadius: "var(--radius-md)", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <ShieldCheck size={20} style={{ color: "var(--sage-600)", flex: "none", marginTop: 1 }} />
          <div style={{ fontSize: 13.5, color: "var(--sage-700)", lineHeight: 1.5 }}>
            Every Mesa menu shows your café&apos;s name and a &ldquo;powered by Mesa&rdquo; mark, so guests trust the code before they scan.
          </div>
        </div>
      </div>

      {/* Per-table QR codes */}
      <div style={{ flexBasis: "100%", marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 23, fontWeight: 500, color: "var(--text-strong)" }}>Per-table QR codes</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14.5, lineHeight: 1.55, marginTop: 6, maxWidth: 520 }}>
              Give each table its own code. When a guest scans it, their table number fills in automatically — so every order (counter or kitchen) already knows where it&apos;s going.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flex: "none" }}>
            <div style={{ width: 96 }}>
              <Input label="Tables" value={String(tableCount)} inputMode="numeric" onChange={(e) => setTableCount(Math.min(50, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)))} />
            </div>
            <Button variant="secondary" onClick={printTableSheet} disabled={!tables.length}><Printer /> Print sheet</Button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>
          {tables.map((n) => (
            <div key={n} style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)", padding: 14, textAlign: "center", background: "var(--surface-card)" }}>
              <div style={{ background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 10, padding: 8, display: "inline-block" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImg(tableUrl(n), 180)} alt={`Table ${n} QR`} width={120} height={120} style={{ display: "block" }} />
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--text-strong)", marginTop: 8 }}>Table {n}</div>
              <Button as="a" href={qrImg(tableUrl(n), 600)} download={`mesa-${cafe.slug}-table-${n}.png`} target="_blank" variant="ghost" size="md" style={{ marginTop: 6 }}><Download size={14} /> PNG</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";
// Day Close — a nightly mini-recap in the café's own brand voice. Phase 2
// cafés (recorded sales) get the numbers; Phase 1 cafés get an honest
// menu-activity story instead — never invented revenue. Ends with a
// shareable IG-story image: every proud owner's post is a Mesa ad.
import React, { useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight, Download, Moon, Undo2 } from "lucide-react";
import { Button } from "@/components/ds";
import { computeSales, summarize, isSale, DAY_MS, dayStartOf, fmtDate } from "@/lib/sales";
import { todaysActivity } from "@/lib/activity";
import type { Order } from "@/lib/orders-store";
import { capsFor } from "@/lib/data";
import { useStudio } from "./StudioProvider";
import { useNow } from "./shared";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

function useCountUp(target: number, ms = 900): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    // Reduced motion: a zero-duration "animation" — one rAF frame straight to
    // the target (keeps all setState calls async, no cascading renders).
    const dur = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = dur === 0 ? 1 : Math.min(1, (t - t0) / dur);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/** How many consecutive days (ending today) the same item was best seller. */
function bestSellerStreak(orders: Order[], now: number): { name: string; qty: number; days: number } | null {
  const topOf = (d0: number) => {
    const slice = orders.filter((o) => isSale(o) && o.placedAt >= d0 && o.placedAt < d0 + DAY_MS);
    return summarize(slice).top[0] ?? null;
  };
  const today0 = dayStartOf(now);
  const today = topOf(today0);
  if (!today) return null;
  let days = 1;
  for (let i = 1; i <= 29; i++) {
    const prev = topOf(today0 - i * DAY_MS);
    if (!prev || prev.name !== today.name) break;
    days++;
  }
  return { name: today.name, qty: today.qty, days };
}

/** Render the 1080×1920 IG-story share image on a canvas. */
async function renderShareCard(opts: {
  cafeName: string;
  dateLabel: string;
  accent: string;
  rows: [string, string][];
  whiteLabel: boolean;
}): Promise<Blob | null> {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1920;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const body = getComputedStyle(document.body);
  const display = body.getPropertyValue("--font-display") || "serif";
  const sans = body.getPropertyValue("--font-sans") || "sans-serif";
  try { await document.fonts.ready; } catch { /* draw with fallbacks */ }

  ctx.fillStyle = "#1F140E";
  ctx.fillRect(0, 0, 1080, 1920);
  // accent dot + café name
  ctx.fillStyle = opts.accent || "#C8592E";
  ctx.beginPath();
  ctx.arc(120, 260, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FBF6EE";
  ctx.font = `600 92px ${display}`;
  ctx.fillText(opts.cafeName.slice(0, 18), 180, 292);
  ctx.font = `500 40px ${sans}`;
  ctx.fillStyle = "rgba(251,246,238,0.65)";
  ctx.fillText(opts.dateLabel, 122, 380);

  let y = 640;
  for (const [big, small] of opts.rows) {
    ctx.fillStyle = "#FBF6EE";
    ctx.font = `600 150px ${display}`;
    ctx.fillText(big.slice(0, 14), 120, y);
    ctx.fillStyle = "rgba(251,246,238,0.6)";
    ctx.font = `500 44px ${sans}`;
    ctx.fillText(small, 124, y + 76);
    y += 330;
  }

  if (!opts.whiteLabel) {
    ctx.fillStyle = "rgba(251,246,238,0.5)";
    ctx.font = `500 40px ${sans}`;
    ctx.fillText("menu by Mesa", 120, 1800);
    ctx.fillStyle = opts.accent || "#C8592E";
    ctx.beginPath();
    ctx.arc(96, 1786, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  return new Promise((resolve) => c.toBlob(resolve, "image/png"));
}

export function DayRecap({ onClose }: { onClose: () => void }) {
  const { items, orders, slug, cafe, brand, toggle, toast } = useStudio();
  const now = useNow(60000);
  const caps = capsFor(cafe.plan);
  const sales = computeSales(orders, now);
  const hasSales = sales.ordersToday > 0;
  const streak = useMemo(() => bestSellerStreak(orders, now), [orders, now]);
  const acts = todaysActivity(slug, now);
  const edits = acts.filter((a) => a.kind === "edit" || a.kind === "add").length;
  const sixed = acts.filter((a) => a.kind === "86" || a.kind === "bulk86").length;
  const restocked = acts.filter((a) => a.kind === "restock" || a.kind === "bulkRestock").length;
  const soldOutItems = items.filter((i) => i.soldOut);
  const [idx, setIdx] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);

  const ordersN = useCountUp(hasSales ? sales.ordersToday : 0);
  const revenueN = useCountUp(hasSales ? sales.revenueToday : 0, 1100);

  const big: React.CSSProperties = { fontFamily: "var(--font-display)", fontSize: "clamp(44px, 12vw, 76px)", fontWeight: 500, lineHeight: 1.05, overflowWrap: "anywhere" };
  const sub: React.CSSProperties = { fontSize: 15, opacity: 0.7, marginTop: 10, lineHeight: 1.6 };

  const cards: React.ReactNode[] = [];
  if (hasSales) {
    cards.push(
      <div key="n">
        <div style={big}>{ordersN} orders.</div>
        <div style={{ ...big, color: "var(--honey-300)" }}>{peso(revenueN)}.</div>
        <p style={sub}>Recorded sales today · counted on this device.</p>
      </div>,
    );
    if (streak) {
      cards.push(
        <div key="best">
          <div style={{ fontSize: 15, opacity: 0.7, marginBottom: 8 }}>Best seller</div>
          <div style={big}>{streak.name}</div>
          <p style={sub}>{streak.qty} sold today{streak.days > 1 ? ` · ${streak.days} days running` : ""}.</p>
        </div>,
      );
    }
  } else {
    cards.push(
      <div key="honest">
        <div style={big}>The menu stayed honest today.</div>
        <p style={sub}>
          {sixed || restocked || edits
            ? <>{sixed ? <><strong>{sixed}</strong> &ldquo;wala na po&rdquo; moment{sixed > 1 ? "s" : ""} handled with one tap. </> : null}
              {restocked ? <><strong>{restocked}</strong> item{restocked > 1 ? "s" : ""} brought back. </> : null}
              {edits ? <><strong>{edits}</strong> edit{edits > 1 ? "s" : ""} — live on every table the same second.</> : null}</>
            : <>No stickers, no reprints, no one asking what ran out. A steady day — the menu ran itself.</>}
        </p>
      </div>,
      <div key="teaser">
        <div style={big}>Tonight&rsquo;s earnings could be here.</div>
        <p style={sub}>
          When Mesa records your sales (guest sends the order, your staff confirms it at the counter), this card becomes orders, revenue and your best seller — real numbers, not guesses. Coming to the beta soon.
        </p>
      </div>,
    );
  }
  if (soldOutItems.length) {
    cards.push(
      <div key="prep">
        <div style={{ fontSize: 15, opacity: 0.7, marginBottom: 8 }}>Tomorrow&rsquo;s prep</div>
        <div style={{ ...big, fontSize: "clamp(30px, 8vw, 48px)" }}>Restocking these?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18, maxHeight: "40vh", overflowY: "auto" }}>
          {soldOutItems.map((m) => (
            <button key={m.id} onClick={() => { toggle(m.id); toast(`${m.name} is back for tomorrow`); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(251,246,238,0.25)", background: "rgba(251,246,238,0.06)", color: "inherit", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14.5, fontWeight: 600, textAlign: "left" }}>
              <Undo2 size={16} style={{ color: "var(--honey-300)", flex: "none" }} /> {m.name}
            </button>
          ))}
        </div>
        <p style={sub}>Tap what&rsquo;s coming back — it&rsquo;s on the menu before the kitchen warms up.</p>
      </div>,
    );
  }
  cards.push(
    <div key="share">
      <div style={{ ...big, fontSize: "clamp(30px, 8vw, 48px)" }}>Proud of today?</div>
      <p style={sub}>Save tonight&rsquo;s card and post it — your guests love seeing the day&rsquo;s best seller.</p>
      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Button
          variant="primary"
          onClick={async () => {
            const rows: [string, string][] = hasSales
              ? [[String(sales.ordersToday), "orders today"], [peso(sales.revenueToday), "revenue"], ...(streak ? [[streak.name, `best seller · ${streak.qty} sold`] as [string, string]] : [])]
              : [[String(items.length), "items on the menu"], [String(sixed + restocked + edits), "menu updates today"], ["always fresh", "no reprints, ever"]];
            const blob = await renderShareCard({ cafeName: cafe.name, dateLabel: fmtDate(now), accent: brand.accent, rows, whiteLabel: !!caps.whiteLabel });
            if (!blob) { toast("Couldn't render the image"); return; }
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${slug}-day-close.png`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast("Story card saved");
          }}
        >
          <Download /> Save story image
        </Button>
        <Button variant="secondary" onClick={onClose}>Close the day</Button>
      </div>
    </div>,
  );

  const clamp = (i: number) => Math.max(0, Math.min(cards.length - 1, i));

  return (
    <div
      className="mesa-dayclose-surface mesa-anim-fade"
      style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", flexDirection: "column", padding: "max(18px, env(safe-area-inset-top)) 22px calc(22px + env(safe-area-inset-bottom))" }}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX == null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 44) setIdx((i) => clamp(i + (dx < 0 ? 1 : -1)));
        setTouchX(null);
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600 }}>
          <Moon size={16} style={{ color: "var(--honey-300)" }} /> Day Close · {cafe.name}
        </span>
        <button onClick={onClose} aria-label="Skip day close" style={{ border: 0, background: "rgba(251,246,238,0.1)", color: "inherit", borderRadius: 999, width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer" }}><X size={17} /></button>
      </div>

      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "10px 4px" }}>
        <div key={idx} className="mesa-anim-rise" style={{ width: "100%", maxWidth: 560 }}>
          {cards[idx]}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <button onClick={() => setIdx((i) => clamp(i - 1))} disabled={idx === 0} aria-label="Previous" style={{ border: 0, background: "rgba(251,246,238,0.1)", color: "inherit", borderRadius: 999, width: 40, height: 40, display: "grid", placeItems: "center", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.4 : 1 }}><ChevronLeft size={18} /></button>
        <div style={{ display: "flex", gap: 7 }}>
          {cards.map((_, i) => (
            <span key={i} style={{ width: 8, height: 8, borderRadius: 999, background: i === idx ? "var(--honey-300)" : "rgba(251,246,238,0.3)", transition: "background-color .2s" }} />
          ))}
        </div>
        <button onClick={() => setIdx((i) => clamp(i + 1))} disabled={idx === cards.length - 1} aria-label="Next" style={{ border: 0, background: "rgba(251,246,238,0.1)", color: "inherit", borderRadius: 999, width: 40, height: 40, display: "grid", placeItems: "center", cursor: idx === cards.length - 1 ? "default" : "pointer", opacity: idx === cards.length - 1 ? 0.4 : 1 }}><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}

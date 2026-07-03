"use client";
// Today — the time-aware home of the Araw dashboard. Instead of a stats page,
// the owner opens the café's day: bring back yesterday's sold-outs before
// open, run the 86 sheet and promo flicks during service, get a merienda
// nudge in the lull, and close the day with the numbers. Phases change which
// cards lead — never which actions exist (see day-phase.ts).
import React, { useRef, useState, useEffect } from "react";
import {
  Sunrise,
  ExternalLink,
  QrCode,
  Tag,
  Sparkles,
  Ban,
  Undo2,
  BarChart3,
  Plus,
  Moon,
} from "lucide-react";
import { Button, Card, Switch, Badge } from "@/components/ds";
import { useLocalStore } from "@/lib/useLocalStore";
import { computeSales, ordersInScope, summarize } from "@/lib/sales";
import { timeAgo } from "@/lib/orders-store";
import { minToLabel, hoursForCafe, PHASE_LABEL, type DayPhase } from "@/lib/day-phase";
import { PHASE2_ORDERING, type MenuItem, type OrderMode, type Promo } from "@/lib/data";
import { useStudio } from "./StudioProvider";
import { DayRecap } from "./DayRecap";
import { PageWrap, SectionTitle, StatCard, useNow, PLACEHOLDER_IMG, type TabId } from "./shared";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

/* ── hold-to-confirm sold-out tile ──────────────────────────────────── */
function Tile86({ item, onConfirm }: { item: MenuItem; onConfirm: () => void }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const out = !!item.soldOut;
  const start = () => {
    if (out) return; // restoring is a plain tap (non-destructive)
    if (timer.current) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onConfirm();
    }, 350);
  };
  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setHolding(false);
  };
  useEffect(() => cancel, []); // clear a pending hold on unmount
  return (
    <button
      className={`mesa-86-tile${holding ? " is-holding" : ""}${out ? " is-out" : ""}`}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onClick={() => { if (out) onConfirm(); }}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onConfirm(); } }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={out ? `Bring ${item.name} back on the menu` : `Mark ${item.name} sold out — press and hold`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.img || PLACEHOLDER_IMG} alt="" />
      <span className="mesa-86-name">{item.name}</span>
      {out && <span className="mesa-86-stamp">Wala na po</span>}
      <span className="mesa-86-ring" aria-hidden />
    </button>
  );
}

/* ── shared bits ────────────────────────────────────────────────────── */
function PromoFlicks({ promos, setPromos, toast, title = "Promos", emptyHint }: {
  promos: Promo[];
  setPromos: (f: (p: Promo[]) => Promo[]) => void;
  toast: (m: string) => void;
  title?: string;
  emptyHint?: React.ReactNode;
}) {
  if (!promos.length) return emptyHint ? <>{emptyHint}</> : null;
  return (
    <Card variant="flat" padded>
      <SectionTitle>{title}</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {promos.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>{p.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.desc} · {p.period}</div>
            </div>
            <Switch
              checked={p.active}
              tone="brand"
              onChange={(v) => {
                setPromos((arr) => arr.map((x) => (x.id === p.id ? { ...x, active: v } : x)));
                toast(v ? `“${p.title}” is live on every table` : `“${p.title}” paused`);
              }}
              label=""
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── the component ──────────────────────────────────────────────────── */
export function DayHome({
  phase,
  override,
  setOverride,
  onGo,
}: {
  phase: DayPhase;
  override: DayPhase | "auto";
  setOverride: (v: DayPhase | "auto") => void;
  onGo: (place: "menu" | "backroom", tab?: TabId) => void;
}) {
  const { items, toggle, promos, setPromos, cafe, setCafe, orders, toast, slug, recording, pendingOrders, confirmPending } = useStudio();
  const now = useNow(30000);
  const sales = computeSales(orders, now);
  const hours = hoursForCafe(cafe);
  const soldOutItems = items.filter((i) => i.soldOut);
  const availableItems = items.filter((i) => !i.soldOut);
  // Bestsellers first — during a rush, what runs out is usually what sells.
  const sheetItems = [...availableItems].sort((a, b) => Number(!!b.best) - Number(!!a.best));
  const todayTop = summarize(ordersInScope(orders, "today", now)).top[0];

  let orderMode: OrderMode = cafe.orderMode ?? "counter";
  if (orderMode === "kitchen" && !PHASE2_ORDERING) orderMode = "counter";
  const accepting = cafe.acceptingOrders !== false;

  // First-run intro + local 6s undo for the 86 sheet.
  const [introSeen, setIntroSeen] = useLocalStore<boolean>("mesa.flags.arawIntroSeen", false);

  // Day Close: auto-surface once per day when the café's real clock reaches
  // closing (never while peeking via the chips); always reopenable by button.
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapLastShown, setRecapLastShown] = useLocalStore<string>(`mesa.recap.${slug}.lastShown`, "");
  const todayKey = new Date(now).toDateString();
  useEffect(() => {
    if (override !== "auto" || (phase !== "closing" && phase !== "closed")) return;
    if (recapLastShown === todayKey) return;
    setRecapLastShown(todayKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once-a-day auto-open keyed on the phase transition
    setRecapOpen(true);
  }, [phase, override, recapLastShown, todayKey, setRecapLastShown]);
  const [justSixed, setJustSixed] = useState<MenuItem | null>(null);
  useEffect(() => {
    if (!justSixed) return;
    const t = setTimeout(() => setJustSixed(null), 6000);
    return () => clearTimeout(t);
  }, [justSixed]);

  const sixItem = (m: MenuItem) => {
    toggle(m.id);
    setJustSixed(m);
  };
  const restoreItem = (m: MenuItem) => {
    toggle(m.id);
    toast(`${m.name} is back on the menu`);
  };

  const clock = new Date(now).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });

  /* ---- reusable cards ---- */
  const introCard = !introSeen && (
    <Card variant="flat" padded style={{ borderLeft: "3px solid var(--brand)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Sparkles size={20} style={{ color: "var(--brand)", flex: "none", marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16.5, fontWeight: 600, color: "var(--text-strong)" }}>Your dashboard now follows your café&rsquo;s day</div>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.55 }}>
            Mornings lead with yesterday&rsquo;s sold-outs, service leads with the 86 sheet, merienda suggests a promo, and closing counts the day.
            Everything else lives in <strong>Menu</strong> and the <strong>Backroom</strong> — nothing was removed. Prefer the old layout? Settings → &ldquo;Use classic dashboard&rdquo;.
          </p>
        </div>
        <Button variant="ghost" onClick={() => setIntroSeen(true)}>Got it</Button>
      </div>
    </Card>
  );

  const leftovers = (
    <Card variant="flat" padded>
      <SectionTitle right={<Badge variant="neutral">{soldOutItems.length} sold out</Badge>}>Back on the menu?</SectionTitle>
      {soldOutItems.length ? (
        <>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Still marked sold out from yesterday — one tap brings each back before the first scan.</p>
          <div className="mesa-86-grid">
            {soldOutItems.map((m) => <Tile86 key={m.id} item={m} onConfirm={() => restoreItem(m)} />)}
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Nothing is marked sold out. Your menu wakes up perfect.</p>
      )}
    </Card>
  );

  const liveCard = (
    <Card variant="flat" padded>
      <SectionTitle>Your menu is live</SectionTitle>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
        Guests who scan right now see {items.length} items{soldOutItems.length ? ` (${soldOutItems.length} honestly marked sold out)` : ""}.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Button as="a" href={`/m/${slug}`} target="_blank" variant="secondary"><ExternalLink /> Open live menu</Button>
        <Button variant="ghost" onClick={() => onGo("backroom", "qr")}><QrCode /> Print shop</Button>
      </div>
    </Card>
  );

  const sheet86 = (compact = false) => (
    <Card variant="flat" padded>
      <SectionTitle right={<Badge variant="neutral">hold to confirm</Badge>}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Ban size={17} style={{ color: "var(--soldout)" }} /> Wala na? 86 it.</span>
      </SectionTitle>
      {justSixed && (
        <div className="mesa-anim-fade" style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--soldout-soft)", border: "1px solid var(--berry-100)", borderRadius: "var(--radius-md)", padding: "9px 12px", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "var(--text-body)", flex: 1 }}><strong>{justSixed.name}</strong> marked sold out — every guest&rsquo;s menu just updated.</span>
          <Button variant="ghost" onClick={() => { toggle(justSixed.id); setJustSixed(null); toast(`${justSixed.name} is back`); }}><Undo2 /> Undo</Button>
        </div>
      )}
      {availableItems.length ? (
        <>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Press and hold an item until the ring closes — it&rsquo;s off every table instantly. No reprint, no &ldquo;wala na po&rdquo; at the counter.</p>
          <div className="mesa-86-grid">
            {(compact ? sheetItems.slice(0, 6) : sheetItems).map((m) => <Tile86 key={m.id} item={m} onConfirm={() => sixItem(m)} />)}
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Everything is marked sold out. Rough day — bring items back below.</p>
      )}
      {soldOutItems.length > 0 && (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-muted)", margin: "16px 0 10px" }}>Sold out today — tap to bring back</div>
          <div className="mesa-86-grid">
            {soldOutItems.map((m) => <Tile86 key={m.id} item={m} onConfirm={() => restoreItem(m)} />)}
          </div>
        </>
      )}
    </Card>
  );

  const pauseCard = orderMode !== "browse" && (
    <Card variant="flat" padded>
      <Switch
        checked={accepting}
        tone="brand"
        onChange={(v) => { setCafe((c) => ({ ...c, acceptingOrders: v })); toast(v ? "Ordering resumed" : "Ordering paused — guests can still browse"); }}
        label="Accepting orders"
      />
      {!accepting && <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 8 }}>Paused — the menu stays live, the cart is off.</p>}
    </Card>
  );

  const statsRow = (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      <StatCard icon={BarChart3} value={sales.ordersToday} label="Orders today" />
      <StatCard icon={Tag} value={peso(sales.revenueToday)} label="Revenue today" />
      <StatCard icon={Ban} value={soldOutItems.length} label="Sold out right now" />
    </div>
  );

  const meriendaPrompt = (() => {
    const inactive = promos.find((p) => !p.active);
    if (inactive) {
      return (
        <Card variant="flat" padded style={{ background: "var(--highlight-soft)", border: "1px solid var(--honey-100)" }}>
          <SectionTitle>Tahimik? Your merienda promo is one flick away.</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-strong)" }}>{inactive.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{inactive.desc}</div>
            </div>
            <Button variant="primary" onClick={() => {
              setPromos((arr) => arr.map((x) => (x.id === inactive.id ? { ...x, active: true } : x)));
              toast(`“${inactive.title}” is live on every table`);
            }}>Flick it on</Button>
          </div>
        </Card>
      );
    }
    if (!promos.length) {
      return (
        <Card variant="flat" padded style={{ background: "var(--highlight-soft)", border: "1px solid var(--honey-100)" }}>
          <SectionTitle>The lull is a good time for a promo.</SectionTitle>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 12 }}>Draft a merienda deal now, flick it on when you&rsquo;re ready — no poster, no reprint.</p>
          <Button variant="secondary" onClick={() => {
            const draft: Promo = { id: "promo-" + Date.now(), title: "Merienda deal", desc: "Any pastry + iced latte, 3–5 PM", period: "Today, 3–5 PM", active: false, tone: "highlight" };
            setPromos((arr) => [...arr, draft]);
            toast("Draft promo created — edit it, then flick it on");
          }}><Plus /> Draft a merienda promo</Button>
        </Card>
      );
    }
    return null; // all promos already live — the flicks list below covers it
  })();

  const closingCard = (
    <div className="mesa-dayclose-surface" style={{ borderRadius: "var(--radius-lg)", padding: "26px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Moon size={18} style={{ color: "var(--honey-300)" }} />
        <span style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 500 }}>The day, counted.</span>
      </div>
      <div style={{ display: "flex", gap: 26, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 500, lineHeight: 1 }}>{sales.ordersToday}</div>
          <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 5 }}>orders today</div>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 500, lineHeight: 1 }}>{peso(sales.revenueToday)}</div>
          <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 5 }}>revenue</div>
        </div>
        {todayTop && (
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 500, lineHeight: 1 }}>{todayTop.name}</div>
            <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 5 }}>best seller · {todayTop.qty} sold</div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Button variant="primary" onClick={() => setRecapOpen(true)}><Moon /> Open Day Close</Button>
        <Button variant="secondary" onClick={() => onGo("backroom", "analytics")}><BarChart3 /> The Books — full report</Button>
      </div>
    </div>
  );

  const tomorrowPrep = soldOutItems.length > 0 && (
    <Card variant="flat" padded>
      <SectionTitle>Tomorrow&rsquo;s prep</SectionTitle>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>These went &ldquo;wala na&rdquo; today. Tap what you&rsquo;re restocking — it&rsquo;s back on the menu before the kitchen warms up.</p>
      <div className="mesa-86-grid">
        {soldOutItems.map((m) => <Tile86 key={m.id} item={m} onConfirm={() => restoreItem(m)} />)}
      </div>
    </Card>
  );

  // Phase 2 "Record sales with Mesa": guest-submitted counter orders waiting
  // for the staff tap that turns them into recorded sales.
  const pendingStrip = recording ? (
    <Card variant="flat" padded style={{ border: pendingOrders.length ? "2px solid var(--brand)" : undefined }}>
      <SectionTitle right={pendingOrders.length ? <Badge variant="highlight">{pendingOrders.length} waiting</Badge> : undefined}>At the counter</SectionTitle>
      {pendingOrders.length ? (
        <>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>The guest shows you a code — tap the match to record the sale. Unconfirmed orders quietly expire and never count.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {pendingOrders.map((p) => (
              <button key={p.id} onClick={() => confirmPending(p.id)} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3, minWidth: 132, padding: "12px 15px", borderRadius: "var(--radius-lg)", border: "1.5px solid var(--brand)", background: "var(--brand-soft)", cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--brand-active)", letterSpacing: ".04em", lineHeight: 1 }}>{p.code}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-strong)" }}>{peso(p.total)} · {p.lines.reduce((s, l) => s + l.qty, 0)} items{p.table ? ` · T${p.table}` : ""}</span>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{timeAgo(p.placedAt, now)} · tap to record</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No orders waiting. Guests build a cart, tap &ldquo;Send to counter&rdquo;, and show you their code here.</p>
      )}
    </Card>
  ) : null;

  /* ---- phase → card order (defaults, never walls) ---- */
  const sections: React.ReactNode[] = (() => {
    const queueFirst = pendingOrders.length ? [pendingStrip] : [];
    switch (phase) {
      case "prep":
        return [...queueFirst, leftovers, <PromoFlicks key="pf" promos={promos} setPromos={setPromos} toast={toast} title="Running today" />, liveCard];
      case "service":
        return [pendingStrip, sheet86(), statsRow, <PromoFlicks key="pf" promos={promos} setPromos={setPromos} toast={toast} />, pauseCard];
      case "merienda":
        return [...queueFirst, meriendaPrompt, <PromoFlicks key="pf" promos={promos} setPromos={setPromos} toast={toast} />, statsRow, sheet86(true)];
      case "closing":
      case "closed":
        return [...queueFirst, closingCard, tomorrowPrep, <PromoFlicks key="pf" promos={promos} setPromos={setPromos} toast={toast} title="Still running — flick off?" />, liveCard];
    }
  })();

  const chip = (id: DayPhase | "auto", label: string) => (
    <button
      key={id}
      className={`mesa-phase-chip${override === id ? " is-on" : ""}`}
      onClick={() => setOverride(id)}
      title={id === "auto" ? "Follow the clock" : `Peek at ${label}`}
    >
      {label}
    </button>
  );

  return (
    <PageWrap max={860}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div className="mesa-phase-chips">
            {chip("auto", "Auto")}
            {(["prep", "service", "merienda", "closing"] as DayPhase[]).map((p) => chip(p, PHASE_LABEL[p]))}
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            <Sunrise size={15} /> {clock} · {PHASE_LABEL[phase]}{override !== "auto" ? " (peek)" : ""} · opens {minToLabel(hours.openMin).toLowerCase()}
          </span>
        </div>
        {introCard}
        {sections.map((s, i) => <React.Fragment key={i}>{s}</React.Fragment>)}
      </div>
      {recapOpen && <DayRecap onClose={() => setRecapOpen(false)} />}
    </PageWrap>
  );
}

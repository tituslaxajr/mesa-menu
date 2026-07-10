"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button, Switch } from "@/components/ds";
import { PLANS, MENU, DEMO_CAFE, annualPerMonth, annualTotal, type MenuItem } from "@/lib/data";
import { menuUrl } from "@/lib/site";

/* ════════════════════════════════════════════════════════════════════
   Landing page — "One day at your café."
   One scroll = one workday at the demo café (Kape Kalye), 5:48 AM to
   close. The background moves through the day (see landing.css phases)
   and the visitor operates the product mid-story: they mark an item
   sold out and flip a promo on, watching the guest phone react.
   ════════════════════════════════════════════════════════════════════ */

type Phase = "night" | "morning" | "noon" | "merienda" | "dusk";

const item = (id: string): MenuItem => MENU.find((m) => m.id === id) ?? MENU[0];

const QR_SRC = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
  menuUrl("demo"),
)}&size=264x264&color=2A1D16&bgcolor=FFFDF7&margin=8`;

/* ── tiny building blocks ─────────────────────────────────────────── */

function Reveal({
  children,
  delay,
  className = "",
}: {
  children: ReactNode;
  delay?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div className={`mesa-land-reveal ${delay ? `mesa-land-reveal--d${delay}` : ""} ${className}`}>
      {children}
    </div>
  );
}

function PhoneItem({ m, soldOut = false }: { m: MenuItem; soldOut?: boolean }) {
  return (
    <div className={`mesa-land-p-item ${soldOut ? "is-soldout" : ""}`}>
      <span className="mesa-land-p-badge">SOLD OUT TODAY</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={m.img} alt="" />
      <div style={{ minWidth: 0 }}>
        <h4>{m.name}</h4>
        <p>{m.desc}</p>
      </div>
      <span className="mesa-land-p-price">₱{m.price}</span>
    </div>
  );
}

function Phone({
  sub,
  chips,
  children,
  label,
}: {
  sub: string;
  chips?: boolean;
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="mesa-land-duo-col">
      <div className="mesa-land-phone">
        <div className="mesa-land-screen">
          <div className="mesa-land-p-head">
            <h4 className="mesa-land-p-cafe" style={{ fontFamily: "var(--font-display)" }}>
              {DEMO_CAFE.name}
            </h4>
            <p className="mesa-land-p-sub">{sub}</p>
          </div>
          {chips && (
            <div className="mesa-land-p-chips">
              <span className="mesa-land-p-chip mesa-land-p-chip--on">All</span>
              <span className="mesa-land-p-chip">Hot Coffee</span>
              <span className="mesa-land-p-chip">Iced</span>
              <span className="mesa-land-p-chip">Kitchen</span>
            </div>
          )}
          <div className="mesa-land-p-body" style={chips ? undefined : { paddingTop: 10 }}>
            {children}
          </div>
        </div>
      </div>
      <p className="mesa-land-devicetag">{label}</p>
    </div>
  );
}

function CountUp({ target, peso, active }: { target: number; peso?: boolean; active: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = reduced ? 1 : Math.min((t - t0) / 1200, 1);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target]);
  return (
    <span>
      {peso ? "₱" : ""}
      {v.toLocaleString()}
    </span>
  );
}

/* ── receipt pricing (data from PLANS — the source of truth) ──────────
 * The pricing renders as a café receipt: mono type, dashed tear-lines, a
 * perforated bottom edge, and a "WHILE IN BETA · ₱0.00" total so the beta
 * message and the prices never contradict. One CTA verb — "Start free" —
 * on every line, so nothing reads "Subscribe" while the plan is free. */

function Receipt() {
  const [annual, setAnnual] = useState(false);
  return (
    <div className="mesa-land-receipt">
      <h3>MESA</h3>
      <p className="mesa-land-r-meta">*** {annual ? "annual" : "monthly"} plans · cancel anytime ***</p>
      <div className="mesa-land-r-toggle">
        <span>Pay annually — 2 months free</span>
        <Switch checked={annual} onChange={setAnnual} tone="brand" label="" id="landing-billing" />
      </div>
      <hr className="mesa-land-r-sep" />
      {PLANS.map((p) => (
        <div key={p.id}>
          <div className="mesa-land-r-line">
            <span className="mesa-land-r-name">
              {p.name.toUpperCase()}
              {p.popular && <span className="mesa-land-r-pop">MOST ORDERED</span>}
            </span>
            <span className="mesa-land-r-amt">
              ₱{annual ? annualPerMonth(p.monthly) : p.monthly}/mo{" "}
              {annual && <small>(₱{annualTotal(p.monthly).toLocaleString()}/yr)</small>}
            </span>
          </div>
          <p className="mesa-land-r-desc">{p.tagline}</p>
          <ul className="mesa-land-r-features">
            {p.features.map((f) => (
              <li key={f}>+ {f}</li>
            ))}
          </ul>
          <Link
            href="/request-access"
            className={`mesa-land-r-cta ${p.popular ? "mesa-land-r-cta--primary" : ""}`}
          >
            Start free
          </Link>
          <hr className="mesa-land-r-sep" />
        </div>
      ))}
      <div className="mesa-land-r-line mesa-land-r-total">
        <span>WHILE IN BETA</span>
        <span>₱0.00</span>
      </div>
      <p className="mesa-land-r-note">
        <b>Free for our beta cafés — no card.</b>
        <br />
        Join now and lock in this pricing for launch.
        <br />
        Salamat po! ☕
      </p>
    </div>
  );
}

/* ── the page ─────────────────────────────────────────────────────── */

export function DayStory() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("night");
  const [soldOut, setSoldOut] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [promoOn, setPromoOn] = useState(false);
  const [statsIn, setStatsIn] = useState(false);
  // Hold-to-confirm for the 12:05 interactive — the real gesture from the
  // app's 'ubos na' sheet (350ms press, ring fills, releasing early cancels).
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<number | null>(null);
  // A completed hold also emits a click on release; this flag swallows that
  // one click so the freshly sold-out item doesn't immediately flip back.
  const suppressClick = useRef(false);
  const holdStart = () => {
    if (soldOut || holdTimer.current) return;
    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      setHolding(false);
      setSoldOut(true);
      setTapped(true);
      suppressClick.current = true;
    }, 350);
  };
  const holdCancel = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setHolding(false);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const chapters = root.querySelectorAll<HTMLElement>("[data-chapter]");
    const phaseObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          setPhase(el.dataset.phase as Phase);
        }
      },
      // Fire when a chapter crosses the middle band of the viewport, so even
      // chapters taller than the screen (e.g. the receipt) take the clock.
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    chapters.forEach((c) => phaseObs.observe(c));

    const revealObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            revealObs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.2 },
    );
    root.querySelectorAll(".mesa-land-reveal").forEach((el) => revealObs.observe(el));

    const daycard = root.querySelector(".mesa-land-daycard");
    const statObs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setStatsIn(true);
      },
      { threshold: 0.5 },
    );
    if (daycard) statObs.observe(daycard);

    return () => {
      phaseObs.disconnect();
      revealObs.disconnect();
      statObs.disconnect();
    };
  }, []);

  const flatWhite = item("flat-white");
  const icedSpanish = item("iced-spanish");
  const croissant = item("butter-croissant");
  const pulledPork = item("pulled-sandwich");

  return (
    <div ref={rootRef} className="mesa-land" data-phase={phase}>
      {/* fixed chrome */}
      <header className="mesa-land-chrome">
        <div className="mesa-land-brandgroup">
          <Link href="/" className="mesa-land-wordmark" aria-label="Mesa home">
            Mesa<span>.</span>
          </Link>
          <span className="mesa-land-beta">Beta</span>
        </div>
        <nav className="mesa-land-nav">
          <a href="#pricing" className="mesa-land-navlink">Pricing</a>
          <Link href="/demo" className="mesa-land-navlink">Demo</Link>
          <Link href="/login" className="mesa-land-navlink">Log in</Link>
          <Link href="/request-access" className="mesa-land-chrome-cta">
            Start free
          </Link>
        </nav>
      </header>

      <main>
        {/* ═══ 5:48 AM · the dark café — the hero, and chapter one ═══
            Product-forward: copy + CTAs on the left, and on the right the
            dawn table scene — the QR tent card WITH the live guest menu
            already glowing on a phone. The product is visible before the
            first scroll; the scroll cue announces the day-story structure. */}
        <section className="mesa-land-chapter" data-chapter data-phase="night" data-time="5:48 AM" data-label="Before opening">
          <div className="mesa-land-inner mesa-land-inner--wide">
            <div className="mesa-land-hero">
              <div className="mesa-land-hero-copy">
                <Reveal>
                  <p className="mesa-land-stamp">QR MENUS FOR FILIPINO CAFÉS · BETA</p>
                </Reveal>
                <Reveal delay={1}>
                  <h1>
                    Change your menu in one tap.
                    <br />
                    The reprints <span className="mesa-land-em">stop today.</span>
                  </h1>
                </Reveal>
                <Reveal delay={2}>
                  <p className="mesa-land-lede">
                    Guests scan a QR at the table and see your live menu. Sold out, price change, a
                    new merienda promo — you update once with <strong>Mesa</strong>, and every table
                    sees it before the coffee gets cold.
                  </p>
                </Reveal>
                <Reveal delay={3}>
                  <div className="mesa-land-ctas">
                    <Button as="a" href="/request-access" variant="primary" size="lg">
                      Start free
                    </Button>
                    <Link href="/demo" className="mesa-land-btn-ghost">
                      See the live demo →
                    </Link>
                  </div>
                  <p className="mesa-land-fineprint" style={{ marginTop: 18 }}>
                    Free while in beta · no card · your own QR in minutes
                  </p>
                </Reveal>
              </div>
              <Reveal delay={2} className="mesa-land-hero-scene">
                <div className="mesa-land-ring" aria-hidden="true" />
                <Phone sub="Table 4 · opens at 7" label="The menu guests scan — live, not a PDF">
                  <PhoneItem m={item("flat-white")} />
                  <PhoneItem m={item("iced-spanish")} />
                  <PhoneItem m={item("butter-croissant")} />
                </Phone>
                <div className="mesa-land-hero-tent">
                  <Link className="mesa-land-tent" href="/m/demo">
                    <p className="mesa-land-tent-cafe" style={{ fontFamily: "var(--font-display)" }}>
                      {DEMO_CAFE.name}
                    </p>
                    <p className="mesa-land-tent-hint">Scan for our menu</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={QR_SRC} alt={`QR code that opens the live demo menu for ${DEMO_CAFE.name}`} width={132} height={132} />
                    <p className="mesa-land-tent-brand">powered by mesa</p>
                  </Link>
                </div>
              </Reveal>
            </div>
            <Reveal delay={3}>
              <p className="mesa-land-scrollcue">Scroll through one day at your café — 5:48 AM to close</p>
            </Reveal>
          </div>
        </section>

        {/* ═══ 7:12 AM · the laminated problem ═══ */}
        <section className="mesa-land-chapter" data-chapter data-phase="morning" data-time="7:12 AM" data-label="First customers">
          <div className="mesa-land-inner mesa-land-inner--wide">
            <div className="mesa-land-oldmenu-wrap">
              <Reveal>
                <div className="mesa-land-oldmenu">
                  <span className="mesa-land-tape" aria-hidden="true" />
                  <h3>{DEMO_CAFE.name}</h3>
                  <p className="mesa-land-oldmenu-est">· Menu · est. 2019 ·</p>
                  <ul>
                    <li>
                      <span>
                        Flat White <span className="mesa-land-penned">(best seller!!)</span>
                      </span>
                      <span>
                        <span className="mesa-land-strike">₱120</span>₱130
                      </span>
                    </li>
                    <li>
                      <span>Iced Spanish Latte</span>
                      <span>
                        <span className="mesa-land-strike">₱135</span>
                        <span className="mesa-land-sticker">₱150</span>
                      </span>
                    </li>
                    <li>
                      <span>Butter Croissant</span>
                      <span>
                        <span className="mesa-land-strike">₱85</span>₱95
                      </span>
                    </li>
                    <li>
                      <span>Pulled Pork Sandwich</span>
                      <span>₱220</span>
                    </li>
                    <li>
                      <span>
                        <span className="mesa-land-strike">Brown Butter Cookies</span>{" "}
                        <span className="mesa-land-penned">wala na po</span>
                      </span>
                      <span className="mesa-land-strike">₱80</span>
                    </li>
                  </ul>
                  <div className="mesa-land-stain" aria-hidden="true" />
                </div>
              </Reveal>
              <div>
                <Reveal>
                  <p className="mesa-land-stamp">7:12 AM · THE MENU YOU HAVE NOW</p>
                </Reveal>
                <Reveal delay={1}>
                  <h2>
                    You know this menu.
                    <br />
                    You&apos;ve <span className="mesa-land-em">reprinted</span> it four times.
                  </h2>
                </Reveal>
                <ul className="mesa-land-painlist">
                  <li className="mesa-land-reveal mesa-land-reveal--d1" style={{ display: "flex" }}>
                    <span className="mesa-land-pain-x">✕</span>
                    <span>
                      <b>Every price change is a print run.</b> Beans went up again — so it&apos;s
                      stickers, tape, and another trip to the print shop.
                    </span>
                  </li>
                  <li className="mesa-land-reveal mesa-land-reveal--d2" style={{ display: "flex" }}>
                    <span className="mesa-land-pain-x">✕</span>
                    <span>
                      <b>The Canva PDF is worse.</b> Guests pinch-zoom a 4&nbsp;MB file on café
                      Wi-Fi while their coffee gets cold.
                    </span>
                  </li>
                  <li className="mesa-land-reveal mesa-land-reveal--d3" style={{ display: "flex" }}>
                    <span className="mesa-land-pain-x">✕</span>
                    <span>
                      <b>&quot;Wala na po&quot; — said out loud, every day.</b> The menu can&apos;t
                      tell guests what ran out. Your staff has to.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 9:02 AM · first scan ═══ */}
        <section className="mesa-land-chapter" data-chapter data-phase="noon" data-time="9:02 AM" data-label="First scan">
          <div className="mesa-land-inner mesa-land-inner--wide mesa-land-center">
            <Reveal>
              <p className="mesa-land-stamp">9:02 AM · A GUEST SITS AT TABLE 4</p>
            </Reveal>
            <Reveal delay={1}>
              <h2>
                One scan. The menu opens
                <br />
                before the chair gets warm.
              </h2>
            </Reveal>
            <Reveal delay={2}>
              <p className="mesa-land-lede">
                No app to install. No PDF to download. A menu that loads in under a second, looks
                exactly like your café, and always tells the truth.
              </p>
            </Reveal>
            <Reveal delay={3}>
              <div className="mesa-land-duo">
                <Phone sub="Table 4 · open till 10 PM" chips label="The guest's phone — a live menu, not a PDF">
                  <PhoneItem m={flatWhite} />
                  <PhoneItem m={icedSpanish} />
                  <PhoneItem m={croissant} />
                  <PhoneItem m={pulledPork} />
                </Phone>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ 12:05 PM · the sold-out moment (interactive) ═══ */}
        <section className="mesa-land-chapter" data-chapter data-phase="noon" data-time="12:05 PM" data-label="Lunch rush">
          <div className="mesa-land-inner mesa-land-inner--wide mesa-land-center">
            <Reveal>
              <p className="mesa-land-stamp">12:05 PM · THE PULLED PORK RUNS OUT</p>
            </Reveal>
            <Reveal delay={1}>
              <h2>
                Lunch rush. The pork is gone.
                <br />
                <span className="mesa-land-em">You</span> fix the menu — right now.
              </h2>
            </Reveal>
            <Reveal delay={2}>
              <p className="mesa-land-lede">
                This part isn&apos;t a screenshot — it&apos;s the real gesture from the app.
                Press and hold until the ring closes, and watch every guest&apos;s menu update —{" "}
                <strong>while you&apos;re still holding the pan.</strong>
              </p>
            </Reveal>
            <Reveal delay={3}>
              <div className="mesa-land-duo">
                <div className="mesa-land-duo-col">
                  <div className="mesa-land-studio">
                    <h4 style={{ fontFamily: "var(--font-display)" }}>Today · Service</h4>
                    <p className="mesa-land-s-sub">{DEMO_CAFE.name} · The &lsquo;ubos na&rsquo; sheet</p>
                    <div className="mesa-land-s-row">
                      <div>
                        <div className="mesa-land-s-name">Flat White</div>
                        <div className="mesa-land-s-price">₱{flatWhite.price}</div>
                      </div>
                      <span className="mesa-land-s-state mesa-land-s-state--avail">Available</span>
                    </div>
                    <div className="mesa-land-s-row">
                      <div>
                        <div className="mesa-land-s-name">Pulled Pork Sandwich</div>
                        <div className="mesa-land-s-price">₱{pulledPork.price}</div>
                      </div>
                      <span className={`mesa-land-s-state ${soldOut ? "mesa-land-s-state--out" : "mesa-land-s-state--avail"}`}>
                        {soldOut ? "Sold out" : "Available"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`mesa-land-bigtap ${tapped ? "is-done" : ""} ${holding ? "is-holding" : ""}`}
                      style={soldOut ? { background: "var(--available)" } : undefined}
                      onPointerDown={holdStart}
                      onPointerUp={holdCancel}
                      onPointerLeave={holdCancel}
                      onPointerCancel={holdCancel}
                      onContextMenu={(e) => e.preventDefault()}
                      onClick={() => {
                        // Swallow the click that fires on release of a completed hold.
                        if (suppressClick.current) { suppressClick.current = false; return; }
                        // Bringing it back is a plain tap; keyboard users get
                        // click for both directions (hold is pointer-only).
                        if (soldOut) { setSoldOut(false); setTapped(true); }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !soldOut) { setSoldOut(true); setTapped(true); }
                      }}
                    >
                      {soldOut ? "Done — tap to bring it back" : holding ? "Hold it…" : "Hold: mark it sold out"}
                    </button>
                  </div>
                  <p className="mesa-land-devicetag">Your phone — behind the counter</p>
                </div>
                <Phone sub="Table 4 · open till 10 PM" chips label="Every guest's phone — same second">
                  <PhoneItem m={flatWhite} />
                  <PhoneItem m={pulledPork} soldOut={soldOut} />
                  <PhoneItem m={croissant} />
                </Phone>
              </div>
            </Reveal>
            <p className={`mesa-land-aftermath ${soldOut ? "is-show" : ""}`}>
              <b>That&apos;s it.</b> No reprint. No sticker. No &quot;wala na po&quot; at the
              table. One tap, ₱0.
            </p>
          </div>
        </section>

        {/* ═══ 3:40 PM · merienda promo (interactive) ═══ */}
        <section className="mesa-land-chapter" data-chapter data-phase="merienda" data-time="3:40 PM" data-label="Merienda lull">
          <div className="mesa-land-inner mesa-land-inner--wide mesa-land-center">
            <Reveal>
              <p className="mesa-land-stamp">3:40 PM · THE QUIET HOURS</p>
            </Reveal>
            <Reveal delay={1}>
              <h2>
                Slow afternoon?
                <br />
                Launch a promo in <span className="mesa-land-em">one flick.</span>
              </h2>
            </Reveal>
            <Reveal delay={2}>
              <p className="mesa-land-lede">
                Mesa already knows it&apos;s merienda — <strong>Today</strong> is holding the
                promo up, waiting for the flick. No new poster, no new post, no new print — and
                flip it off when the rush is done.
              </p>
            </Reveal>
            <Reveal delay={3}>
              <div className="mesa-land-duo">
                <div className="mesa-land-duo-col">
                  <div className="mesa-land-studio">
                    <h4 style={{ fontFamily: "var(--font-display)" }}>Today · Merienda</h4>
                    <p className="mesa-land-s-sub">{DEMO_CAFE.name} · Tahimik? One flick.</p>
                    <div className="mesa-land-switchrow">
                      <div>
                        <div className="mesa-land-sw-label">Merienda deal, 3–5 PM</div>
                        <div className="mesa-land-sw-sub">Iced Spanish Latte + croissant · ₱199</div>
                      </div>
                      <button
                        type="button"
                        className="mesa-land-sw"
                        role="switch"
                        aria-checked={promoOn}
                        aria-label="Toggle the merienda promo"
                        onClick={() => setPromoOn((p) => !p)}
                      />
                    </div>
                  </div>
                  <p className="mesa-land-devicetag">Your phone — one switch</p>
                </div>
                <Phone sub="Table 4 · open till 10 PM" label="Every table — instantly">
                  <div className={`mesa-land-p-promo ${promoOn ? "is-show" : ""}`}>
                    🌤 Merienda deal till 5 PM — Iced Spanish Latte + Butter Croissant, ₱199
                  </div>
                  <PhoneItem m={icedSpanish} />
                  <PhoneItem m={croissant} />
                  <PhoneItem m={flatWhite} />
                </Phone>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ 9:14 PM · closing ═══ */}
        <section className="mesa-land-chapter" data-chapter data-phase="dusk" data-time="9:14 PM" data-label="Closing up">
          <div className="mesa-land-inner mesa-land-center">
            <Reveal>
              <p className="mesa-land-stamp">9:14 PM · CHAIRS GO UP</p>
            </Reveal>
            <Reveal delay={1}>
              <h2>
                You close the café.
                <br />
                Mesa closes the <span className="mesa-land-em">books.</span>
              </h2>
            </Reveal>
            <Reveal delay={2}>
              <p className="mesa-land-lede">
                Guests build their order on their phone and show it at the counter — your staff
                keys it into your own POS like always. And when you close, Mesa hands you a{" "}
                <strong>Day Close</strong> recap: the day&apos;s story, ready to post. (Real
                earnings appear once you let Mesa record confirmed sales.)
              </p>
            </Reveal>
            <Reveal delay={3}>
              <div className="mesa-land-daycard">
                <p className="mesa-land-s-sub" style={{ marginBottom: 14 }}>🌙 Day Close · {DEMO_CAFE.name}</p>
                <div className="mesa-land-stats">
                  <div>
                    <div className="mesa-land-stat-n">
                      <CountUp target={47} active={statsIn} />
                    </div>
                    <div className="mesa-land-stat-l">orders today</div>
                  </div>
                  <div>
                    <div className="mesa-land-stat-n">
                      <CountUp target={11230} peso active={statsIn} />
                    </div>
                    <div className="mesa-land-stat-l">revenue</div>
                  </div>
                  <div>
                    <div className="mesa-land-stat-n mesa-land-stat-n--text">Flat White</div>
                    <div className="mesa-land-stat-l">best seller</div>
                  </div>
                </div>
                <div className="mesa-land-daycard-foot">
                  And the pulled pork? Back tomorrow — <b>one tap</b>, and it&apos;s on every menu
                  again before the kitchen warms up.
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ the bill (pricing) ═══ */}
        <section
          id="pricing"
          className="mesa-land-chapter"
          data-chapter
          data-phase="dusk"
          data-time="9:30 PM"
          data-label="The bill"
          style={{ scrollMarginTop: 40 }}
        >
          <div className="mesa-land-inner mesa-land-center">
            <Reveal>
              <p className="mesa-land-stamp">YOUR BILL, PO</p>
            </Reveal>
            <Reveal delay={1}>
              <h2>
                Less than one table&apos;s <span className="mesa-land-em">merienda.</span>
              </h2>
            </Reveal>
            <Reveal delay={2}>
              <Receipt />
            </Reveal>
          </div>
        </section>

        {/* ═══ tomorrow, 5:48 AM · CTA ═══ */}
        <section className="mesa-land-chapter" data-chapter data-phase="night" data-time="5:48 AM" data-label="Tomorrow">
          <div className="mesa-land-inner mesa-land-center">
            <Reveal>
              <p className="mesa-land-stamp">TOMORROW · 5:48 AM</p>
            </Reveal>
            <Reveal delay={1}>
              <h2 style={{ fontSize: "clamp(34px, 5.4vw, 60px)" }}>
                Same dark café.
                <br />
                But the menu is already <span className="mesa-land-em">perfect.</span>
              </h2>
            </Reveal>
            <Reveal delay={2}>
              <p className="mesa-land-lede">
                Mesa is in beta and free to try right now — sign up, set up tonight, live before
                tomorrow&apos;s first order. Or open the demo first and hold a Mesa menu in your
                hand.
              </p>
            </Reveal>
            <Reveal delay={3}>
              <div className="mesa-land-ctas">
                <Button as="a" href="/request-access" variant="primary" size="lg">
                  Start free
                </Button>
                <Link href="/demo" className="mesa-land-btn-ghost">
                  See the live demo →
                </Link>
              </div>
              <p className="mesa-land-fineprint">Free while in beta · no card · cancel anytime</p>
            </Reveal>
          </div>
        </section>
      </main>
    </div>
  );
}

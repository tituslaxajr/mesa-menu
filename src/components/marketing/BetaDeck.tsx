"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Printer,
  Clock,
  Tag,
  FileText,
  Smartphone,
  Search,
  ShoppingCart,
  Sparkles,
  RotateCcw,
  Banknote,
  ChefHat,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Send,
  DoorOpen,
} from "lucide-react";
import { Logo } from "@/components/ds";
import { annualPerMonth } from "@/lib/data";

/* ════════════════════════════════════════════════════════════════════
   Beta pitch deck — /presentation
   A scroll-snap slide deck to promote Mesa to prospective beta cafés.
   Structure: pain → solution → how it works → benefits → the beta ask →
   guidelines → register CTA. On-brand (café espresso/cream/clay palette),
   keyboard + dot navigable, respects reduced motion (globals.css).
   ════════════════════════════════════════════════════════════════════ */

const SLIDES = [
  "Welcome",
  "The problem",
  "Meet Mesa",
  "How it works",
  "What you get",
  "Free in beta",
  "Being a tester",
  "Join the beta",
] as const;

const REGISTER_HREF = "/request-access";

export function BetaDeck() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const goTo = useCallback((i: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, i));
    scrollerRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${clamped}"]`)
      ?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Track which slide is centered for the progress rail + aria. The deck
  // is its own scroll container and slides can be taller than the viewport,
  // so we pick the slide whose center is nearest the scroller's center
  // rather than lean on IntersectionObserver visibility ratios.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const update = () => {
      const slides = scroller.querySelectorAll<HTMLElement>("[data-idx]");
      const mid = scroller.scrollTop + scroller.clientHeight / 2;
      let best = 0;
      let bestDist = Infinity;
      slides.forEach((s) => {
        const dist = Math.abs(s.offsetTop + s.offsetHeight / 2 - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = Number(s.dataset.idx) || 0;
        }
      });
      setActive((prev) => (prev === best ? prev : best));
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        goTo(active + 1);
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        goTo(active - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(SLIDES.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo]);

  return (
    <div className="deck" ref={scrollerRef}>
      <DeckStyles />

      {/* Fixed chrome */}
      <header className="deck-top">
        <Link href="/" aria-label="Mesa home" className="deck-brand">
          <Logo size="md" tone="ondark" />
        </Link>
        <Link href={REGISTER_HREF} className="deck-top-cta">
          Apply for the beta <ArrowRight size={15} />
        </Link>
      </header>

      {/* Progress rail */}
      <nav className="deck-rail" aria-label="Slides">
        {SLIDES.map((label, i) => (
          <button
            key={label}
            className={`deck-dot ${i === active ? "is-active" : ""}`}
            aria-label={`Go to slide ${i + 1}: ${label}`}
            aria-current={i === active}
            onClick={() => goTo(i)}
          >
            <span className="deck-dot-label">{label}</span>
          </button>
        ))}
      </nav>

      {/* ── 1 · Cover ─────────────────────────────────────────────── */}
      <section
        data-idx={0}
        className="slide slide--espresso slide--cover"
        aria-label="Welcome"
      >
        <div className="slide-in">
          <span className="eyebrow eyebrow--honey">
            <Sparkles size={14} /> Private beta · San Fernando, Pampanga
          </span>
          <h1 className="cover-title">
            Change your menu
            <br />
            in <em>one tap.</em>
          </h1>
          <p className="cover-sub">
            Mesa turns the table tent into a live QR menu. Sold out, price
            change, or a merienda promo — update once and every table sees it.
            No reprints. No app to download.
          </p>
          <p className="cover-note">
            You&apos;re invited to shape it before anyone else. Here&apos;s what
            that looks like.
          </p>
        </div>
        <button className="deck-scroll-hint" onClick={() => goTo(1)}>
          Scroll to begin <span aria-hidden>↓</span>
        </button>
      </section>

      {/* ── 2 · The problem ───────────────────────────────────────── */}
      <section
        data-idx={1}
        className="slide slide--cream"
        aria-label="The problem"
      >
        <div className="slide-in wide">
          <span className="eyebrow">The daily grind</span>
          <h2 className="slide-h2 ink">
            A paper menu is out of date the moment it&apos;s printed.
          </h2>
          <div className="pain-grid">
            <PainCard
              icon={<Printer size={22} />}
              title="Reprints every change"
              body="New price, a dropped item, a seasonal drink — off to the printer again. Time and money, every time."
            />
            <PainCard
              icon={<Clock size={22} />}
              title="&ldquo;Sorry, that&apos;s sold out&rdquo;"
              body="Your staff repeat it all day. Guests order, then have to re-choose. The menu never keeps up with the counter."
            />
            <PainCard
              icon={<Tag size={22} />}
              title="Promos nobody sees"
              body="The merienda deal lives on a chalkboard by the door — invisible to the table already seated and scrolling."
            />
            <PainCard
              icon={<FileText size={22} />}
              title="A PDF that pinches shut"
              body="The &ldquo;online menu&rdquo; is a photo or PDF guests must zoom into. It looks nothing like your café."
            />
          </div>
        </div>
      </section>

      {/* ── 3 · Meet Mesa ─────────────────────────────────────────── */}
      <section
        data-idx={2}
        className="slide slide--espresso"
        aria-label="Meet Mesa"
      >
        <div className="slide-in wide two-col">
          <div>
            <span className="eyebrow eyebrow--honey">The fix</span>
            <h2 className="slide-h2">
              One QR on the table.
              <br />
              One menu you own.
            </h2>
            <p className="lead">
              Guests scan the tent card and browse a menu that looks like your
              café — your colours, your fonts, your photos. You edit it from a
              phone in your Studio, and the change is live before the next
              customer looks down.
            </p>
            <ul className="tick-list">
              <li>
                <CheckCircle2 size={18} /> Update prices &amp; items in seconds
              </li>
              <li>
                <CheckCircle2 size={18} /> Flip anything sold-out with one toggle
              </li>
              <li>
                <CheckCircle2 size={18} /> Run a promo that every table can see
              </li>
              <li>
                <CheckCircle2 size={18} /> Five themes + a brand kit, no designer
                needed
              </li>
            </ul>
          </div>
          <div className="beam">
            <div className="beam-phone">
              <div className="beam-row">
                <span>Kapeng Barako</span>
                <b>₱90</b>
              </div>
              <div className="beam-row is-out">
                <span>Ube Cheesecake</span>
                <em>Sold out</em>
              </div>
              <div className="beam-row is-promo">
                <span>Merienda set · 2–5pm</span>
                <b>₱149</b>
              </div>
              <div className="beam-row">
                <span>Spanish Latte</span>
                <b>₱120</b>
              </div>
            </div>
            <p className="beam-cap">Live on every guest&apos;s phone</p>
          </div>
        </div>
      </section>

      {/* ── 4 · How it works ──────────────────────────────────────── */}
      <section
        data-idx={3}
        className="slide slide--cream"
        aria-label="How it works"
      >
        <div className="slide-in wide">
          <span className="eyebrow">Three steps for your guest</span>
          <h2 className="slide-h2 ink">From table to counter in a minute.</h2>
          <div className="step-grid">
            <StepCard
              n="1"
              icon={<Smartphone size={24} />}
              title="Scan"
              body="Guest points their camera at the table QR. The menu opens in the browser — no download, no sign-up."
            />
            <StepCard
              n="2"
              icon={<Search size={24} />}
              title="Browse"
              body="They search, filter by diet, and pick options — size, milk, add-ons — on a menu that feels like your café."
            />
            <StepCard
              n="3"
              icon={<ShoppingCart size={24} />}
              title="Show at the counter"
              body="They build their order and show the summary to your staff, who ring it up on your existing register."
            />
          </div>
          <div className="loop-note">
            <RotateCcw size={18} />
            <span>
              Meanwhile you edit in the Studio — sold-out toggles, price tweaks,
              daily specials — and it&apos;s live instantly. Kitchen-side order
              tracking is coming next.
            </span>
          </div>
        </div>
      </section>

      {/* ── 5 · Benefits ──────────────────────────────────────────── */}
      <section
        data-idx={4}
        className="slide slide--espresso"
        aria-label="What you get"
      >
        <div className="slide-in wide">
          <span className="eyebrow eyebrow--honey">Why cafés love it</span>
          <h2 className="slide-h2">What Mesa gives back to you.</h2>
          <div className="benefit-grid">
            <BenefitCard
              icon={<Banknote size={20} />}
              title="Stop paying to reprint"
              body="Your menu changes cost nothing. Ever."
            />
            <BenefitCard
              icon={<Clock size={20} />}
              title="Minutes, not print runs"
              body="Change the menu between orders, from your phone."
            />
            <BenefitCard
              icon={<Smartphone size={20} />}
              title="Looks like your café"
              body="Themes, fonts, colours, photos — not a grey PDF."
            />
            <BenefitCard
              icon={<Tag size={20} />}
              title="Promos that land"
              body="Feature a special and every seated guest sees it."
            />
            <BenefitCard
              icon={<ShoppingCart size={20} />}
              title="Faster counters"
              body="Guests arrive decided. Less back-and-forth at the till."
            />
            <BenefitCard
              icon={<ChefHat size={20} />}
              title="Room to grow"
              body="Start browse-only; turn on ordering when you're ready."
            />
          </div>
        </div>
      </section>

      {/* ── 6 · Free during beta ──────────────────────────────────── */}
      <section
        data-idx={5}
        className="slide slide--clay"
        aria-label="Free in beta"
      >
        <div className="slide-in">
          <span className="eyebrow eyebrow--onclay">
            <Sparkles size={14} /> Beta-tester reward
          </span>
          <h2 className="slide-h2 onclay">
            Free today. A founding price
            <br />
            locked for two years.
          </h2>
          <p className="lead onclay">
            The full Studio is free for the whole beta — no card required. When
            Mesa launches, these founding rates are yours: exclusive to beta
            cafés, and price-locked for two full years. It&apos;s our thank-you
            for building Mesa with us.
          </p>
          <p className="price-cap">Your locked founding rate · beta cafés only</p>
          <div className="price-row">
            <PriceChip name="Starter" monthly={299} note="browse-only" />
            <PriceChip name="Brew" monthly={499} note="most popular · ordering" hero />
            <PriceChip name="Roast" monthly={999} note="multi-location" />
          </div>
          <p className="price-annual-note">
            All prices are <b>per month</b>. Pay yearly and get <b>2 months
            free</b> — that discount is locked in too.
          </p>
          <div className="lock-badge">
            <Clock size={15} /> 2-year price lock — applies only at launch
          </div>
          <p className="price-foot">
            You pay ₱0 during the beta. These rates take effect only when Mesa
            launches, and only for beta testers.
          </p>
        </div>
      </section>

      {/* ── 7 · Being a beta tester ───────────────────────────────── */}
      <section
        data-idx={6}
        className="slide slide--cream"
        aria-label="Being a tester"
      >
        <div className="slide-in wide two-col">
          <div>
            <span className="eyebrow">The beta ask</span>
            <h2 className="slide-h2 ink">What we&apos;d love from you.</h2>
            <p className="lead ink-soft">
              It&apos;s a working prototype and you&apos;re helping us shape it.
              Just <b>2–3 weeks</b>{" "}of real use — that&apos;s the whole
              commitment.
            </p>
            <ul className="guide-list">
              <li>
                <span className="guide-num">1</span>
                <div>
                  <b>Get set up — we&apos;ll help.</b>{" "}We&apos;ll help you
                  build your menu and set up your café, then hand you a
                  printable QR tent card + your Studio login.
                </div>
              </li>
              <li>
                <span className="guide-num">2</span>
                <div>
                  <b>Use it like it&apos;s live.</b> Update the menu daily, mark
                  sold-out items, and try a promo. Real use surfaces real
                  problems.
                </div>
              </li>
              <li>
                <span className="guide-num">3</span>
                <div>
                  <b>Tell us what breaks.</b> Tap <em>Feedback</em> in your
                  Studio anytime — the good, the confusing, the missing.
                </div>
              </li>
              <li>
                <span className="guide-num">4</span>
                <div>
                  <b>A quick weekly check-in.</b> Five minutes so we know what to
                  fix first.
                </div>
              </li>
            </ul>
          </div>
          <div className="expect-card">
            <h3>
              <Sparkles size={18} /> What to expect from us
            </h3>
            <ul>
              <li>
                <CheckCircle2 size={17} /> Free access to the full Studio
              </li>
              <li>
                <DoorOpen size={17} /> We&apos;ll drop by during peak hours to
                see Mesa in action
              </li>
              <li>
                <MessageSquare size={17} /> Direct line to the team — we read
                every message
              </li>
              <li>
                <RotateCcw size={17} /> Fast fixes; your feedback jumps the queue
              </li>
              <li>
                <Banknote size={17} /> A founding price locked for 2 years after
                launch
              </li>
              <li>
                <Clock size={17} /> Honesty about what&apos;s early — ordering is
                counter-only today, kitchen tracking is next
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 8 · CTA ───────────────────────────────────────────────── */}
      <section
        data-idx={7}
        className="slide slide--espresso slide--cta"
        aria-label="Join the beta"
      >
        <div className="slide-in">
          <span className="eyebrow eyebrow--honey">
            <Sparkles size={14} /> Limited beta spots
          </span>
          <h2 className="cta-title">
            The reprints stop <em>today.</em>
          </h2>
          <p className="cover-sub">
            Apply for the beta and we&apos;ll set up your café&apos;s live menu.
            It takes two minutes, and it&apos;s free.
          </p>
          <div className="cta-actions">
            <Link href={REGISTER_HREF} className="cta-btn cta-btn--primary">
              Register for the beta <ArrowRight size={18} />
            </Link>
            <Link href="/m/demo" className="cta-btn cta-btn--ghost">
              See a live menu first
            </Link>
          </div>
          <div className="cta-foot">
            <Send size={15} /> Questions?{" "}
            <a href="mailto:support@cortanatechsolutions.com">
              support@cortanatechsolutions.com
            </a>
          </div>
          <div className="deck-restart">
            <button onClick={() => goTo(0)}>
              <ArrowLeft size={14} /> Back to start
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── small pieces ─────────────────────────────────────────────────── */

function PainCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="pain-card">
      <span className="pain-ico">{icon}</span>
      <h3 dangerouslySetInnerHTML={{ __html: title }} />
      <p dangerouslySetInnerHTML={{ __html: body }} />
    </div>
  );
}

function StepCard({
  n,
  icon,
  title,
  body,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="step-card">
      <span className="step-n">{n}</span>
      <span className="step-ico">{icon}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="benefit-card">
      <span className="benefit-ico">{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </div>
  );
}

function PriceChip({
  name,
  monthly,
  note,
  hero = false,
}: {
  name: string;
  monthly: number;
  note: string;
  hero?: boolean;
}) {
  return (
    <div className={`price-chip ${hero ? "is-hero" : ""}`}>
      <span className="price-name">{name}</span>
      <span className="price-amt">
        ₱{monthly}
        <span className="price-per">/mo</span>
      </span>
      <span className="price-note">{note}</span>
      <span className="price-annual">
        ₱{annualPerMonth(monthly)}/mo billed yearly
      </span>
    </div>
  );
}

/* ── scoped styles ────────────────────────────────────────────────── */

function DeckStyles() {
  return (
    <style>{`
    .deck {
      height: 100dvh;
      overflow-y: auto;
      scroll-snap-type: y mandatory;
      background: var(--bean-950);
      color: var(--text-inverse);
      font-family: var(--font-sans);
    }
    .deck::-webkit-scrollbar { width: 0; }

    /* fixed chrome ---------------------------------------------------- */
    .deck-top {
      position: fixed; inset: 0 0 auto 0; z-index: 30;
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px clamp(18px, 4vw, 48px);
      pointer-events: none;
    }
    .deck-brand, .deck-top-cta { pointer-events: auto; }
    .deck-top-cta {
      display: inline-flex; align-items: center; gap: 7px;
      font-size: 14px; font-weight: 600; color: var(--bean-950);
      background: var(--honey-300);
      padding: 9px 16px; border-radius: 999px;
      box-shadow: 0 6px 18px rgba(0,0,0,.28);
      transition: transform .18s var(--ease-out), background .18s;
    }
    .deck-top-cta:hover { background: var(--honey-100); transform: translateY(-1px); }

    /* progress rail --------------------------------------------------- */
    .deck-rail {
      position: fixed; z-index: 30; right: clamp(12px, 2.4vw, 26px);
      top: 50%; transform: translateY(-50%);
      display: flex; flex-direction: column; gap: 14px; align-items: flex-end;
    }
    .deck-dot {
      position: relative; display: flex; align-items: center; justify-content: flex-end;
      width: 11px; height: 11px; padding: 0; border: 0; cursor: pointer;
      background: transparent;
    }
    .deck-dot::after {
      content: ""; width: 9px; height: 9px; border-radius: 999px;
      background: color-mix(in oklab, var(--bean-50) 34%, transparent);
      transition: all .22s var(--ease-out);
    }
    .deck-dot:hover::after { background: color-mix(in oklab, var(--bean-50) 62%, transparent); }
    .deck-dot.is-active::after {
      background: var(--honey-300);
      box-shadow: 0 0 0 4px color-mix(in oklab, var(--honey-500) 26%, transparent);
    }
    .deck-dot-label {
      position: absolute; right: 20px; white-space: nowrap;
      font-size: 12px; font-weight: 600; letter-spacing: .01em;
      color: var(--bean-100);
      background: color-mix(in oklab, var(--bean-950) 88%, transparent);
      padding: 4px 10px; border-radius: 999px;
      opacity: 0; transform: translateX(6px); pointer-events: none;
      transition: all .2s var(--ease-out);
    }
    .deck-dot:hover .deck-dot-label,
    .deck-dot.is-active .deck-dot-label { opacity: 1; transform: translateX(0); }

    /* slides ---------------------------------------------------------- */
    .slide {
      scroll-snap-align: start;
      min-height: 100dvh;
      display: grid; place-items: center;
      padding: 92px clamp(20px, 6vw, 96px) 72px;
      position: relative;
    }
    .slide--espresso {
      background:
        radial-gradient(120% 90% at 15% 0%, color-mix(in oklab, var(--clay-800) 32%, transparent) 0%, transparent 55%),
        linear-gradient(160deg, var(--bean-900) 0%, var(--bean-950) 70%);
    }
    .slide--cream { background: var(--cream); color: var(--text-body); }
    .slide--clay {
      background: linear-gradient(155deg, var(--clay-600) 0%, var(--clay-800) 100%);
      color: var(--text-on-clay);
    }

    .slide-in { width: 100%; max-width: 640px; }
    .slide-in.wide { max-width: 1040px; }
    .mesa-rise-deck { animation: mesa-rise var(--dur-slow) var(--ease-out) both; }

    .two-col {
      display: grid; grid-template-columns: 1.05fr .95fr;
      gap: clamp(28px, 5vw, 72px); align-items: center;
    }

    /* type ------------------------------------------------------------ */
    .eyebrow {
      display: inline-flex; align-items: center; gap: 7px;
      font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
      color: var(--text-subtle); margin-bottom: 20px;
    }
    .eyebrow--honey { color: var(--honey-300); }
    .eyebrow--onclay { color: var(--honey-50); }

    .cover-title {
      font-family: var(--font-newsreader); font-weight: 600;
      font-size: clamp(44px, 8.4vw, 96px); line-height: .98; letter-spacing: -.02em;
      margin: 0 0 26px; color: var(--text-inverse);
    }
    .cover-title em, .cta-title em { font-style: italic; color: var(--honey-300); }
    .cover-sub {
      font-size: clamp(17px, 2.1vw, 21px); line-height: 1.55; max-width: 34ch;
      color: var(--bean-200);
    }
    .cover-note { margin-top: 20px; font-size: 15px; color: var(--bean-400); }

    .slide-h2 {
      font-family: var(--font-newsreader); font-weight: 600;
      font-size: clamp(30px, 4.6vw, 52px); line-height: 1.06; letter-spacing: -.015em;
      margin: 0 0 22px; max-width: 18ch; color: var(--text-inverse);
    }
    .slide-h2.ink { color: var(--text-strong); }
    .slide-h2.onclay { color: var(--white); max-width: 20ch; }
    .cta-title {
      font-family: var(--font-newsreader); font-weight: 600;
      font-size: clamp(40px, 7vw, 82px); line-height: 1; letter-spacing: -.02em; margin: 0 0 22px;
      color: var(--text-inverse);
    }

    .lead { font-size: clamp(16px, 1.9vw, 19px); line-height: 1.6; color: var(--bean-200); max-width: 46ch; }
    .lead.ink-soft { color: var(--text-muted); }
    .lead.onclay { color: color-mix(in oklab, var(--white) 92%, var(--clay-100)); max-width: 52ch; }

    /* pain grid ------------------------------------------------------- */
    .pain-grid, .benefit-grid {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: clamp(14px, 1.8vw, 22px); margin-top: 34px;
    }
    .pain-card {
      background: var(--surface-card); border: 1px solid var(--border-soft);
      border-radius: var(--radius-lg); padding: 24px;
      box-shadow: var(--shadow-sm);
    }
    .pain-ico {
      display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px;
      background: var(--berry-50); color: var(--berry-600); margin-bottom: 14px;
    }
    .pain-card h3 { font-size: 18px; font-weight: 700; color: var(--text-strong); margin: 0 0 7px; }
    .pain-card p { font-size: 14.5px; line-height: 1.55; color: var(--text-muted); margin: 0; }

    /* meet mesa ------------------------------------------------------- */
    .tick-list { list-style: none; padding: 0; margin: 26px 0 0; display: grid; gap: 13px; }
    .tick-list li { display: flex; align-items: center; gap: 11px; font-size: 16px; color: var(--bean-100); }
    .tick-list svg { color: var(--sage-300); flex: none; }

    .beam { display: grid; justify-items: center; gap: 14px; }
    .beam-phone {
      width: 100%; max-width: 320px;
      background: color-mix(in oklab, var(--bean-800) 70%, var(--bean-950));
      border: 1px solid color-mix(in oklab, var(--bean-500) 40%, transparent);
      border-radius: 22px; padding: 16px; display: grid; gap: 10px;
      box-shadow: 0 24px 60px rgba(0,0,0,.4);
    }
    .beam-row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      background: color-mix(in oklab, var(--bean-50) 8%, transparent);
      border: 1px solid color-mix(in oklab, var(--bean-300) 18%, transparent);
      border-radius: 12px; padding: 13px 15px; font-size: 15px; color: var(--bean-100);
    }
    .beam-row b { font-family: var(--font-newsreader); font-size: 16px; color: var(--white); }
    .beam-row.is-out { opacity: .62; }
    .beam-row.is-out span { text-decoration: line-through; }
    .beam-row.is-out em { font-style: normal; font-size: 12px; font-weight: 700; letter-spacing: .04em;
      text-transform: uppercase; color: var(--berry-300); }
    .beam-row.is-promo {
      background: color-mix(in oklab, var(--honey-500) 20%, transparent);
      border-color: color-mix(in oklab, var(--honey-300) 55%, transparent);
    }
    .beam-cap { font-size: 13px; color: var(--bean-400); letter-spacing: .03em; }

    /* steps ----------------------------------------------------------- */
    .step-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(16px, 2vw, 26px); margin-top: 36px; }
    .step-card {
      position: relative; background: var(--surface-card); border: 1px solid var(--border-soft);
      border-radius: var(--radius-lg); padding: 30px 26px; box-shadow: var(--shadow-sm);
    }
    .step-n {
      position: absolute; top: 20px; right: 24px;
      font-family: var(--font-newsreader); font-size: 40px; font-weight: 600; line-height: 1;
      color: var(--bean-500);
    }
    .step-ico {
      display: grid; place-items: center; width: 52px; height: 52px; border-radius: 14px;
      background: var(--brand-soft); color: var(--brand); margin-bottom: 18px;
    }
    .step-card h3 { font-size: 21px; font-weight: 700; color: var(--text-strong); margin: 0 0 9px; }
    .step-card p { font-size: 15px; line-height: 1.55; color: var(--text-muted); margin: 0; }

    .loop-note {
      display: flex; align-items: center; gap: 14px; margin-top: 30px;
      background: var(--surface-sunken); border: 1px dashed var(--border-strong);
      border-radius: var(--radius-md); padding: 16px 20px;
      font-size: 15.5px; line-height: 1.5; color: var(--text-body);
    }
    .loop-note svg { color: var(--brand); flex: none; }

    /* benefits -------------------------------------------------------- */
    .benefit-grid { grid-template-columns: repeat(3, 1fr); margin-top: 34px; }
    .benefit-card {
      display: flex; gap: 14px; align-items: flex-start;
      background: color-mix(in oklab, var(--bean-50) 6%, transparent);
      border: 1px solid color-mix(in oklab, var(--bean-300) 16%, transparent);
      border-radius: var(--radius-lg); padding: 22px;
    }
    .benefit-ico {
      display: grid; place-items: center; width: 40px; height: 40px; border-radius: 11px; flex: none;
      background: color-mix(in oklab, var(--honey-500) 22%, transparent); color: var(--honey-300);
    }
    .benefit-card h3 { font-size: 16.5px; font-weight: 700; color: var(--white); margin: 0 0 5px; }
    .benefit-card p { font-size: 14px; line-height: 1.5; color: var(--bean-200); margin: 0; }

    /* pricing --------------------------------------------------------- */
    .price-row { display: flex; flex-wrap: wrap; gap: 14px; }
    .price-chip {
      display: grid; gap: 3px; padding: 18px 22px; min-width: 150px;
      background: color-mix(in oklab, var(--white) 14%, transparent);
      border: 1px solid color-mix(in oklab, var(--white) 30%, transparent);
      border-radius: var(--radius-lg);
    }
    .price-chip.is-hero { background: var(--white); color: var(--clay-700); }
    .price-name { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; opacity: .85; }
    .price-amt { font-family: var(--font-newsreader); font-size: 30px; font-weight: 600; display: inline-flex; align-items: baseline; }
    .price-per { font-family: var(--font-sans); font-size: 13px; font-weight: 600; opacity: .75; margin-left: 2px; }
    .price-note { font-size: 12.5px; opacity: .8; }
    .price-annual { margin-top: 6px; padding-top: 7px; border-top: 1px solid color-mix(in oklab, currentColor 22%, transparent); font-size: 12px; font-weight: 600; opacity: .82; }
    .price-annual-note { margin-top: 14px; font-size: 13.5px; line-height: 1.5; color: var(--honey-50); }
    .price-annual-note b { font-weight: 700; }
    .price-cap { margin: 30px 0 12px; font-size: 12.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--honey-50); }
    .lock-badge {
      display: inline-flex; align-items: center; gap: 8px; margin-top: 16px;
      padding: 8px 15px; border-radius: 999px;
      background: var(--honey-300); color: var(--clay-900);
      font-size: 13.5px; font-weight: 700; letter-spacing: .01em;
    }
    .price-foot { margin-top: 14px; font-size: 14px; color: color-mix(in oklab, var(--honey-100) 90%, white); }

    /* beta guidelines ------------------------------------------------- */
    .guide-list { list-style: none; padding: 0; margin: 24px 0 0; display: grid; gap: 16px; }
    .guide-list li { display: flex; gap: 14px; align-items: flex-start; font-size: 15.5px; line-height: 1.5; color: var(--text-body); }
    .guide-list b { color: var(--text-strong); }
    .guide-num {
      display: grid; place-items: center; width: 28px; height: 28px; border-radius: 999px; flex: none;
      background: var(--brand); color: var(--brand-on); font-size: 14px; font-weight: 700;
    }
    .expect-card {
      background: var(--bean-900); color: var(--bean-100);
      border-radius: var(--radius-xl); padding: 30px; box-shadow: var(--shadow-lg);
    }
    .expect-card h3 {
      display: flex; align-items: center; gap: 9px;
      font-size: 15px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
      color: var(--honey-300); margin: 0 0 18px;
    }
    .expect-card ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; }
    .expect-card li { display: flex; gap: 11px; align-items: flex-start; font-size: 15px; line-height: 1.45; }
    .expect-card svg { color: var(--sage-300); flex: none; margin-top: 1px; }

    /* cta ------------------------------------------------------------- */
    .slide--cta { text-align: center; }
    .slide--cta .slide-in { display: grid; justify-items: center; }
    .slide--cta .cover-sub { max-width: 42ch; margin-inline: auto; }
    .cta-actions { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; margin-top: 34px; }
    .cta-btn {
      display: inline-flex; align-items: center; gap: 9px;
      font-size: 16px; font-weight: 600; padding: 15px 28px; border-radius: 999px;
      transition: transform .18s var(--ease-out), background .18s, border-color .18s;
    }
    .cta-btn--primary { background: var(--honey-300); color: var(--bean-950); box-shadow: 0 10px 30px rgba(0,0,0,.32); }
    .cta-btn--primary:hover { background: var(--honey-100); transform: translateY(-2px); }
    .cta-btn--ghost { border: 1.5px solid color-mix(in oklab, var(--bean-50) 40%, transparent); color: var(--bean-100); }
    .cta-btn--ghost:hover { border-color: var(--bean-100); background: color-mix(in oklab, var(--bean-50) 8%, transparent); }
    .cta-foot { display: inline-flex; align-items: center; gap: 8px; margin-top: 26px; font-size: 14px; color: var(--bean-400); }
    .cta-foot svg { color: var(--honey-300); }
    .cta-foot a { color: var(--honey-300); text-decoration: underline; text-underline-offset: 2px; }
    .cta-foot a:hover { color: var(--honey-100); }
    .deck-restart { margin-top: 34px; }
    .deck-restart button {
      display: inline-flex; align-items: center; gap: 6px; background: transparent; border: 0; cursor: pointer;
      font-size: 13px; color: var(--bean-400); font-family: var(--font-sans);
    }
    .deck-restart button:hover { color: var(--bean-100); }

    /* scroll hint ----------------------------------------------------- */
    .deck-scroll-hint {
      position: absolute; bottom: 34px; left: 50%; transform: translateX(-50%);
      background: transparent; border: 0; cursor: pointer;
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 13px; letter-spacing: .04em; color: var(--bean-400); font-family: var(--font-sans);
      animation: mesa-hint-bob 2.4s var(--ease-standard) infinite;
    }
    .deck-scroll-hint span { font-size: 16px; }
    @keyframes mesa-hint-bob { 0%,100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, 5px); } }

    /* responsive ------------------------------------------------------ */
    @media (max-width: 860px) {
      .two-col { grid-template-columns: 1fr; }
      .step-grid { grid-template-columns: 1fr; }
      .benefit-grid { grid-template-columns: 1fr; }
      .deck-rail { display: none; }
      .beam { order: -1; }
    }
    @media (max-width: 560px) {
      .pain-grid { grid-template-columns: 1fr; }
      .deck-top-cta span { display: none; }
      .slide { padding: 84px 20px 64px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .deck-scroll-hint { animation: none; }
      .deck { scroll-behavior: auto; }
    }
    `}</style>
  );
}

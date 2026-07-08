"use client";
// Day One — onboarding as the first sixty seconds of the café's life with
// Mesa, not a form. Name the café (watch the tent card render), set your
// hours (the dashboard's day runs on them), tap the items you sell (watch
// them land on a live phone), pick how it feels — then the magic moment:
// the real QR, live right now, scan it with your own phone.
import { useActionState, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { createCafe, type CafeFormState } from "@/lib/cafe-actions";
import { STARTER_CATALOG, THEMES, DEFAULT_BRAND, type MenuItem, type ThemeKey, type Cafe } from "@/lib/data";
import { hoursDisplay, phaseFor, PHASE_LABEL, DEFAULT_HOURS } from "@/lib/day-phase";
import { menuUrl, menuLabel } from "@/lib/site";
import { LivePreview } from "./LivePreview";

const PLACEHOLDER_COVER =
  "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="5"><rect width="8" height="5" fill="#e8dcc9"/></svg>');

const field: React.CSSProperties = {
  width: "100%",
  height: 46,
  borderRadius: "var(--radius-md)",
  border: "1.5px solid var(--border-default)",
  background: "var(--surface-card)",
  color: "var(--text-strong)",
  padding: "0 14px",
  fontSize: 15,
  fontFamily: "var(--font-sans)",
};
const label: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-body)",
  marginBottom: 6,
  fontFamily: "var(--font-sans)",
};
const linkBtn: React.CSSProperties = {
  border: 0,
  background: "none",
  color: "var(--brand)",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 12.5,
  padding: 0,
  fontFamily: "var(--font-sans)",
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

const toTimeInput = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const fromTimeInput = (v: string) => { const [h, m] = v.split(":").map(Number); return (h || 0) * 60 + (m || 0); };

/** The table tent from the landing story — here it renders THEIR café. */
function TentCard({ name, qrUrl }: { name: string; qrUrl?: string }) {
  return (
    <div style={{ background: "var(--cream)", border: "1px solid var(--bean-200)", borderRadius: 14, boxShadow: "var(--shadow-lg)", padding: "26px 22px 20px", width: 240, margin: "0 auto", textAlign: "center", transform: "rotate(-1.5deg)" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--bean-900)", lineHeight: 1.15, minHeight: 30 }}>
        {name || "Your Café"}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".18em", color: "var(--text-subtle)", margin: "10px 0 14px" }}>SCAN FOR OUR MENU</div>
      {qrUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrUrl} alt="Your live menu QR code" style={{ width: 150, height: 150, margin: "0 auto", display: "block", borderRadius: 8 }} />
      ) : (
        <div style={{ width: 150, height: 150, margin: "0 auto", borderRadius: 8, border: "2px dashed var(--bean-200)", display: "grid", placeItems: "center", color: "var(--text-subtle)", fontSize: 11.5, fontFamily: "var(--font-sans)", padding: 12 }}>
          your QR appears here
        </div>
      )}
      <div style={{ fontSize: 10.5, color: "var(--text-subtle)", marginTop: 12, fontFamily: "var(--font-sans)" }}>
        powered by <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--brand)" }}>mesa</span>
      </div>
    </div>
  );
}

const STEPS = ["Your café", "Your hours", "Your menu", "The look"] as const;

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<CafeFormState | undefined, FormData>(
    createCafe,
    undefined,
  );
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [editLink, setEditLink] = useState(false);
  const [openMin, setOpenMin] = useState(DEFAULT_HOURS.openMin);
  const [closeMin, setCloseMin] = useState(DEFAULT_HOURS.closeMin);
  const [picked, setPicked] = useState<Map<string, number>>(new Map());
  const [start, setStart] = useState<"picker" | "sample" | "blank">("picker");
  const [theme, setTheme] = useState<ThemeKey>("warm");
  const effectiveSlug = slug ? slugify(slug) : slugify(name);
  const hrs = useMemo(
    () => (closeMin > openMin ? { openMin, closeMin } : DEFAULT_HOURS),
    [openMin, closeMin],
  );

  // Ephemeral café + items so the phone preview shows THEIR menu while they build it.
  const previewItems: MenuItem[] = useMemo(() => {
    if (start === "sample" || (start === "picker" && picked.size === 0)) {
      return STARTER_CATALOG.slice(0, 6).map((s, i) => ({ id: `p-${i}`, cat: s.cat, name: s.name, price: s.price, desc: "", img: s.img }));
    }
    return [...picked.entries()].map(([n, price], i) => {
      const stock = STARTER_CATALOG.find((s) => s.name === n);
      return { id: `p-${i}`, cat: stock?.cat ?? "Menu", name: n, price, desc: "", img: stock?.img ?? PLACEHOLDER_COVER };
    });
  }, [picked, start]);
  const previewCats = useMemo(() => ["All", ...Array.from(new Set(previewItems.map((m) => m.cat)))], [previewItems]);
  const previewCafe: Cafe = useMemo(() => ({
    slug: effectiveSlug || "your-cafe",
    name: name || "Your Café",
    tagline: "",
    intro: "Fresh from our kitchen, every day.",
    hours: hoursDisplay(hrs),
    cover: STARTER_CATALOG[0].img || PLACEHOLDER_COVER,
    plan: "brew",
    theme,
  }), [effectiveSlug, name, hrs, theme]);

  const cats = Array.from(new Set(STARTER_CATALOG.map((s) => s.cat)));
  const canNext = step === 0 ? !!name.trim() && !!effectiveSlug : step === 2 ? start !== "picker" || picked.size > 0 : true;

  /* ── the magic moment ── */
  if (state?.createdSlug) {
    const url = menuUrl(state.createdSlug);
    const qr = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=300x300&color=2A1D16&bgcolor=FFFFFF&margin=8`;
    const nowPhase = phaseFor(new Date(), hrs);
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "var(--bean-950)", color: "var(--bean-50)", padding: 20 }}>
        <div className="mesa-anim-rise" style={{ textAlign: "center", maxWidth: 460 }}>
          <TentCard name={name} qrUrl={qr} />
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, margin: "28px 0 8px" }}>This is live.</h1>
          <p style={{ fontSize: 15, opacity: 0.75, lineHeight: 1.6, fontFamily: "var(--font-sans)" }}>
            Scan it with your own phone — right now. That&rsquo;s exactly what your guests will get at{" "}
            <a href={url} target="_blank" style={{ color: "var(--clay-300)", fontWeight: 600 }}>{menuLabel(state.createdSlug)}</a>.
          </p>
          <p style={{ fontSize: 13, opacity: 0.55, margin: "18px 0 22px", fontFamily: "var(--font-sans)" }}>
            Day 1 · {new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })} · {PHASE_LABEL[nowPhase]}
          </p>
          <a
            href="/dashboard"
            style={{ display: "inline-flex", alignItems: "center", gap: 9, height: 48, padding: "0 26px", borderRadius: 999, background: "var(--clay-500)", color: "var(--text-on-clay)", fontSize: 15, fontWeight: 700, textDecoration: "none", fontFamily: "var(--font-sans)" }}
          >
            Open my day <ArrowRight size={17} />
          </a>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "var(--surface-page)", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 500, background: "var(--surface-card)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)", padding: "28px 26px" }}>
        {/* progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div style={{ height: 4, borderRadius: 999, background: i <= step ? "var(--brand)" : "var(--border-soft)", transition: "background-color .2s" }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: i === step ? "var(--brand-active)" : "var(--text-subtle)", fontFamily: "var(--font-sans)" }}>{s}</span>
            </div>
          ))}
        </div>

        <form action={formAction} style={{ display: "grid", gap: 16 }}>
          {/* hidden mirrors — the actual payload */}
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="slug" value={effectiveSlug} />
          <input type="hidden" name="theme" value={theme} />
          <input type="hidden" name="openMin" value={hrs.openMin} />
          <input type="hidden" name="closeMin" value={hrs.closeMin} />
          <input type="hidden" name="start" value={start} />
          <input type="hidden" name="items" value={JSON.stringify([...picked.entries()].map(([n, price]) => ({ name: n, price, cat: STARTER_CATALOG.find((s) => s.name === n)?.cat ?? "Menu" })))} />

          {step === 0 && (
            <>
              <div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--text-strong)", margin: "0 0 4px" }}>Name your café.</h1>
                <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "0 0 16px", fontFamily: "var(--font-sans)" }}>Watch the table tent set itself — this lands on your tables later.</p>
                <TentCard name={name} />
              </div>
              <div>
                <label htmlFor="ob-name" style={label}>Café name</label>
                <input id="ob-name" type="text" required placeholder="e.g. Kape Kalye" value={name} onChange={(e) => setName(e.target.value)} style={field} autoFocus />
              </div>
              {editLink ? (
                <div>
                  <label htmlFor="ob-slug" style={label}>Menu link</label>
                  <input id="ob-slug" type="text" placeholder="auto from your name" value={slug} onChange={(e) => setSlug(e.target.value)} style={field} />
                </div>
              ) : null}
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", fontFamily: "var(--font-sans)", margin: 0 }}>
                Your menu will live at <span style={{ color: "var(--brand-active)", fontWeight: 600 }}>/m/{effectiveSlug || "your-cafe"}</span>
                {!editLink && (
                  <> · <button type="button" onClick={() => setEditLink(true)} style={linkBtn}>change link</button></>
                )}
              </p>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--text-strong)", margin: "0 0 4px" }}>When are you open?</h1>
                <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, fontFamily: "var(--font-sans)" }}>
                  Guests see this on the menu — and your dashboard follows your day with it: opening prep, service, merienda, closing.
                </p>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="ob-open" style={label}>Opens</label>
                  <input id="ob-open" type="time" value={toTimeInput(openMin)} onChange={(e) => setOpenMin(fromTimeInput(e.target.value))} style={field} />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="ob-close" style={label}>Closes</label>
                  <input id="ob-close" type="time" value={toTimeInput(closeMin)} onChange={(e) => setCloseMin(fromTimeInput(e.target.value))} style={field} />
                </div>
              </div>
              {closeMin <= openMin && (
                <p style={{ fontSize: 12.5, color: "var(--soldout)", margin: 0, fontFamily: "var(--font-sans)" }}>Closing should be after opening — we&rsquo;ll use 7:00 AM – 9:00 PM until it is.</p>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--text-strong)", margin: "0 0 4px" }}>Your menu in 60 seconds.</h1>
                <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, fontFamily: "var(--font-sans)" }}>
                  Tap what you sell — fix prices as you go. {picked.size > 0 && <strong>{picked.size} item{picked.size > 1 ? "s" : ""} on the menu.</strong>}
                </p>
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto", display: "grid", gap: 14, paddingRight: 4 }}>
                {cats.map((c) => (
                  <div key={c}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 7, fontFamily: "var(--font-sans)" }}>{c}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {STARTER_CATALOG.filter((s) => s.cat === c).map((s) => {
                        const on = picked.has(s.name);
                        return (
                          <span key={s.name} style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, border: on ? "1.5px solid var(--brand)" : "1.5px solid var(--border-default)", background: on ? "var(--brand-soft)" : "var(--surface-card)", overflow: "hidden" }}>
                            <button
                              type="button"
                              onClick={() => setPicked((p) => { const n = new Map(p); if (n.has(s.name)) n.delete(s.name); else n.set(s.name, s.price); return n; })}
                              style={{ display: "inline-flex", alignItems: "center", gap: 6, border: 0, background: "transparent", padding: "8px 4px 8px 13px", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: on ? "var(--brand-active)" : "var(--text-body)", fontFamily: "var(--font-sans)" }}
                            >
                              {on && <Check size={13} />} {s.name}
                            </button>
                            {on ? (
                              <span style={{ display: "inline-flex", alignItems: "center", paddingRight: 10, fontFamily: "var(--font-sans)" }}>
                                <span style={{ fontSize: 13, color: "var(--brand-active)" }}>·&nbsp;₱</span>
                                <input
                                  type="number"
                                  value={picked.get(s.name)}
                                  min={0}
                                  onChange={(e) => setPicked((p) => new Map(p).set(s.name, Math.max(0, Number(e.target.value) || 0)))}
                                  style={{ width: 52, border: 0, background: "transparent", fontSize: 13.5, fontWeight: 700, color: "var(--brand-active)", fontFamily: "var(--font-sans)" }}
                                  aria-label={`${s.name} price`}
                                />
                              </span>
                            ) : (
                              <span style={{ paddingRight: 13, fontSize: 12.5, color: "var(--text-subtle)", fontFamily: "var(--font-sans)" }}>₱{s.price}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0, fontFamily: "var(--font-sans)" }}>
                Don&rsquo;t worry about getting this exactly right — anything you pick (name, price, photos) can be edited or removed later.
              </p>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0, fontFamily: "var(--font-sans)" }}>
                {start === "picker" && (
                  <>
                    Menu not ready?{" "}
                    <button type="button" onClick={() => { setStart("sample"); setPicked(new Map()); }} style={linkBtn}>
                      load the full sample menu
                    </button>
                    {" "}or{" "}
                    <button type="button" onClick={() => { setStart("blank"); setPicked(new Map()); }} style={linkBtn}>
                      skip for now
                    </button>
                  </>
                )}
                {start === "sample" && (
                  <>
                    <span style={{ color: "var(--sage-600)", fontWeight: 600 }}>Sample menu selected</span> —{" "}
                    <button type="button" onClick={() => setStart("picker")} style={linkBtn}>pick my own</button>
                  </>
                )}
                {start === "blank" && (
                  <>
                    <span style={{ color: "var(--sage-600)", fontWeight: 600 }}>Menu skipped</span> — add items anytime from the dashboard.{" "}
                    <button type="button" onClick={() => setStart("picker")} style={linkBtn}>pick my own instead</button>
                  </>
                )}
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--text-strong)", margin: "0 0 4px" }}>How does your café feel?</h1>
                <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, fontFamily: "var(--font-sans)" }}>
                  That&rsquo;s your menu in the phone — your items, your name. Change everything later in the Look studio.
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {THEMES.map((t) => (
                  <button key={t.key} type="button" onClick={() => setTheme(t.key as ThemeKey)} style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 999, border: theme === t.key ? "1.5px solid var(--brand)" : "1.5px solid var(--border-default)", background: theme === t.key ? "var(--brand-soft)" : "var(--surface-card)", padding: "8px 13px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: theme === t.key ? "var(--brand-active)" : "var(--text-body)", fontFamily: "var(--font-sans)" }}>
                    <span style={{ display: "inline-flex", gap: 2 }}>
                      {t.swatch.map((c, i) => <span key={i} style={{ width: 9, height: 9, borderRadius: 999, background: c, border: "1px solid rgba(0,0,0,0.08)" }} />)}
                    </span>
                    {t.name}
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", placeItems: "center" }}>
                <LivePreview cafe={previewCafe} menu={previewItems} categories={previewCats} theme={theme} brand={DEFAULT_BRAND} plan="brew" width={260} height={430} />
              </div>
            </>
          )}

          {state?.error && (
            <p role="alert" style={{ fontSize: 13.5, color: "var(--danger, #b42318)", margin: 0, fontFamily: "var(--font-sans)" }}>
              {state.error}
            </p>
          )}

          {/* nav */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} style={{ height: 48, padding: "0 18px", borderRadius: 999, border: "1.5px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-body)", fontSize: 14.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-sans)" }}>
                <ArrowLeft size={16} /> Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setStep((s) => s + 1)}
                style={{ flex: 1, height: 48, border: 0, borderRadius: 999, background: "var(--brand)", color: "var(--brand-on)", fontSize: 15, fontWeight: 700, cursor: canNext ? "pointer" : "default", opacity: canNext ? 1 : 0.55, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "var(--font-sans)" }}
              >
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={pending}
                style={{ flex: 1, height: 48, border: 0, borderRadius: 999, background: "var(--brand)", color: "var(--brand-on)", fontSize: 15, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "var(--font-sans)" }}
              >
                <Sparkles size={16} /> {pending ? "Going live…" : "Make it live"}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

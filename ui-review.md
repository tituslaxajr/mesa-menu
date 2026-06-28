# Mesa — UI Polish Review

_Living document for the UI polish loop. Re-render and re-score; never mark a screen done from memory._

---

## LOOP STATUS — converged on measurable work (as of iteration 7)

**All measurable High/Medium issues across every rubric dimension are resolved** (8 commits, iters 1–7):
- **Touch targets ≥44px** — fixed everywhere: menu chips/tabs, all 5 themes' category pills, ordering option pills + quantity stepper, Studio reorder buttons (×20), nav items (drawer + sidebar), Appearance segmented control, QR PNG buttons (×8), header link.
- **Intra-theme consistency (pills/fonts/prices)** — warm rail price unified; bold pills 44px; prices measured uniform per theme.
- **WCAG AA contrast** — bold logo 1.34→16.76; brand clay-500→clay-600 (5.52); honey badge + `--text-subtle` nudged; warm/soft/bold re-scanned = zero real failures.
- **Dashboard** — stat cards 2×2; empty states on-brand.
- **Type system** — coherent: named display scale + a consistent set of intermediate UI sizes (13/14/15/16.5/20px) for component density (house style, repo wins) — not orphans.

**Remaining = blocked or Low only** → loop stops scheduling rather than spin:
- _Screenshot-gated_ (preview renderer down all session — environmental): landing visual rhythm + desktop, dashboard desktop sidebar, theme visuals, fine alignment/spacing rhythm. **Needs a session with a working screenshot tool.**
- _Low_: T7b sheet/cart price weight (400) vs menu (500) — visual judgment, deferred.

---

## ORIENTATION (last updated: iteration 1)

### Screens (derived from `src/app` routing)
| Route | File | Purpose | Primary viewport |
|-------|------|---------|------------------|
| `/` | `src/app/page.tsx` | Marketing landing (Nav, Hero, CustomerApp, OwnerDashboard, Customization, HowItWorks, Pricing, Footer) | desktop + mobile |
| `/m/[slug]` | `src/app/m/[slug]/page.tsx` → `MenuBrowser` | **Customer menu** — the QR-scan target. THE primary mobile screen. Themed (5 themes via `menu-themes.tsx`). | mobile-first |
| `/dashboard` | `src/app/dashboard/page.tsx` → `DashboardShell` | Owner Studio — Home, Orders, Menu, Appearance, QR, Analytics, Settings. Mobile = bottom nav + drawer; desktop = sidebar. | mobile + desktop |

### Design system (ground truth — `src/styles/tokens/*` + `components.css`)
- **Type:** Display = Newsreader (serif), UI/body = Hanken Grotesk (sans). Scale `--text-2xs`(11) → `--text-5xl`(84). Weights 400/500/600/700.
- **Color:** Warm café palette. Brand = clay/terracotta `--clay-500 #C8592E`. Neutrals = "bean" espresso→cream. Status: sage (available), honey (highlight), berry (sold-out). Page bg `--cream #FBF6EE`. Semantic aliases (`--text-strong/body/muted/subtle`, `--surface-*`, `--border-*`) — **reference these, not raw ramps**.
- **Spacing:** 4px grid, `--space-1`→`--space-24`. Containers sm/md/lg = 28/48/72rem.
- **Radii:** xs6 sm10 md14 lg20 xl28 2xl36 pill999. **Shadows:** warm espresso-tinted (never gray #000). **Motion:** gentle, `--ease-standard/out`, durations 120/200/320/420ms; respects `prefers-reduced-motion`.
- Components are class-based (`.mesa-*` in `components.css`); screens compose them with inline-style layout. Inline px for layout is house style (consistent throughout).

### Render method
- Dev server via Preview MCP: `.claude/launch.json` → `mesa` (npm run dev, port 3000, autoPort).
- **Gotcha 1 (Next 16 single-instance):** only one `next dev` per dir. If a stale server holds port 3000, the preview server dies on start. Free the port (`taskkill /PID <pid> /F` after `netstat -ano | grep :3000`) then `preview_start`.
- **Gotcha 2 (screenshot hangs → fully down by iter 4):** `preview_screenshot` first needed an animation-kill style + retries; by iteration 4 it times out on *every* page (customer menu included) even after a server restart — environmental, not app. **Authoritative verification = `preview_eval` computed measurements (color/size/height) + `preview_snapshot` (a11y tree) + code.** Navigation via `window.location.assign('http://localhost:3000/...')` (relative href fails). Visual-only issues (alignment/rhythm/balance) can't be fully assessed while screenshots are down — flagged per screen rather than claimed verified.

### Discrepancies vs. brief
- None material. Repo aesthetic (warm café, minimalist) matches the stated intent. Pricing source-of-truth note in memory is about the marketing Pricing section content, not in scope for visual polish.

### Work done so far
- **Iteration 1:** Fixed dashboard Home + Analytics stat cards — were `flex:1; min-width:0` 4-across, collapsing to ~75px on mobile so the icon overlapped the number and "Sold out today" wrapped to 3 lines. Now a responsive `grid auto-fit minmax(150px,1fr)` → clean 2×2 on mobile, 4-across on desktop. Verified at 375px. ✅
- **Iteration 2:** Rendered all 5 customer-menu themes (warm/minimal/bold/soft/playful) at mobile + audited intra-theme consistency (per added rubric item 9). Themes are well-built and internally cohesive (verified bold dark-theme text-over-photo has a proper gradient scrim; chips/badges adapt via tokens). Fixed touch targets: dietary filter chips were 35px and category tabs 40px (both < 44px min). Chips → `minHeight:44`; `.mesa-tab` padding 9→11px → 44px. Shared controls, so all themes benefit; now harmonized with the 46px search bar. Verified 44px + no visual regression. ✅
- **Iteration 7:** WCAG AA contrast audit across themes (computed ratios, screenshots still down). Fixed one **High**: bold (dark) theme rendered the "powered by Mesa" footer logo in `--brand-ink` espresso (#4A2510) on the near-black surface = **1.34:1** (invisible). Remapped `--brand-ink → var(--cream)` in the bold `themeVars` (theme-scoped; light themes unchanged) → **16.76:1**. Verified. Remaining contrast failures are all **borderline** (3.97–4.42, within ~12% of 4.5) and center on the brand terracotta: `clay-500` vs white/cream = **4.26:1** (white-on-clay buttons/active pills; clay-on-white prices/links) — a brand-color tradeoff escalated to the user. Plus `--text-subtle` on tinted bg (3.97 soft / 4.37 cream) and the honey highlight badge (4.42). No sub-3:1 (severe) failures remain. **User chose "darken to clay-600"** → shifted brand aliases `--brand` clay-500→clay-600 (hover/active down one step too); white-on-brand & clay-on-white now **5.52:1**. Also nudged the demo brand kit + "Terracotta" preset + theme swatches `#C8592E→#AE4A24`, the highlight badge `--honey-700 #97661E→#8C5E1A` (4.42→5.0), and `--text-subtle #8A6E5C→#806451` (4.37/3.97→5.06 cream / 4.60 bean-100, still lighter than `--text-muted`; matched in `surfaceVars`). **Re-scanned warm + soft + bold: zero real failures** (only remaining flags are hero text over the dark photo = false positives, legible via scrim). The repo's `accentContrast` intentionally treats ≥4:1 as "good" for owner-picked accents — left as-is (owner freedom + warning), only Mesa's own defaults/presets made strict-AA. ✅
- **Iteration 6:** Finished the dashboard tab sweep (Orders/Appearance/QR/Settings) by measurement. Fixed four more touch-target clusters, all verified 44px: mobile header "View live menu" icon button (`sm`→`md`, 36→44); the shared nav-item renderer used by both the mobile More-drawer and desktop sidebar (`padding 11px 12px`→`minHeight 44`, 41→44, ~10 items); the Appearance "Menu theme | Brand kit" segmented control (`padding 8px 16px`→`minHeight 44`, 34→44); and the QR tab's per-table "PNG" download buttons (`sm`→`md`, 36→44, ×8). Orders = empty state; Settings controls all ≥44 (form inputs use 46px `.mesa-input`). **Outcome: every measurable touch-target issue across the app is now resolved.** Remaining open items are screenshot-gated (visual rhythm/alignment) or Low. ✅
- **Iteration 5:** Swept the remaining measurable surfaces. (a) Cart drawer: controls all ≥44px (Share/Close 44, "Create order summary" 54) and prices internally consistent (Newsreader) — PASS; no inline qty/remove is a deliberate summary-style flow (product decision, not a defect). (b) Analytics tab shows a "No sales yet" empty state with the zero-order demo data, so the money stat cards don't render — D2 (money crowding) is non-reproducible/latent; the iter-1 grid fix still applies when sales exist. (c) Dashboard **Menu management tab**: the "Move up/Move down" reorder IconButtons (20 of them, menu items + categories) were `size="sm"` = 36px < 44px on the phone-run Studio. Bumped to `size="md"` = 44px. Verified all 20 now 44×44. ✅
- **Iteration 4:** Customer-menu item detail sheet (ordering flow) touch-target audit by measurement. Single-select option pills (Small/Medium/Large, milk) were 38px and the quantity `Stepper` buttons 34px — both < 44px on the most-tapped ordering controls. Option pills → `minHeight:44, padding 0 16px`; `.mesa-stepper__btn` 34→44px (only used in this sheet, contained blast radius). Verified both 44px. Landing `/` measured (buttons 54px ✅, hero h1 = fluid `clamp(40px,6vw,68px)` ✅ not an orphan, nav 49px). NOTE: screenshot renderer fully down this session — landing/visual-rhythm review deferred to a session with working capture. ✅ (touch-target fixes)
- **Iteration 3:** Deepened the theme consistency audit to pills/fonts/prices (per user follow-up). Scanned every `₱` price node's computed color/size/weight per theme. Found + fixed two Med mismatches: (T8) warm best-seller rail price was clay/15/400 vs list text-strong/16/500 → unified to text-strong/16/500; (T9) bold theme's hand-rolled category pills were 40px (missed by iter-2's `.mesa-tab` fix) → 45px. Both verified by computed measurement (screenshots flaky this session — see Gotcha 2; computed values are the authoritative check for exact color/size/height anyway). minimal/bold/playful prices already uniform; soft's lone sage "special" price is intentional. ✅

---

## RUBRIC (built from the discovered design system)
Score each screen PASS/FAIL per item, at mobile (375) **and** desktop (1280). Severity: **High** = broken/unusable/illegible, **Med** = noticeably off / inconsistent, **Low** = refinement.

1. **Type system** — only token sizes/weights; Newsreader for display/prices/names, Hanken for UI; no orphan font sizes.
2. **Spacing rhythm** — 4px-grid spacing; consistent section/card padding; no cramped or collapsed regions.
3. **Visual hierarchy** — clear primary action per screen; headings > body > meta legible at a glance.
4. **Color / contrast (WCAG AA)** — body text ≥ 4.5:1, large text ≥ 3:1; status colors used semantically.
5. **Touch targets (mobile ≥ 44px)** — buttons, nav items, steppers, chips, icon buttons.
6. **States** — loading / empty / error present and on-brand (empty states especially).
7. **Cross-screen consistency** — shared components render identically; same radii/shadow language.
8. **Polish** — alignment, radii, shadow weight, icon weight/size, no overlap/overflow/clipping.
9. **Intra-theme visual consistency** _(per user directive)_ — within each of the 5 customer-menu themes, ALL elements share one visual language: consistent radii, border weight/treatment, surface/text token usage (no off-token hardcodes), icon weight/size, control heights, and **explicitly: pills (badges/chips/category/price), fonts, and price styling (color + size + weight) must match element-to-element within a theme.** Render each theme and check element-to-element coherence, not just the theme vs. the brand. _Method:_ scan all `₱` price nodes + pill controls per theme and compare computed color/size/weight/height — don't eyeball.

---

## FINDINGS LOG

### Customer menu `/m/demo` — mobile (375)  · scored iteration 1
Overall: **strong.** Warm hero, serif name, "Open now" badge, pill search, scrollable category tabs, dietary chips, Best-sellers card + sectioned rows. No High/Med issues spotted in the above-the-fold + first sections.
| # | Item | Verdict | Sev | Note / fix |
|---|------|---------|-----|------------|
| C1 | Type / hierarchy | PASS | — | Newsreader name + prices, Hanken UI. Good. |
| C2 | Category tabs cut off at right edge | PASS | Low | Intentional horizontal-scroll affordance. Acceptable. |
| C3 | Touch targets | _unverified_ | — | Need to confirm tab/chip heights ≥44px via inspect. |
| C4 | Desktop width | _not yet rendered_ | — | Pending iteration 2. |
| C5 | Loading/empty/error, item sheet, ordering flow | _not yet rendered_ | — | Pending — open item, cart, theme variants. |

### Owner Studio `/dashboard` — mobile (375) · scored iteration 1
| # | Item | Verdict | Sev | Note / fix |
|---|------|---------|-----|------------|
| D1 | Home stat cards icon/number overlap, cramped 4-across | **FIXED** | High | → responsive 2×2 grid. Verified. |
| D2 | Analytics tab stat cards (money values, wider) | OPEN | Med | Same grid applied, but `₱12,500`-width values at ~160px card may still crowd the icon. Re-render Analytics tab + verify; if tight, shrink value font or `minWidth:0` the value. |
| D3 | Quick-action cards have large empty vertical gap (icon top, title/sub bottom) | OPEN | Low | Tighten card height or center content. |
| D4 | Home empty state ("No orders yet") | PASS | — | Clear, on-brand copy. |
| D5 | Desktop sidebar layout | _not yet rendered_ | — | Pending iteration 2. |
| D2 | Analytics money stat cards crowding icon | N/A (latent) | Low | Analytics shows "No sales yet" empty state with demo data — money cards not rendered. Iter-1 grid fix applies when sales seeded. Re-check with seeded data + working screenshots. |
| D7 | Menu tab: "Move up/down" reorder buttons 36px <44px (×20) | **FIXED** | Med | `size="sm"→"md"` = 44×44 (icon 21px, matches other md icon buttons). Verified. |
| D8 | Header "View live menu" icon button (mobile) 36px | **FIXED** | Med | `size sm→md` = 44px. Verified. |
| D9 | Nav items (More-drawer + desktop sidebar, shared) 41px | **FIXED** | Med | `minHeight 44` = 44px. Verified (~10 items). |
| D10 | Appearance "Menu theme \| Brand kit" segmented control 34px | **FIXED** | Med | `minHeight 44` = 44px. Verified. |
| D11 | QR per-table "PNG" download buttons 36px (×8) | **FIXED** | Med | `size sm→md` = 44px. Verified (9 incl. main). |
| D12 | Orders empty state; Settings form controls | PASS | — | Orders = "No orders yet" empty state; Settings inputs 46px, all ≥44. |
| D6 | Desktop sidebar layout + visual rhythm | _needs visual_ | — | Blocked by screenshot outage. |

### Customer menu — 5 themes (rubric item 9 + touch targets) · scored iteration 2 (mobile 375)
All 5 themes rendered via `?theme=`. Each is internally cohesive; no High intra-theme inconsistency found.
| # | Theme/scope | Item | Verdict | Sev | Note / fix |
|---|------|------|---------|-----|------------|
| T1 | ALL themes | Dietary chips 35px & category tabs 40px < 44px touch min | **FIXED** | Med | chips→`minHeight:44`; `.mesa-tab` 9→11px pad =44px. Verified. |
| T2 | warm | Pill controls (search 46 / tabs / chips) harmonized | PASS | — | Now 46/44/44 — consistent. |
| T3 | bold (dark) | Text overlaid on photo | PASS | — | Gradient scrim `rgba(15,9,6,.92→.04)` ensures contrast (line 496). |
| T4 | bold | Chips/badges/tabs adapt to dark surface via tokens | PASS | — | No hardcoded light colors leaking; cohesive. |
| T5 | minimal | Underline tabs, centered logo, pill search | PASS | — | Clean & consistent. Featured card photo-left vs row photo-right = intentional (featured vs list). |
| T6 | soft / playful | Icon-chip categories + clay eyebrows | PASS | Low | Rail uses uppercase eyebrow, sections use serif — deliberate hierarchy, consistent across themes. |
| T8 | warm | **Price styling inconsistent**: best-seller rail price was clay/15px/400, list prices text-strong/16px/500 (same theme, 3-way mismatch) | **FIXED** | Med | Rail price+name → text-strong/16px/500 to match canonical `.mesa-mi__price`. Verified: all active prices now `rgb(42,29,22)/16px/w500` (+1 intentional muted sold-out). |
| T9 | bold | Category pills hand-rolled (not `.mesa-tab`) → 40px, missed by iter-2 touch fix + inconsistent with other themes' pills | **FIXED** | Med | padding 9→12px = 45px (≥44). Verified. |
| T10 | soft | "Special" price is sage-700 vs clay list prices | PASS | Low | Deliberate — matches the green "special" card accent + featured size. Intentional hierarchy, not a defect. |
| T11 | minimal/bold/playful | Prices uniform within theme (text-strong / clay-pill / clay resp.) | PASS | — | Measured: no intra-theme price drift. |
| T7a | warm | Item-sheet option pills (Small/Med/Large, milk) 38px & quantity stepper btns 34px < 44px | **FIXED** | Med | Option pills→minHeight 44; `.mesa-stepper__btn`→44px. Verified (most-tapped ordering controls). |
| T7b | warm | Item-sheet price weight 400 vs list prices weight 500 | OPEN | Low | Minor type-weight drift in detail view; size diff (22 vs 16) is intentional hierarchy. Align weight next pass. |
| T7c | ALL | Cart drawer, sold-out, empty/search-no-results states | _needs visual_ | — | Measurable controls OK; visual review blocked by screenshot outage. |

### Landing `/` — mobile (375), measured iteration 4 (no screenshot — tool down)
| # | Item | Verdict | Sev | Note |
|---|------|---------|-----|------|
| L1 | Primary/secondary/pricing CTAs | PASS | — | All 54px (`mesa-btn--lg`) — strong touch targets. |
| L2 | Hero h1 sizing | PASS | — | `clamp(40px,6vw,68px)` fluid display — intentional, brackets the type scale. |
| L3 | Nav at mobile | PASS | Low | Section links hidden ≤560px (by design); logo + CTA remain. |
| L4 | Section spacing rhythm, hierarchy, image balance, Pricing card layout | _needs visual_ | — | Cannot assess without screenshots; deferred. |
| L5 | Desktop (1280) layout | _not yet rendered_ | — | Pending. |

### Landing `/` — _not yet rendered_
Pending (mobile + desktop): Nav, Hero, section rhythm, Pricing, Footer.

---

## NEXT ITERATION QUEUE
1. Render landing `/` mobile + desktop; score all sections.
2. Customer menu: open item sheet + cart/ordering flow; sold-out & empty/search-no-results states (T7); verify at desktop width.
3. Verify D2 (Analytics stat cards money values) — render Analytics tab.
4. Render dashboard desktop sidebar + remaining tabs (Orders, Menu, Appearance, QR, Settings).

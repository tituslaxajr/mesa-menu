# Mesa — UI Polish Review

_Living document for the UI polish loop. Re-render and re-score; never mark a screen done from memory._

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
- **Gotcha 2 (screenshot hangs):** full-page screenshots can time out while the page settles. Inject an animation-kill style first and retry:
  `*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;}` then re-screenshot. Navigation via `window.location.assign('http://localhost:3000/...')` (relative href fails).

### Discrepancies vs. brief
- None material. Repo aesthetic (warm café, minimalist) matches the stated intent. Pricing source-of-truth note in memory is about the marketing Pricing section content, not in scope for visual polish.

### Work done so far
- **Iteration 1:** Fixed dashboard Home + Analytics stat cards — were `flex:1; min-width:0` 4-across, collapsing to ~75px on mobile so the icon overlapped the number and "Sold out today" wrapped to 3 lines. Now a responsive `grid auto-fit minmax(150px,1fr)` → clean 2×2 on mobile, 4-across on desktop. Verified at 375px. ✅

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
| D6 | Other tabs (Orders, Menu, Appearance, QR, Settings) | _not yet rendered_ | — | Pending. |

### Landing `/` — _not yet rendered_
Pending iteration 2 (mobile + desktop): Nav, Hero, section rhythm, Pricing, Footer.

---

## NEXT ITERATION QUEUE
1. Verify D2 (Analytics stat cards) — render Analytics tab.
2. Render landing `/` mobile + desktop; score all sections.
3. Render customer menu desktop + item sheet/cart/theme variants; verify touch targets (C3).
4. Render dashboard desktop sidebar + remaining tabs.

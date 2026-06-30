# Mesa

A SaaS **QR menu & ordering** web app for cafés in the Philippines. Diners scan a
table QR, browse a live menu on their phone, and either build an order to **show
at the counter** or (later) send it to the kitchen — no app download. Owners get
a Studio to manage the menu, branding, promos, QR codes, and orders.

> **Status:** front-end prototype in beta with 2–3 cafés (San Fernando,
> Pampanga). Backend is in development — all server-backed data currently runs
> through a localStorage stand-in (see [Backend integration](#backend-integration)).

## Getting started

```bash
npm install
npm run dev      # dev server (Next 16, Turbopack) → http://localhost:3000
npm run build    # production build  (stop the dev server first — shared .next)
npx tsc --noEmit # type-check
npx eslint "src/**/*.{ts,tsx}"
```

> Next 16 does **not** run ESLint during `next build`; run it separately.

## Routes

| Route | What |
|---|---|
| `/` | Marketing landing page |
| `/m/[slug]` | **Customer menu** — the QR-scanned experience (per café). `?t=<n>` prefills the table number; `?theme=<key>` previews a theme. |
| `/dashboard` | **Owner Studio** — menu management, appearance, QR, promos, analytics, orders, settings. |

Sample cafés: `/m/demo` (Kape Kalye, counter ordering) and `/m/demo-starter`
(browse-only).

## Stack & conventions

- **Next.js 16** (App Router) + **TypeScript**. **No Tailwind** — styling is
  inline styles + CSS custom properties (design tokens in `src/styles/tokens/`,
  components in `src/styles/components.css`).
- Fonts via `next/font` (Newsreader display + Hanken Grotesk body; extra brand
  fonts for the Studio brand kit).
- Design system in `src/components/ds/` (Button, Input, Select, Switch, Badge,
  Card, MenuItem, …). App features in `src/components/app/`.

## Architecture

**Customer** — `src/components/app/MenuBrowser.tsx` renders one of **5 themes**
(`menu-themes.tsx`: warm / minimal / bold / soft / playful) and layers the shared
interaction model on top: search, dietary filter, item sheet with options
(size/milk/add-ons), cart, and the order/summary flow. It reads the café's saved
Studio edits so owner changes show up live.

**Owner** — `src/components/app/DashboardShell.tsx` is the Studio (Home / Orders /
Menu / Categories / Appearance / QR / Promos / Analytics / Subscription /
Settings), mobile-first (hamburger drawer + bottom tab bar under 860px).

### Order modes & phases

`Cafe.orderMode` (`browse` | `counter` | `kitchen`) is the per-café switch, folded
through `resolveOrderMode()` (`src/lib/data.ts`) with the plan + a pause toggle:

- **Phase 1 (live):** `browse` (menu only) and `counter` (guest builds an order →
  summary to show staff, who key it into their own POS). `counter` is the default.
- **Phase 2 (built, gated):** `kitchen` — orders flow to a live Orders board with
  status the guest can watch. Held behind `PHASE2_ORDERING = false` in
  `src/lib/data.ts`. **Flip to `true` to enable** — but its live cross-device
  tracking needs the backend first (the store is per-browser; see below).
- **Phase 3 (future):** Mesa as the POS itself (payments / receipts).

### Data model notes

- `MenuItem.tags` is `MenuTag[]` (`{id,label,emoji?}`) — self-contained so custom
  tags (e.g. Keto) render everywhere. `normalizeTags()` migrates legacy `string[]`
  tags on read.
- Plans (`PLANS`): Starter ₱299 (browse-only), Brew ₱499 (most popular), Roast
  ₱999. Pricing is the source of truth here.

## Backend integration

There is **no backend yet** — server data is faked behind small, clearly-marked
seams so swapping in a real API is mechanical. Grep `// BACKEND SEAM`. The shapes
(`Cafe`, `MenuItem`, `Order`, …) should stay stable across the swap.

| File | Today (stand-in) | Swap in |
|---|---|---|
| `src/lib/data.ts` | `getCafe` / `getMenu` / `getCategories` / `getPlan` return mock data | café/menu/plan lookups by slug (read API) |
| `src/lib/studio-store.ts` | owner edits in slug-scoped localStorage (`mesa.studio.<slug>.<part>`; parts: items/cafe/brand/theme/promos/categories) | persist edits via API; keep the same key set / merge semantics |
| `src/lib/orders-store.ts` | orders in localStorage (`mesa.orders.<slug>`, `mesa.myorders.<slug>`) | orders API + **websockets/polling** — required for Phase 2 cross-device tracking (guest phone ↔ owner board); same `Order` shape & status lifecycle |
| `src/lib/useLocalStore.ts` | generic localStorage state hook | API-backed mutations + server state |
| `src/app/dashboard/page.tsx` | demo café stands in for the logged-in owner | **auth** → resolve the owner's café |

**Why counter ships before kitchen:** counter mode needs no cross-device sync (the
guest shows their own screen), so it works fully client-side today. Kitchen
(Phase 2) needs the orders backend to sync across devices.

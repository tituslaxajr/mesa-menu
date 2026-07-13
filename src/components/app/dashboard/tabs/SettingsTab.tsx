"use client";

import { useState } from "react";
import {
  Check,
} from "lucide-react";
import { Button, Input, Switch, Badge, Card } from "@/components/ds";
import { PLANS, type Cafe, type OrderMode, PHASE2_ORDERING } from "@/lib/data";
import { hoursForCafe, hoursDisplay } from "@/lib/day-phase";
import { PageWrap, SectionTitle } from "../shared";

const toTimeInput = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const fromTimeInput = (v: string) => { const [h, m] = v.split(":").map(Number); return (h || 0) * 60 + (m || 0); };

/* ════ SETTINGS ════════════════════════════════════════════════════ */
const MODE_OPTIONS: { id: OrderMode; label: string; desc: string; comingSoon?: boolean }[] = [
  { id: "browse", label: "Browse only", desc: "Guests view the menu — no ordering. A clean digital replacement for a printed menu." },
  { id: "counter", label: "Order at counter", desc: "Guests build an order and get a summary to show your staff, who key it into your POS — no second system. Recommended for the beta." },
  { id: "kitchen", label: "Order to kitchen", desc: "Orders flow live to a Mesa order board with status the guest can watch — arriving in a later phase.", comingSoon: true },
];

export function SettingsTab({ cafe, setCafe, toast }: { cafe: Cafe; setCafe: (f: (c: Cafe) => Cafe) => void; toast: (m: string) => void }) {
  const set = <K extends keyof Cafe>(k: K, v: Cafe[K]) => setCafe((c) => ({ ...c, [k]: v }));
  // Inputs read the raw stored values (falling back to parsed/default hours)
  // so a transiently invalid pair mid-edit doesn't snap the fields back; the
  // phase engine itself guards against close <= open.
  const fallbackHours = hoursForCafe(cafe);
  const hours = { openMin: cafe.openMin ?? fallbackHours.openMin, closeMin: cafe.closeMin ?? fallbackHours.closeMin };
  // Setting a time also recomposes the diner-facing display string, so the
  // public menu shows the same hours the phase engine runs on.
  const setHours = (openMin: number, closeMin: number) =>
    setCafe((c) => ({ ...c, openMin, closeMin, hours: hoursDisplay({ openMin, closeMin }) }));
  const [display, setDisplay] = useState({ prices: true, photos: true });
  const accepting = cafe.acceptingOrders !== false;
  let currentMode: OrderMode = cafe.orderMode ?? "counter";
  if (currentMode === "kitchen" && !PHASE2_ORDERING) currentMode = "counter";
  // Phase 2 recording needs an ordering plan (Brew/Roast).
  const canRecord = !!PLANS.find((p) => p.id === cafe.plan)?.ordering;
  return (
    <PageWrap max={620}>
      <Card variant="flat" padded>
        <SectionTitle>Café profile</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Café name" value={cafe.name} onChange={(e) => set("name", e.target.value)} />
          <Input label="Tagline" value={cafe.tagline} onChange={(e) => set("tagline", e.target.value)} />
          <Input label="Welcome message" as="textarea" value={cafe.intro} onChange={(e) => set("intro", e.target.value)} hint="Shown under your café name on the menu." />
        </div>
      </Card>
      <Card variant="flat" padded style={{ marginTop: 18 }}>
        <SectionTitle>Opening hours</SectionTitle>
        <div style={{ display: "flex", gap: 12 }}>
          <Input label="Opens" type="time" value={toTimeInput(hours.openMin)} onChange={(e) => setHours(fromTimeInput(e.target.value), hours.closeMin)} />
          <Input label="Closes" type="time" value={toTimeInput(hours.closeMin)} onChange={(e) => setHours(hours.openMin, fromTimeInput(e.target.value))} />
        </div>
        {hours.closeMin <= hours.openMin && (
          <p style={{ fontSize: 12.5, color: "var(--soldout)", marginTop: 8 }}>Closing time should be after opening time.</p>
        )}
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 10 }}>
          Shown on your menu so guests know when you&rsquo;re open.
        </p>
      </Card>
      <Card variant="flat" padded style={{ marginTop: 18 }}>
        <SectionTitle>Guest ordering</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MODE_OPTIONS.map((opt) => {
            const selected = currentMode === opt.id;
            const locked = !!opt.comingSoon && !PHASE2_ORDERING;
            return (
              <button
                key={opt.id}
                disabled={locked}
                onClick={() => { set("orderMode", opt.id); toast(`Switched to “${opt.label}”`); }}
                style={{ display: "flex", gap: 12, textAlign: "left", width: "100%", padding: "13px 14px", borderRadius: "var(--radius-md)", cursor: locked ? "not-allowed" : "pointer", background: selected ? "var(--brand-soft)" : "var(--surface-card)", border: selected ? "2px solid var(--brand)" : "1px solid var(--border-soft)", opacity: locked ? 0.55 : 1, fontFamily: "var(--font-sans)" }}
              >
                <span style={{ marginTop: 2, width: 18, height: 18, borderRadius: 999, flex: "none", border: selected ? "5px solid var(--brand)" : "2px solid var(--bean-300)" }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 14.5 }}>{opt.label}</span>
                    {locked && <Badge variant="neutral">Phase 2 · soon</Badge>}
                  </span>
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>{opt.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        {currentMode !== "browse" && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
            <Switch checked={accepting} tone="brand" onChange={(v) => { set("acceptingOrders", v); toast(v ? "Ordering resumed" : "Ordering paused"); }} label="Currently accepting orders" />
            {!accepting && <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 8 }}>Paused — guests can browse but not order right now.</p>}
          </div>
        )}
        {currentMode === "counter" && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Switch
                checked={!!cafe.recordSales && canRecord}
                tone="brand"
                onChange={(v) => {
                  if (!canRecord) { toast("Recording sales needs an ordering plan (Brew or Roast)"); return; }
                  set("recordSales", v);
                  toast(v ? "Recording sales — confirm guest codes in Today" : "Back to summary-only counter orders");
                }}
                label="Record sales with Mesa"
              />
              {!canRecord && <Badge variant="neutral">Brew+</Badge>}
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 8 }}>
              Guests send their order to the counter with a short code; your staff taps the matching code in <strong>Today</strong> to confirm it — only confirmed orders count in your sales and Day Close. Off: guests just show a summary and nothing is recorded.
            </p>
          </div>
        )}
      </Card>
      <Card variant="flat" padded style={{ marginTop: 18 }}>
        <SectionTitle>Menu display</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Switch checked={display.prices} tone="brand" onChange={(v) => setDisplay((d) => ({ ...d, prices: v }))} label="Show prices to guests" />
          <Switch checked={display.photos} tone="brand" onChange={(v) => setDisplay((d) => ({ ...d, photos: v }))} label="Show photos" />
        </div>
      </Card>
      <div style={{ marginTop: 20 }}><Button variant="primary" onClick={() => toast("Settings saved")}><Check /> Save changes</Button></div>
    </PageWrap>
  );
}

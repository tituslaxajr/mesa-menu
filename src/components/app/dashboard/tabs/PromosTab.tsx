"use client";

import { useState } from "react";
import {
  Tag,
  Plus,
  Pencil,
  Clock,
  Trash2,
  BadgePercent,
} from "lucide-react";
import { Button, IconButton, Input, Select, Switch, Badge, Card } from "@/components/ds";
import { type MenuItem, type Promo, type PromoDiscount, type PromoSchedule } from "@/lib/data";
import { isPromoLive } from "@/lib/promo-pricing";
import { minToLabel } from "@/lib/day-phase";
import { PageWrap, SectionTitle } from "../shared";

/* ════ PROMOS ══════════════════════════════════════════════════════ */
const PROMO_TONE_BG: Record<string, string> = { highlight: "var(--highlight-soft)", brand: "var(--brand-soft)", neutral: "var(--surface-muted)" };
const PROMO_TONE_FG: Record<string, string> = { highlight: "var(--honey-700)", brand: "var(--brand-active)", neutral: "var(--text-muted)" };

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const DOW_LONG = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 30-minute steps for the schedule time pickers ("" = not set). */
const TIME_OPTIONS = [
  { value: "", label: "—" },
  ...Array.from({ length: 48 }, (_, i) => ({ value: String(i * 30), label: minToLabel(i * 30) })),
];

const EMPTY_DISCOUNT: PromoDiscount = { type: "none", value: 0, appliesTo: "all", targetCategories: [], targetItems: [] };

/** One-line human summary: "15% off · Pastries · Daily 2:00 PM–5:00 PM". */
function promoSummary(p: Promo): string | null {
  const parts: string[] = [];
  const d = p.discount;
  if (d && d.type !== "none" && d.value > 0) {
    parts.push(d.type === "percent" ? `${d.value}% off` : `₱${d.value} off`);
    if (d.appliesTo === "categories") parts.push(d.targetCategories.join(", ") || "no categories yet");
    else if (d.appliesTo === "items") parts.push(d.targetItems.join(", ") || "no items yet");
    else parts.push("whole menu");
  }
  const s = p.schedule;
  if (s) {
    if (s.daysOfWeek?.length && s.daysOfWeek.length < 7) parts.push(s.daysOfWeek.map((i) => DOW_LONG[i]).join(" "));
    if (typeof s.startMin === "number" || typeof s.endMin === "number") {
      const from = typeof s.startMin === "number" ? minToLabel(s.startMin) : "open";
      const to = typeof s.endMin === "number" ? minToLabel(s.endMin) : "close";
      parts.push(`${from}–${to}`);
    }
    if (s.startDate || s.endDate) parts.push(`${s.startDate ?? "…"} → ${s.endDate ?? "…"}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

/** Small pill-toggle chip row (same pattern as the menu's diet filter chips). */
function ChipRow({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  if (options.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--text-subtle)", margin: 0 }}>Nothing on the menu yet — add items first.</p>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            aria-pressed={on}
            style={{ display: "inline-flex", alignItems: "center", minHeight: 36, border: "1.5px solid", borderColor: on ? "var(--brand)" : "var(--border-default)", background: on ? "var(--brand)" : "var(--surface-card)", color: on ? "var(--brand-on)" : "var(--text-strong)", borderRadius: 999, padding: "0 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 8 }}>{children}</div>;
}

function PromoEditor({ value, categories, items, onSave, onCancel }: { value: Promo; categories: string[]; items: MenuItem[]; onSave: (p: Promo) => void; onCancel: () => void }) {
  const [d, setD] = useState<Promo>(value);
  const set = <K extends keyof Promo>(k: K, v: Promo[K]) => setD((p) => ({ ...p, [k]: v }));
  const disc = d.discount ?? EMPTY_DISCOUNT;
  const setDisc = (patch: Partial<PromoDiscount>) => set("discount", { ...disc, ...patch });
  const sched = d.schedule ?? {};
  const setSched = (patch: Partial<PromoSchedule>) => {
    const next = { ...sched, ...patch };
    const empty = !next.daysOfWeek?.length && next.startMin == null && next.endMin == null && !next.startDate && !next.endDate;
    set("schedule", empty ? undefined : next);
  };
  const toggleTarget = (key: "targetCategories" | "targetItems", v: string) => {
    const cur = disc[key];
    setDisc({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as Partial<PromoDiscount>);
  };
  const toggleDow = (i: number) => {
    const cur = sched.daysOfWeek ?? [];
    setSched({ daysOfWeek: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort() });
  };
  const hasDiscount = disc.type !== "none";
  const valueInvalid = hasDiscount && (disc.value <= 0 || (disc.type === "percent" && disc.value > 100));
  const targetsMissing = hasDiscount && ((disc.appliesTo === "categories" && disc.targetCategories.length === 0) || (disc.appliesTo === "items" && disc.targetItems.length === 0));
  const windowInvalid = typeof sched.startMin === "number" && typeof sched.endMin === "number" && sched.endMin <= sched.startMin;
  const cannotSave = !d.title.trim() || valueInvalid || targetsMissing || windowInvalid;

  const save = () => {
    // Persist a clean shape: no discount object when type is "none".
    const promo: Promo = {
      ...d,
      title: d.title.trim(),
      desc: d.desc.trim(),
      period: d.period.trim(),
      discount: hasDiscount ? disc : undefined,
    };
    onSave(promo);
  };

  return (
    <Card variant="flat" padded style={{ marginBottom: 14, border: "1.5px solid var(--brand)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Input label="Title" value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Merienda hour" />
        <Input label="Description" value={d.desc} onChange={(e) => set("desc", e.target.value)} placeholder="₱20 off any pastry with a hot drink." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Banner note" value={d.period} onChange={(e) => set("period", e.target.value)} placeholder="Daily · 2:00–5:00 PM" />
          <Select label="Colour" value={d.tone} onChange={(e) => set("tone", e.target.value as Promo["tone"])} options={[{ value: "highlight", label: "Highlight" }, { value: "brand", label: "Brand" }, { value: "neutral", label: "Neutral" }]} />
        </div>

        {/* ── The deal — what actually comes off the price ─────────── */}
        <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 14, marginTop: 2 }}>
          <FieldLabel>The deal</FieldLabel>
          <div style={{ display: "grid", gridTemplateColumns: hasDiscount ? "1fr 1fr" : "1fr", gap: 12 }}>
            <Select
              label="Discount"
              value={disc.type}
              onChange={(e) => setDisc({ type: e.target.value as PromoDiscount["type"] })}
              options={[{ value: "none", label: "Banner only — no discount" }, { value: "percent", label: "% off" }, { value: "fixed", label: "₱ off" }]}
            />
            {hasDiscount && (
              <Input
                label={disc.type === "percent" ? "Percent (1–100)" : "Pesos off"}
                value={disc.value ? String(disc.value) : ""}
                onChange={(e) => setDisc({ value: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                placeholder={disc.type === "percent" ? "15" : "20"}
                inputMode="numeric"
              />
            )}
          </div>
          {hasDiscount && (
            <div style={{ marginTop: 12 }}>
              <Select
                label="Applies to"
                value={disc.appliesTo}
                onChange={(e) => setDisc({ appliesTo: e.target.value as PromoDiscount["appliesTo"] })}
                options={[{ value: "all", label: "Whole menu" }, { value: "categories", label: "Specific categories" }, { value: "items", label: "Specific items" }]}
              />
              {disc.appliesTo === "categories" && (
                <div style={{ marginTop: 10 }}>
                  <ChipRow options={categories.filter((c) => c !== "All")} selected={disc.targetCategories} onToggle={(v) => toggleTarget("targetCategories", v)} />
                </div>
              )}
              {disc.appliesTo === "items" && (
                <div style={{ marginTop: 10 }}>
                  <ChipRow options={items.map((i) => i.name)} selected={disc.targetItems} onToggle={(v) => toggleTarget("targetItems", v)} />
                </div>
              )}
              {targetsMissing && <p style={{ fontSize: 12.5, color: "var(--danger, #b3261e)", marginTop: 8, marginBottom: 0 }}>Pick at least one {disc.appliesTo === "categories" ? "category" : "item"}.</p>}
              {valueInvalid && <p style={{ fontSize: 12.5, color: "var(--danger, #b3261e)", marginTop: 8, marginBottom: 0 }}>{disc.type === "percent" ? "Enter a percent between 1 and 100." : "Enter how many pesos come off."}</p>}
            </div>
          )}
        </div>

        {/* ── Schedule — when it turns itself on (Manila time) ─────── */}
        <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 14 }}>
          <FieldLabel>Schedule (optional — leave blank to control it with the switch)</FieldLabel>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {DOW.map((label, i) => {
              const on = (sched.daysOfWeek ?? []).includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDow(i)}
                  aria-pressed={on}
                  aria-label={DOW_LONG[i]}
                  style={{ width: 36, height: 36, borderRadius: 999, border: "1.5px solid", borderColor: on ? "var(--brand)" : "var(--border-default)", background: on ? "var(--brand)" : "var(--surface-card)", color: on ? "var(--brand-on)" : "var(--text-muted)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Select label="From" value={sched.startMin != null ? String(sched.startMin) : ""} onChange={(e) => setSched({ startMin: e.target.value === "" ? undefined : parseInt(e.target.value, 10) })} options={TIME_OPTIONS} />
            <Select label="Until" value={sched.endMin != null ? String(sched.endMin) : ""} onChange={(e) => setSched({ endMin: e.target.value === "" ? undefined : parseInt(e.target.value, 10) })} options={TIME_OPTIONS} />
          </div>
          {windowInvalid && <p style={{ fontSize: 12.5, color: "var(--danger, #b3261e)", marginTop: 8, marginBottom: 0 }}>&quot;Until&quot; must be after &quot;From&quot;.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <Input label="Starts (date)" type="date" value={sched.startDate ?? ""} onChange={(e) => setSched({ startDate: e.target.value || undefined })} />
            <Input label="Ends (date)" type="date" value={sched.endDate ?? ""} onChange={(e) => setSched({ endDate: e.target.value || undefined })} />
          </div>
        </div>

        <Switch checked={d.active} tone="brand" onChange={(v) => set("active", v)} label="Show on the live menu" />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" block disabled={cannotSave} onClick={save}>Save promo</Button>
      </div>
    </Card>
  );
}

export function PromosTab({ promos, setPromos, categories, items, toast }: { promos: Promo[]; setPromos: (f: (p: Promo[]) => Promo[]) => void; categories: string[]; items: MenuItem[]; toast: (m: string) => void }) {
  const [editing, setEditing] = useState<Promo | null>(null);
  const toggle = (id: string) => setPromos((arr) => arr.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  const blank = (): Promo => ({ id: crypto.randomUUID(), title: "", desc: "", period: "", tone: "highlight", active: true });
  const save = (p: Promo) => {
    setPromos((arr) => (arr.some((x) => x.id === p.id) ? arr.map((x) => (x.id === p.id ? p : x)) : [...arr, p]));
    setEditing(null);
    toast("Promo saved");
  };
  const remove = (id: string) => { setPromos((arr) => arr.filter((x) => x.id !== id)); toast("Promo deleted"); };
  return (
    <PageWrap max={820}>
      <SectionTitle right={!editing ? <Button variant="primary" onClick={() => setEditing(blank())}><Plus /> New promo</Button> : undefined}>Promos</SectionTitle>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: -6, marginBottom: 14 }}>Promos show as a banner on your live menu — and a promo with a deal changes the prices too, automatically, on its schedule.</p>

      {editing && <PromoEditor value={editing} categories={categories} items={items} onSave={save} onCancel={() => setEditing(null)} />}

      {promos.length === 0 && !editing ? (
        <div style={{ textAlign: "center", padding: "30px 12px", color: "var(--text-muted)" }}>
          <Tag size={26} style={{ color: "var(--text-subtle)", marginBottom: 8 }} />
          <div style={{ fontSize: 14 }}>No promos yet. Add one to highlight a special — or run a real discount.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {promos.map((p) => {
            const hasDeal = p.discount && p.discount.type !== "none" && p.discount.value > 0;
            const live = isPromoLive(p);
            const summary = promoSummary(p);
            return (
              <Card key={p.id} variant="flat" padded>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <span style={{ width: 42, height: 42, borderRadius: 11, flex: "none", display: "grid", placeItems: "center", background: PROMO_TONE_BG[p.tone], color: PROMO_TONE_FG[p.tone] }}>
                    {hasDeal ? <BadgePercent size={20} /> : <Tag size={20} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--text-strong)" }}>{p.title}</span>
                      {!p.active ? <Badge variant="neutral">Paused</Badge> : live ? <Badge variant="available" dot>Live now</Badge> : <Badge variant="highlight">Scheduled</Badge>}
                    </div>
                    {p.desc && <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 3 }}>{p.desc}</div>}
                    {summary && <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--honey-700)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}><BadgePercent size={13} /> {summary}</div>}
                    {p.period && <div style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}><Clock size={13} /> {p.period}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "none" }}>
                    <Switch checked={p.active} onChange={() => toggle(p.id)} tone="brand" />
                    <IconButton label="Edit promo" variant="ghost" onClick={() => setEditing(p)}><Pencil /></IconButton>
                    <IconButton label="Delete promo" variant="ghost" onClick={() => remove(p.id)}><Trash2 /></IconButton>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageWrap>
  );
}

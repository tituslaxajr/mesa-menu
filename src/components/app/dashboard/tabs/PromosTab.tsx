"use client";

import { useState } from "react";
import {
  Tag,
  Plus,
  Pencil,
  Clock,
  Trash2,
} from "lucide-react";
import { Button, IconButton, Input, Select, Switch, Badge, Card } from "@/components/ds";
import { type Promo } from "@/lib/data";
import { PageWrap, SectionTitle } from "../shared";

/* ════ PROMOS ══════════════════════════════════════════════════════ */
const PROMO_TONE_BG: Record<string, string> = { highlight: "var(--highlight-soft)", brand: "var(--brand-soft)", neutral: "var(--surface-muted)" };
const PROMO_TONE_FG: Record<string, string> = { highlight: "var(--honey-700)", brand: "var(--brand-active)", neutral: "var(--text-muted)" };

function PromoEditor({ value, onSave, onCancel }: { value: Promo; onSave: (p: Promo) => void; onCancel: () => void }) {
  const [d, setD] = useState<Promo>(value);
  const set = <K extends keyof Promo>(k: K, v: Promo[K]) => setD((p) => ({ ...p, [k]: v }));
  return (
    <Card variant="flat" padded style={{ marginBottom: 14, border: "1.5px solid var(--brand)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Input label="Title" value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Merienda hour" />
        <Input label="Description" value={d.desc} onChange={(e) => set("desc", e.target.value)} placeholder="₱20 off any pastry with a hot drink." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="When" value={d.period} onChange={(e) => set("period", e.target.value)} placeholder="Daily · 2:00–5:00 PM" />
          <Select label="Colour" value={d.tone} onChange={(e) => set("tone", e.target.value as Promo["tone"])} options={[{ value: "highlight", label: "Highlight" }, { value: "brand", label: "Brand" }, { value: "neutral", label: "Neutral" }]} />
        </div>
        <Switch checked={d.active} tone="brand" onChange={(v) => set("active", v)} label="Show on the live menu" />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" block disabled={!d.title.trim()} onClick={() => onSave({ ...d, title: d.title.trim(), desc: d.desc.trim(), period: d.period.trim() })}>Save promo</Button>
      </div>
    </Card>
  );
}

export function PromosTab({ promos, setPromos, toast }: { promos: Promo[]; setPromos: (f: (p: Promo[]) => Promo[]) => void; toast: (m: string) => void }) {
  const [editing, setEditing] = useState<Promo | null>(null);
  const toggle = (id: string) => setPromos((arr) => arr.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  const blank = (): Promo => ({ id: "promo-" + Date.now(), title: "", desc: "", period: "", tone: "highlight", active: true });
  const save = (p: Promo) => {
    setPromos((arr) => (arr.some((x) => x.id === p.id) ? arr.map((x) => (x.id === p.id ? p : x)) : [...arr, p]));
    setEditing(null);
    toast("Promo saved");
  };
  const remove = (id: string) => { setPromos((arr) => arr.filter((x) => x.id !== id)); toast("Promo deleted"); };
  return (
    <PageWrap max={820}>
      <SectionTitle right={!editing ? <Button variant="primary" onClick={() => setEditing(blank())}><Plus /> New promo</Button> : undefined}>Promo banners</SectionTitle>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: -6, marginBottom: 14 }}>Active promos show as a banner at the top of your live menu.</p>

      {editing && <PromoEditor value={editing} onSave={save} onCancel={() => setEditing(null)} />}

      {promos.length === 0 && !editing ? (
        <div style={{ textAlign: "center", padding: "30px 12px", color: "var(--text-muted)" }}>
          <Tag size={26} style={{ color: "var(--text-subtle)", marginBottom: 8 }} />
          <div style={{ fontSize: 14 }}>No promos yet. Add one to highlight a special on your menu.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {promos.map((p) => (
            <Card key={p.id} variant="flat" padded>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <span style={{ width: 42, height: 42, borderRadius: 11, flex: "none", display: "grid", placeItems: "center", background: PROMO_TONE_BG[p.tone], color: PROMO_TONE_FG[p.tone] }}><Tag size={20} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--text-strong)" }}>{p.title}</span>
                    {p.active ? <Badge variant="available" dot>Active</Badge> : <Badge variant="neutral">Paused</Badge>}
                  </div>
                  {p.desc && <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 3 }}>{p.desc}</div>}
                  {p.period && <div style={{ fontSize: 12.5, color: "var(--text-subtle)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}><Clock size={13} /> {p.period}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "none" }}>
                  <Switch checked={p.active} onChange={() => toggle(p.id)} tone="brand" />
                  <IconButton label="Edit promo" variant="ghost" onClick={() => setEditing(p)}><Pencil /></IconButton>
                  <IconButton label="Delete promo" variant="ghost" onClick={() => remove(p.id)}><Trash2 /></IconButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageWrap>
  );
}

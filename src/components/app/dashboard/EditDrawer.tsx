"use client";

import { useState } from "react";
import {
  Plus,
  X,
  Banknote,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { Button, IconButton, Input, Select, Switch } from "@/components/ds";
import { DIET_TAGS, type MenuTag, type OptionGroup } from "@/lib/data";
import { type DraftItem, type UploadImage } from "./shared";

const uid = (p: string) => p + Math.random().toString(36).slice(2, 7);

export function EditDrawer({ item, cats, customTags, onClose, onSave, uploadImage }: { item: DraftItem; cats: string[]; customTags: MenuTag[]; onClose: () => void; onSave: (d: DraftItem) => void; uploadImage: UploadImage }) {
  const [draft, setDraft] = useState<DraftItem>(item);
  const set = <K extends keyof DraftItem>(k: K, v: DraftItem[K]) => setDraft((d) => ({ ...d, [k]: v }));

  // ── Option groups (Size / Milk / Add-ons) ────────────────────────
  const groups = draft.options ?? [];
  const setGroups = (next: OptionGroup[]) => set("options", next.length ? next : undefined);
  const addGroup = () => setGroups([...groups, { id: uid("g_"), label: "", required: true, multi: false, choices: [{ id: uid("c_"), label: "", priceDelta: 0 }] }]);
  const patchGroup = (gid: string, patch: Partial<OptionGroup>) => setGroups(groups.map((g) => (g.id === gid ? { ...g, ...patch } : g)));
  const removeGroup = (gid: string) => setGroups(groups.filter((g) => g.id !== gid));
  const addChoice = (gid: string) => setGroups(groups.map((g) => (g.id === gid ? { ...g, choices: [...g.choices, { id: uid("c_"), label: "", priceDelta: 0 }] } : g)));
  const patchChoice = (gid: string, cid: string, patch: { label?: string; priceDelta?: number }) =>
    setGroups(groups.map((g) => (g.id === gid ? { ...g, choices: g.choices.map((c) => (c.id === cid ? { ...c, ...patch } : c)) } : g)));
  const removeChoice = (gid: string, cid: string) => setGroups(groups.map((g) => (g.id === gid ? { ...g, choices: g.choices.filter((c) => c.id !== cid) } : g)));

  // ── Tags (presets + the café's custom ones, e.g. Keto) ────────────
  const tags = draft.tags ?? [];
  const has = (id: string) => tags.some((t) => t.id === id);
  const setTags = (next: MenuTag[]) => set("tags", next.length ? next : undefined);
  const toggleTag = (tag: MenuTag) => setTags(has(tag.id) ? tags.filter((t) => t.id !== tag.id) : [...tags, tag]);
  // Available chips = presets + tags already used on this café's other items
  // (deduped by lowercased label so the library grows as owners create tags).
  const available: MenuTag[] = [];
  const seen = new Set<string>();
  [...DIET_TAGS, ...customTags, ...tags].forEach((t) => {
    const k = t.label.trim().toLowerCase();
    if (k && !seen.has(k)) { seen.add(k); available.push(t); }
  });
  const [newTag, setNewTag] = useState({ label: "", emoji: "" });
  const addCustomTag = () => {
    const label = newTag.label.trim();
    if (!label) return;
    const existing = available.find((t) => t.label.toLowerCase() === label.toLowerCase());
    const tag: MenuTag = existing ?? { id: uid("t_"), label, emoji: newTag.emoji.trim() || undefined };
    if (!has(tag.id)) setTags([...tags, tag]);
    setNewTag({ label: "", emoji: "" });
  };

  // Drop blank choices/groups; store priceDelta only when non-zero.
  const handleSave = () => {
    const cleaned = (draft.options ?? [])
      .map((g) => ({
        ...g,
        label: g.label.trim(),
        choices: g.choices.filter((c) => c.label.trim()).map((c) => ({ ...c, label: c.label.trim(), priceDelta: c.priceDelta || undefined })),
      }))
      .filter((g) => g.label && g.choices.length);
    onSave({ ...draft, options: cleaned.length ? cleaned : undefined });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} className="mesa-anim-fade" style={{ position: "absolute", inset: 0, background: "rgba(31,20,14,0.4)" }} />
      <div className="mesa-anim-drawer" style={{ position: "relative", width: "min(420px, 100%)", background: "var(--surface-card)", height: "100%", boxShadow: "-8px 0 40px rgba(31,20,14,0.2)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-soft)" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--text-strong)" }}>{item._new ? "Add item" : "Edit item"}</h2>
          <IconButton label="Close" variant="ghost" onClick={onClose}><X /></IconButton>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.img} alt="" style={{ width: 76, height: 76, borderRadius: "var(--radius-md)", objectFit: "cover", background: "var(--surface-sunken)" }} />
            <label>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f, "item").then((src) => set("img", src)).catch(() => {});
                }}
              />
              <span className="mesa-btn mesa-btn--secondary mesa-btn--sm"><ImageIcon /> Replace photo</span>
            </label>
          </div>
          <Input label="Item name" value={draft.name} onChange={(e) => set("name", e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Input label="Price" icon={<Banknote />} value={String(draft.price)} onChange={(e) => set("price", Number(e.target.value.replace(/\D/g, "")) || 0)} />
            <Select label="Category" options={cats.filter((c) => c !== "All")} value={draft.cat} onChange={(e) => set("cat", e.target.value)} />
          </div>
          <Input label="Description" as="textarea" value={draft.desc} onChange={(e) => set("desc", e.target.value)} hint="One appetizing line." />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16, background: "var(--surface-sunken)", borderRadius: "var(--radius-md)" }}>
            <Switch checked={!draft.soldOut} onChange={(v) => set("soldOut", !v)} label="Available today" />
            <div>
              <Switch checked={!!draft.best} tone="brand" onChange={(v) => setDraft((d) => ({ ...d, best: v, badge: v ? "Bestseller" : d.badge === "Bestseller" ? undefined : d.badge }))} label="Feature as bestseller" />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Shows in your menu&rsquo;s Best sellers row with a badge.</p>
            </div>
          </div>

          {/* Tags — dietary, allergens & custom (e.g. Keto) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-strong)" }}>Tags</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {available.map((t) => {
                const on = has(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => toggleTag(t)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "7px 12px", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-sans)", border: on ? "1.5px solid var(--brand)" : "1px solid var(--border-soft)", background: on ? "var(--brand-soft)" : "var(--surface-card)", color: on ? "var(--brand-active)" : "var(--text-body)" }}>
                    {t.emoji && <span aria-hidden>{t.emoji}</span>} {t.label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ width: 64, flex: "none" }}>
                <Input label="Icon" value={newTag.emoji} onChange={(e) => setNewTag((n) => ({ ...n, emoji: [...e.target.value].slice(0, 2).join("") }))} placeholder="🥑" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Input label="Custom tag" value={newTag.label} onChange={(e) => setNewTag((n) => ({ ...n, label: e.target.value.slice(0, 24) }))} placeholder="e.g. Keto" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }} />
              </div>
              <Button variant="secondary" onClick={addCustomTag} disabled={!newTag.label.trim()}><Plus size={15} /> Add</Button>
            </div>
          </div>

          {/* Option groups — Size, Milk, Add-ons, etc. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-strong)" }}>Options &amp; add-ons</span>
              <Button variant="ghost" size="sm" onClick={addGroup}><Plus size={15} /> Add group</Button>
            </div>
            {groups.length === 0 && (
              <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>No options yet. Add a group like “Size” or “Milk” to let guests customize this item.</p>
            )}
            {groups.map((g) => (
              <div key={g.id} style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)", padding: 12, display: "flex", flexDirection: "column", gap: 10, background: "var(--surface-sunken)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ flex: 1, minWidth: 0 }}><Input label="Group name" value={g.label} onChange={(e) => patchGroup(g.id, { label: e.target.value })} placeholder="e.g. Size" /></div>
                  <IconButton label="Remove group" variant="ghost" onClick={() => removeGroup(g.id)}><Trash2 /></IconButton>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <Switch checked={!!g.multi} tone="brand" onChange={(v) => patchGroup(g.id, { multi: v, required: v ? false : g.required })} label="Pick multiple" />
                  {!g.multi && <Switch checked={g.required !== false} tone="brand" onChange={(v) => patchGroup(g.id, { required: v })} label="Required" />}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {g.choices.map((c) => (
                    <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ flex: 1, minWidth: 0 }}><Input value={c.label} onChange={(e) => patchChoice(g.id, c.id, { label: e.target.value })} placeholder="Choice name" /></div>
                      <div style={{ width: 92, flex: "none" }}><Input value={c.priceDelta ? String(c.priceDelta) : ""} onChange={(e) => patchChoice(g.id, c.id, { priceDelta: Number(e.target.value.replace(/\D/g, "")) || 0 })} placeholder="+₱0" inputMode="numeric" /></div>
                      <IconButton label="Remove choice" variant="ghost" onClick={() => removeChoice(g.id, c.id)}><X /></IconButton>
                    </div>
                  ))}
                  <div><Button variant="secondary" size="sm" onClick={() => addChoice(g.id)}><Plus size={14} /> Add choice</Button></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, padding: 20, borderTop: "1px solid var(--border-soft)" }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" block onClick={handleSave}>Save changes</Button>
        </div>
      </div>
    </div>
  );
}

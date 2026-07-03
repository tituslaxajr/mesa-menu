"use client";

import { useState } from "react";
import {
  Utensils,
  Plus,
  X,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button, IconButton, Input, Card } from "@/components/ds";
import { CAT_ICONS, type MenuItem } from "@/lib/data";
import { PageWrap, SectionTitle, CAT_ICON_COMP } from "../shared";

/* ════ CATEGORIES ══════════════════════════════════════════════════ */
export function CategoriesTab({ items, categories, setCategories, onDelete, toast }: { items: MenuItem[]; categories: string[]; setCategories: (f: (c: string[]) => string[]) => void; onDelete: (c: string) => void; toast: (m: string) => void }) {
  const [name, setName] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const cats = categories.filter((c) => c !== "All");
  const add = () => {
    const n = name.trim();
    if (!n || categories.includes(n)) return;
    setCategories((c) => [...c, n]);
    setName("");
    toast(`Added “${n}”`);
  };
  // Reorder a category (sets the section order on the live menu). "All" stays first.
  const moveCat = (cat: string, dir: -1 | 1) => setCategories((arr) => {
    const i = arr.indexOf(cat);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length || arr[j] === "All") return arr;
    const next = arr.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  return (
    <PageWrap max={720}>
      <Card variant="flat" padded style={{ marginBottom: 18 }}>
        <SectionTitle>Add a category</SectionTitle>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Input label="" placeholder="e.g. Cold Brew" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          </div>
          <Button variant="primary" onClick={add}><Plus /> Add</Button>
        </div>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cats.map((c, i) => {
          const n = items.filter((m) => m.cat === c).length;
          const Icon = CAT_ICON_COMP[CAT_ICONS[c]] || Utensils;
          return (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--surface-card)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: "none" }}>
                <IconButton label="Move up" variant="ghost" size="md" disabled={i === 0} onClick={() => moveCat(c, -1)}><ChevronUp size={16} /></IconButton>
                <IconButton label="Move down" variant="ghost" size="md" disabled={i === cats.length - 1} onClick={() => moveCat(c, 1)}><ChevronDown size={16} /></IconButton>
              </div>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--brand-soft)", color: "var(--brand-active)", display: "grid", placeItems: "center" }}><Icon size={18} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16.5, color: "var(--text-strong)" }}>{c}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{n} {n === 1 ? "item" : "items"}</div>
              </div>
              {confirmDel === c ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
                  <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{n ? `Move ${n} to “${cats.find((x) => x !== c)}” & delete?` : "Delete?"}</span>
                  <Button variant="danger" size="sm" onClick={() => { onDelete(c); setConfirmDel(null); toast(n ? `Deleted “${c}” · items moved` : `Deleted “${c}”`); }}>Delete</Button>
                  <IconButton label="Cancel" variant="ghost" onClick={() => setConfirmDel(null)}><X /></IconButton>
                </div>
              ) : (
                <IconButton label="Delete" variant="ghost" onClick={() => {
                  if (n === 0) { onDelete(c); toast(`Deleted “${c}”`); }
                  else if (cats.length <= 1) { toast("Add another category to move these items into first."); }
                  else { setConfirmDel(c); }
                }}><Trash2 /></IconButton>
              )}
            </div>
          );
        })}
      </div>
    </PageWrap>
  );
}

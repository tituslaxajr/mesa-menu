"use client";

import { useState } from "react";
import {
  Utensils,
  Plus,
  Ban,
  Pencil,
  Check,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Search,
  Copy,
} from "lucide-react";
import { Button, IconButton, Input, Switch, Badge, Card } from "@/components/ds";
import { type MenuItem } from "@/lib/data";
import { PageWrap, dpeso } from "../shared";

/* ════ MENU manager ════════════════════════════════════════════════ */
function ManagerRow({ item, index, count, canReorder, onMove, onDuplicate, onToggle, onEdit }: { item: MenuItem; index: number; count: number; canReorder: boolean; onMove: (id: string, dir: -1 | 1) => void; onDuplicate: (id: string) => void; onToggle: (id: string) => void; onEdit: (m: MenuItem) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "var(--surface-card)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)" }}>
      {canReorder && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: "none" }}>
          <IconButton label="Move up" variant="ghost" size="md" disabled={index === 0} onClick={() => onMove(item.id, -1)}><ChevronUp size={16} /></IconButton>
          <IconButton label="Move down" variant="ghost" size="md" disabled={index === count - 1} onClick={() => onMove(item.id, 1)}><ChevronDown size={16} /></IconButton>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.img} alt="" style={{ width: 50, height: 50, borderRadius: "var(--radius-sm)", objectFit: "cover", filter: item.soldOut ? "grayscale(0.9)" : "none", flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16.5, color: "var(--text-strong)" }}>{item.name}</span>
          {item.badge && <Badge variant="highlight" size="sm">{item.badge}</Badge>}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 }}>{item.desc}</div>
      </div>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 16.5, color: "var(--text-strong)", width: 60, textAlign: "right", flex: "none" }}>{dpeso(item.price)}</span>
      <div style={{ width: 142, display: "flex", justifyContent: "flex-end", flex: "none" }}>
        <Switch checked={!item.soldOut} onChange={() => onToggle(item.id)} label={item.soldOut ? "Sold out" : "Available"} />
      </div>
      <IconButton label="Duplicate" variant="ghost" onClick={() => onDuplicate(item.id)}><Copy /></IconButton>
      <IconButton label="Edit" variant="ghost" onClick={() => onEdit(item)}><Pencil /></IconButton>
    </div>
  );
}

export function MenuTab({ items, categories, onMove, onDuplicate, onToggle, onCategorySoldOut, onAdd, onEdit, onLoadSample }: { items: MenuItem[]; categories: string[]; onMove: (id: string, dir: -1 | 1) => void; onDuplicate: (id: string) => void; onToggle: (id: string) => void; onCategorySoldOut: (cat: string, soldOut: boolean) => void; onAdd: () => void; onEdit: (m: MenuItem) => void; onLoadSample: () => void }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const cats = categories.filter((c) => c !== "All");
  const match = (m: MenuItem) => !query || m.name.toLowerCase().includes(query) || m.desc.toLowerCase().includes(query) || (m.tags ?? []).some((t) => t.label.toLowerCase().includes(query));
  const totalMatches = items.filter(match).length;

  // First-run: a brand-new café has no items yet.
  if (items.length === 0) {
    return (
      <PageWrap max={940}>
        <Card variant="flat" padded>
          <div style={{ textAlign: "center", padding: "34px 12px" }}>
            <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--brand-soft)", color: "var(--brand-active)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Utensils size={26} /></span>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "var(--text-strong)" }}>Your menu is empty</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "6px auto 18px", maxWidth: 340 }}>Add your first item — name, price, a photo, and any options or tags. It goes live on your QR menu instantly.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Button variant="primary" onClick={onAdd}><Plus /> Add your first item</Button>
              <Button variant="secondary" onClick={onLoadSample}><Sparkles /> Start with a sample menu</Button>
            </div>
          </div>
        </Card>
      </PageWrap>
    );
  }

  return (
    <PageWrap max={940}>
      <div style={{ marginBottom: 18, maxWidth: 420 }}>
        <Input icon={<Search />} placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search menu items" />
      </div>
      {cats.map((c) => {
        const rows = items.filter((m) => m.cat === c && match(m));
        if (!rows.length) return null;
        return (
          <section key={c} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 500, color: "var(--text-strong)" }}>{c}</h2>
              <Badge variant="neutral">{rows.length}</Badge>
              {!query && (() => {
                const allOut = rows.every((r) => r.soldOut);
                return (
                  <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }} onClick={() => onCategorySoldOut(c, !allOut)}>
                    {allOut ? <><Check size={14} /> Mark all available</> : <><Ban size={14} /> Mark all sold out</>}
                  </Button>
                );
              })()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rows.map((m, i) => <ManagerRow key={m.id} item={m} index={i} count={rows.length} canReorder={!query} onMove={onMove} onDuplicate={onDuplicate} onToggle={onToggle} onEdit={onEdit} />)}
            </div>
          </section>
        );
      })}
      {query && totalMatches === 0 && (
        <div style={{ textAlign: "center", padding: "30px 12px", color: "var(--text-muted)" }}>
          <Search size={26} style={{ color: "var(--text-subtle)", marginBottom: 8 }} />
          <div style={{ fontSize: 14 }}>No items match &ldquo;{q}&rdquo;.</div>
        </div>
      )}
    </PageWrap>
  );
}

"use client";
// Backroom — the calm room for weekly and monthly work. Deliberately not
// time-themed (it's the room with the fluorescent light). Every legacy
// dashboard tab lives here under a friendlier name, with its old name shown
// so nothing feels removed.
import React from "react";
import {
  Printer,
  BarChart3,
  Tag,
  Palette,
  List,
  Gem,
  Settings as SettingsIcon,
  ClipboardList,
  ChevronRight,
  ArrowLeft,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { Button, Card } from "@/components/ds";
import { feedbackMailto } from "@/lib/site";
import { PHASE2_ORDERING } from "@/lib/data";
import { PageWrap, type TabId } from "./shared";

const ROOMS: { id: TabId; title: string; desc: string; was: string; icon: LucideIcon }[] = [
  { id: "qr", title: "Print shop", desc: "Your QR code — download it, print table tents and posters.", was: "QR code", icon: Printer },
  { id: "analytics", title: "The Books", desc: "Sales, best sellers, end-of-day reports and CSV export.", was: "Analytics", icon: BarChart3 },
  { id: "promos", title: "Promos library", desc: "Draft and edit offers. Flicking them on lives in Today.", was: "Promos", icon: Tag },
  { id: "appearance", title: "Look studio", desc: "Theme, logo, colours and fonts — your menu's whole look.", was: "Appearance", icon: Palette },
  { id: "categories", title: "Menu sections", desc: "Rename, reorder and tidy your categories.", was: "Categories", icon: List },
  ...(PHASE2_ORDERING ? [{ id: "orders" as TabId, title: "Orders board", desc: "The live kitchen board.", was: "Orders", icon: ClipboardList }] : []),
  { id: "subscription", title: "Plan", desc: "Your Mesa tier and what it unlocks.", was: "Subscription", icon: Gem },
  { id: "settings", title: "Café settings", desc: "Profile, opening hours, guest ordering.", was: "Settings", icon: SettingsIcon },
];

export function Backroom({
  tab,
  setTab,
  allowed,
  renderTab,
  onFeedback,
}: {
  tab: TabId | null;
  setTab: (t: TabId | null) => void;
  allowed: TabId[];
  renderTab: (t: TabId) => React.ReactNode;
  /** Open the in-app Messages drawer (café ↔ Mesa). */
  onFeedback?: () => void;
}) {
  if (tab) {
    return (
      <div>
        <div style={{ padding: "14px 28px 0" }}>
          <Button variant="ghost" onClick={() => setTab(null)}>
            <ArrowLeft /> Backroom
          </Button>
        </div>
        {renderTab(tab)}
      </div>
    );
  }
  const rooms = ROOMS.filter((r) => allowed.includes(r.id));
  return (
    <PageWrap max={720}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rooms.map((r) => (
          <Card key={r.id} variant="flat" padded>
            <button
              onClick={() => setTab(r.id)}
              style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", background: "transparent", border: 0, cursor: "pointer", textAlign: "left", padding: 0, fontFamily: "var(--font-sans)" }}
            >
              <span style={{ width: 40, height: 40, borderRadius: 12, background: "var(--brand-soft)", color: "var(--brand-active)", display: "grid", placeItems: "center", flex: "none" }}>
                <r.icon size={19} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 16.5, fontWeight: 600, color: "var(--text-strong)" }}>{r.title}</span>
                  <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>was &ldquo;{r.was}&rdquo;</span>
                </span>
                <span style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{r.desc}</span>
              </span>
              <ChevronRight size={18} style={{ color: "var(--text-subtle)", flex: "none" }} />
            </button>
          </Card>
        ))}
        {onFeedback ? (
          <button onClick={onFeedback} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "12px 6px", color: "var(--text-body)", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-sans)", background: "transparent", border: 0, cursor: "pointer", textAlign: "left" }}>
            <MessageSquare size={17} /> Messages
          </button>
        ) : (
          <a href={feedbackMailto} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "12px 6px", color: "var(--text-body)", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-sans)", textDecoration: "none" }}>
            <MessageSquare size={17} /> Send feedback
          </a>
        )}
      </div>
    </PageWrap>
  );
}

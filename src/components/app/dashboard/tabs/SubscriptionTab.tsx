"use client";

import { useState } from "react";
import {
  Check,
  Sparkles,
} from "lucide-react";
import { Button, Badge } from "@/components/ds";
import { PLANS, type PlanId } from "@/lib/data";
import { PageWrap, SectionTitle } from "../shared";

/* ════ SUBSCRIPTION ════════════════════════════════════════════════ */
export function SubscriptionTab({ currentId, onSwitch }: { currentId: string; onSwitch: (id: PlanId) => void | Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const switchTo = async (id: PlanId) => {
    setBusy(id);
    try { await onSwitch(id); } finally { /* page reloads on success */ }
  };
  return (
    <PageWrap max={1000}>
      <SectionTitle>Choose your plan</SectionTitle>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 16px", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--brand-soft)", color: "var(--brand-active)", fontSize: 13.5, fontFamily: "var(--font-sans)" }}>
        <Sparkles size={15} style={{ flex: "none" }} />
        <span><strong>Beta:</strong> switch tiers freely to try each one&rsquo;s features — no payment yet.</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {PLANS.map((p) => {
          const current = p.id === currentId;
          return (
            <div key={p.id} style={{ position: "relative", padding: 22, borderRadius: "var(--radius-lg)", background: "var(--surface-card)", border: current ? "2px solid var(--brand)" : "1px solid var(--border-soft)", boxShadow: current ? "var(--shadow-md)" : "var(--shadow-xs)" }}>
              {current && <div style={{ position: "absolute", top: 16, right: 16 }}><Badge variant="brand">Current</Badge></div>}
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--text-strong)" }}>{p.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2, minHeight: 36 }}>{p.tagline}</div>
              <div style={{ margin: "14px 0 16px", display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--text-strong)" }}>₱{p.monthly}</span>
                <span style={{ fontSize: 13, color: "var(--text-subtle)" }}>/mo</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 18 }}>
                {p.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13.5, color: "var(--text-body)" }}>
                    <Check size={16} style={{ color: "var(--sage-600)", flex: "none", marginTop: 1 }} /> {f}
                  </div>
                ))}
              </div>
              <Button variant={current ? "secondary" : "primary"} block disabled={current || !!busy} onClick={() => switchTo(p.id)}>
                {busy === p.id ? "Switching…" : current ? "Your plan" : `Switch to ${p.name}`}
              </Button>
            </div>
          );
        })}
      </div>
    </PageWrap>
  );
}

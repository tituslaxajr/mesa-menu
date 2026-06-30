"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button, Badge, Card, Switch } from "@/components/ds";
import { PLANS, annualPerMonth, annualTotal, type Plan } from "@/lib/data";

function PlanCard({ plan, annual }: { plan: Plan; annual: boolean }) {
  const popular = !!plan.popular;
  const perMonth = annual ? annualPerMonth(plan.monthly) : plan.monthly;
  return (
    <Card
      variant={popular ? "raised" : "flat"}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: 28,
        border: popular ? "2px solid var(--brand)" : "1px solid var(--border-default)",
        overflow: "visible",
      }}
    >
      {popular && (
        <span style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)" }}>
          <Badge variant="solid">Most popular</Badge>
        </span>
      )}

      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, color: "var(--text-strong)" }}>
        {plan.name}
      </h3>
      <p style={{ fontSize: 14.5, color: "var(--text-muted)", marginTop: 4, minHeight: 40 }}>{plan.tagline}</p>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "12px 0 2px" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 46, fontWeight: 600, color: "var(--text-strong)", letterSpacing: "-0.02em" }}>
          ₱{perMonth}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 16 }}>/mo</span>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-subtle)", minHeight: 20 }}>
        {annual ? `billed annually · ₱${annualTotal(plan.monthly).toLocaleString()}/yr` : "billed monthly"}
      </p>

      <div style={{ margin: "22px 0" }}>
        <Button as="a" href={`/signup?plan=${plan.id}`} variant={popular ? "primary" : "secondary"} size="lg" block>
          {plan.cta}
        </Button>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 13 }}>
        {plan.features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14.5, color: "var(--text-body)" }}>
            <Check size={17} style={{ flex: "none", color: "var(--brand)", marginTop: 1 }} />
            {f}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function Pricing() {
  const [annual, setAnnual] = useState(false);
  return (
    <section id="pricing" style={{ scrollMarginTop: 80, paddingTop: 80, paddingBottom: 80 }}>
      <div className="mesa-container">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 4.5vw, 46px)", fontWeight: 500, color: "var(--text-strong)", letterSpacing: "-0.015em" }}>
            Simple pricing that grows with you
          </h2>
          <p style={{ fontSize: 17, color: "var(--text-muted)", marginTop: 12 }}>
            Start free for 14 days. Pick a plan when you&apos;re ready.
          </p>
        </div>

        {/* Monthly / Annual toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, margin: "28px 0 40px" }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: annual ? "var(--text-muted)" : "var(--text-strong)" }}>
            Monthly
          </span>
          <Switch checked={annual} onChange={setAnnual} tone="brand" label="" id="billing-toggle" />
          <span style={{ fontSize: 15, fontWeight: 600, color: annual ? "var(--text-strong)" : "var(--text-muted)" }}>
            Annual
          </span>
          <Badge variant="available">2 months free</Badge>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 22,
            maxWidth: 1000,
            margin: "0 auto",
            alignItems: "start",
          }}
        >
          {PLANS.map((p) => (
            <PlanCard key={p.id} plan={p} annual={annual} />
          ))}
        </div>

        <p style={{ textAlign: "center", marginTop: 36, color: "var(--text-subtle)", fontSize: 14 }}>
          14-day free trial on every plan · no card required · cancel anytime
        </p>
      </div>
    </section>
  );
}

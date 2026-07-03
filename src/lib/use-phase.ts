"use client";
// Client half of the day-phase engine (day-phase.ts is a pure module so
// server actions can import it; hooks must live in a client-only file).
import { useEffect, useState } from "react";
import { phaseFor, type CafeHours, type DayPhase } from "./day-phase";

/**
 * Live phase for a café, re-evaluated every minute.
 * SSR-safe: first render returns a phase computed from a fixed epoch-0 date on
 * the server and the real clock right after mount (same pattern as useNow —
 * the pre-mount value is only on screen for one frame).
 */
export function usePhase(hours: CafeHours): DayPhase {
  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed real time on mount (intentional SSR-safe pattern, same as useNow)
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  // eslint-disable-next-line react-hooks/purity -- pre-mount fallback only; settles on the real clock one frame after mount
  return phaseFor(new Date(now || Date.now()), hours);
}

"use client";
// Studio persistence layer for the dashboard. Two modes, same [value, setValue]
// API the editor already uses, so DashboardShell's edit handlers don't change:
//   * "local" — localStorage (the public /demo sandbox; never hits the DB)
//   * "db"    — plain state seeded from DB props; saving is done separately by
//                useAutosave calling Server Actions (no localStorage, so other
//                devices/reloads read the DB, not stale browser state).
import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useStudioState<T>(
  mode: "db" | "local",
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);

  // local mode only: hydrate once from localStorage after mount (SSR-safe — the
  // first client render matches the server's `initial`, then we swap).
  const hydrated = useRef(false);
  useEffect(() => {
    if (mode !== "local" || hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore malformed / unavailable storage */
    }
  }, [mode, key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        if (mode === "local") {
          try {
            window.localStorage.setItem(key, JSON.stringify(resolved));
          } catch {
            /* ignore quota / unavailable storage */
          }
        }
        return resolved;
      });
    },
    [mode, key],
  );

  return [value, set];
}

/**
 * Debounced auto-save. When `enabled`, watches `watch` (a stable stringifiable
 * snapshot) and calls `save()` ~700ms after edits settle, reporting status.
 * Skips the initial value so loading DB data doesn't immediately re-save it.
 */
export function useAutosave(
  enabled: boolean,
  watch: unknown,
  save: () => Promise<{ ok: boolean; error?: string }>,
  onStatus: (s: SaveStatus) => void,
): void {
  const first = useRef(true);
  const saveRef = useRef(save);
  saveRef.current = save;
  const snapshot = JSON.stringify(watch);

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    onStatus("saving");
    const t = setTimeout(() => {
      saveRef.current().then(
        (r) => onStatus(r.ok ? "saved" : "error"),
        () => onStatus("error"),
      );
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot is the content key; save/onStatus are refs/stable
  }, [snapshot, enabled]);
}

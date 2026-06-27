"use client";

import { useCallback, useSyncExternalStore } from "react";

// ============================================================================
// useLocalStore — tiny localStorage-backed state hook.
// Used by the owner dashboard to persist menu edits on the client this pass.
// BACKEND SEAM: replace with API-backed mutations + server state once a real
// backend exists. The component API (value, setValue) can stay the same.
//
// Built on useSyncExternalStore so React owns hydration: the server snapshot
// renders `initial`, then the client swaps to the stored value after hydration
// — no effect that calls setState synchronously, and no SSR/client mismatch.
// ============================================================================

// Per-key snapshot cache so getSnapshot returns a stable reference while the
// underlying raw string is unchanged — required by useSyncExternalStore to
// avoid infinite re-render loops (callers pass fresh object/array `initial`s).
const snapshots = new Map<string, { raw: string | null; value: unknown }>();
const listeners = new Map<string, Set<() => void>>();

function readSnapshot<T>(key: string, initial: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return initial;
  }
  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.value as T;
  let value: T = initial;
  if (raw != null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      /* ignore malformed storage — fall back to initial */
    }
  }
  snapshots.set(key, { raw, value });
  return value;
}

function subscribe(key: string, callback: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === key) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    set.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLocalStore<T>(
  key: string,
  initial: T
): [T, (next: T | ((prev: T) => T)) => void] {
  const value = useSyncExternalStore(
    useCallback((cb: () => void) => subscribe(key, cb), [key]),
    () => readSnapshot(key, initial),
    () => initial // server snapshot — matches the first client render
  );

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = readSnapshot(key, initial);
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try {
        const raw = JSON.stringify(resolved);
        window.localStorage.setItem(key, raw);
        snapshots.set(key, { raw, value: resolved });
      } catch {
        /* ignore quota / unavailable storage */
      }
      // storage events don't fire in the same tab — notify local subscribers.
      listeners.get(key)?.forEach((cb) => cb());
    },
    [key, initial]
  );

  return [value, set];
}

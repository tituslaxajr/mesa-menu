"use client";
// Owns ALL dashboard studio state (menu/cafe/brand/theme/promos/categories
// slices, autosaves, orders, alerts, toast, edit handlers). Mounted ONCE for
// the dashboard's lifetime by DashboardShell — remounting it would reset
// useAutosave's first-snapshot skip and re-trigger saves of freshly loaded
// DB data, so the provider must never be unmounted while the dashboard lives.
import React, { createContext, useContext, useRef, useState, useEffect, useMemo } from "react";
import { useLocalStore } from "@/lib/useLocalStore";
import { studioKey } from "@/lib/studio-store";
import { useStudioState, useAutosave, type SaveStatus } from "@/lib/studio-sync";
import { saveMenu, saveBrand, saveCafeProfile, savePromos, setPlan } from "@/lib/studio-actions";
import { uploadCafeImage } from "@/lib/storage";
import { useOrders, type Order, type OrdersApi } from "@/lib/orders-store";
import { getCounterQueue, getRecordedOrders, confirmOrder, type PendingOrder } from "@/lib/order-actions";
import { logActivity } from "@/lib/activity";
import {
  MENU,
  PLANS,
  DEFAULT_BRAND,
  capsFor,
  type BrandCaps,
  type PlanId,
  DIET_TAGS,
  normalizeTags,
  type MenuTag,
  type Cafe,
  type MenuItem,
  type ThemeKey,
  type BrandKit,
  type Promo,
  PHASE2_ORDERING,
} from "@/lib/data";
import { NAV, PLACEHOLDER_IMG, playChime, notifyNewOrder, type TabId, type DraftItem, type UploadImage } from "./shared";

interface StudioProviderProps {
  cafe: Cafe;
  menu: MenuItem[];
  categories: string[];
  planId: string;
  /** Owner's café uuid — required for DB persistence. */
  cafeId?: string;
  /** Saved brand kit / promos from the DB (db mode); fall back to defaults. */
  initialBrand?: BrandKit;
  initialPromos?: Promo[];
  /** "db" persists edits to Supabase (real owner); "local" is the /demo sandbox. */
  persistence?: "db" | "local";
  /** Demo showcase: restrict the nav to the items worth demoing. */
  demo?: boolean;
  children: React.ReactNode;
}

/** The setter shape returned by useStudioState (accepts a value or an updater). */
type StudioSet<T> = (next: T | ((prev: T) => T)) => void;

export interface StudioContextValue {
  slug: string;
  planId: string;
  dbSave: boolean;
  saveStatus: SaveStatus;
  items: MenuItem[];
  cafe: Cafe;
  setCafe: StudioSet<Cafe>;
  brand: BrandKit;
  setBrand: StudioSet<BrandKit>;
  theme: ThemeKey;
  setTheme: StudioSet<ThemeKey>;
  promos: Promo[];
  setPromos: StudioSet<Promo[]>;
  categories: string[];
  setCategories: StudioSet<string[]>;
  uploadImage: UploadImage;
  orders: Order[];
  ordersApi: OrdersApi;
  kitchenOrders: Order[];
  newOrders: number;
  /** Phase 2 "Record sales with Mesa" is live for this café (db mode + opt-in). */
  recording: boolean;
  /** Guest-submitted counter orders awaiting staff confirmation. */
  pendingOrders: PendingOrder[];
  /** Staff taps the guest's code → the order becomes a recorded sale. */
  confirmPending: (orderId: string) => Promise<void>;
  soundOn: boolean;
  toggleSound: () => void;
  caps: BrandCaps;
  editing: DraftItem | null;
  setEditing: React.Dispatch<React.SetStateAction<DraftItem | null>>;
  toastMsg: string;
  toast: (m: string) => void;
  onSwitchPlan: (id: PlanId) => Promise<void>;
  allowedTabs: TabId[];
  toggle: (id: string) => void;
  deleteCategory: (c: string) => void;
  moveItem: (id: string, dir: -1 | 1) => void;
  duplicateItem: (id: string) => void;
  addItem: () => void;
  loadSampleMenu: () => void;
  setCategorySoldOut: (cat: string, soldOut: boolean) => void;
  save: (draft: DraftItem) => void;
  customTags: MenuTag[];
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used within a StudioProvider");
  return ctx;
}

export function StudioProvider({
  cafe: cafe0,
  menu,
  categories: categories0,
  planId,
  cafeId,
  initialBrand,
  initialPromos,
  persistence = "local",
  demo = false,
  children,
}: StudioProviderProps) {
  const slug = cafe0.slug;
  // DB persistence requires the café uuid; otherwise fall back to the sandbox.
  const persist: "db" | "local" = persistence === "db" && cafeId ? "db" : "local";
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [rawItems, setItems] = useStudioState<MenuItem[]>(persist, studioKey(slug, "items"), menu);
  // Normalize on read so legacy string[] tags from older saved menus always
  // render correctly, regardless of when state hydrates. Writes go through
  // setItems; a later save persists the new shape.
  const items = useMemo(() => rawItems.map(normalizeTags), [rawItems]);
  const [cafe, setCafe] = useStudioState<Cafe>(persist, studioKey(slug, "cafe"), cafe0);
  const [brand, setBrand] = useStudioState<BrandKit>(persist, studioKey(slug, "brand"), initialBrand ?? DEFAULT_BRAND);
  const [theme, setTheme] = useStudioState<ThemeKey>(persist, studioKey(slug, "theme"), cafe0.theme);
  const [promos, setPromos] = useStudioState<Promo[]>(persist, studioKey(slug, "promos"), initialPromos ?? []);
  const [categories, setCategories] = useStudioState<string[]>(persist, studioKey(slug, "categories"), categories0);

  // DB mode: debounced auto-save of each concern to Supabase via Server Actions.
  const dbSave = persist === "db" && !!cafeId;
  useAutosave(dbSave, [categories, rawItems], () => saveMenu(cafeId!, categories, rawItems), setSaveStatus);
  useAutosave(dbSave, brand, () => saveBrand(cafeId!, brand), setSaveStatus);
  useAutosave(dbSave, [cafe, theme], () => saveCafeProfile(cafeId!, cafe, theme), setSaveStatus);
  useAutosave(dbSave, promos, () => savePromos(cafeId!, promos), setSaveStatus);

  // Upload images to Storage in DB mode; fall back to a local data URL in the
  // /demo sandbox (anon can't write to Storage anyway).
  const uploadImage = async (file: File, kind: "logo" | "cover" | "item"): Promise<string> => {
    if (dbSave && cafeId) return uploadCafeImage(file, cafeId, kind);
    return new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.readAsDataURL(file);
    });
  };

  const [orders, ordersApi] = useOrders(slug);
  // The live board only handles kitchen-channel orders; counter orders are
  // logged for analytics but never worked here.
  const kitchenOrders = orders.filter((o) => o.channel !== "counter");
  const newOrders = kitchenOrders.filter((o) => o.status === "new").length;
  const [soundOn, setSoundOn] = useLocalStore<boolean>(`mesa.orders.${slug}.sound`, true);
  const caps = capsFor(cafe.plan);
  const [editing, setEditing] = useState<DraftItem | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  const toast = (m: string) => setToastMsg(m);
  React.useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(""), 2000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // BETA: switch the account's tier, then reload so plan-gated capabilities
  // (themes, custom colours, white-label, etc.) re-resolve from the new plan.
  const onSwitchPlan = async (id: PlanId) => {
    if (!(dbSave && cafeId)) { toast("Tier switching works on your live dashboard."); return; }
    const r = await setPlan(id);
    if (r.ok) {
      toast(`Switched to ${PLANS.find((p) => p.id === id)?.name ?? id}`);
      if (typeof window !== "undefined") window.location.reload();
    } else {
      toast("Couldn't switch plan — try again.");
    }
  };

  // Demo showcase shows only the tabs worth demoing; the live app shows all
  // (minus Orders until live tracking ships).
  const DEMO_TABS: TabId[] = ["home", "menu", "categories", "appearance", "promos", "qr"];
  const allowedTabs: TabId[] = demo
    ? DEMO_TABS
    : NAV.map((n) => n.id).filter((id) => PHASE2_ORDERING || id !== "orders");

  // Alert (chime + desktop notification) when a NEW order arrives. Establish a
  // baseline of order ids on first load so we don't alert for existing ones.
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
  const seenOrderIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const prev = seenOrderIds.current;
    seenOrderIds.current = new Set(orders.map((o) => o.id));
    // Alert only for orders that are genuinely new AND just placed — the
    // recency guard means a page reload never re-chimes existing orders
    // (useOrders hydrates from localStorage after the first render).
    const fresh = orders.filter(
      (o) => o.status === "new" && !prev.has(o.id) && Date.now() - o.placedAt < 20000
    );
    if (fresh.length && soundOnRef.current) {
      playChime();
      fresh.forEach(notifyNewOrder);
      toast(fresh.length === 1 ? `New order #${fresh[0].code}` : `${fresh.length} new orders`);
    }
  }, [orders]);

  // ── Phase 2: "Record sales with Mesa" ──────────────────────────────
  // When the café records sales (db mode + opt-in), the source of truth for
  // analytics/recaps becomes the DB's confirmed orders, and a pending queue
  // of guest-submitted counter orders awaits staff confirmation (10s poll —
  // Realtime can replace this at the same seam later).
  const recording = dbSave && !!cafe.recordSales;
  const [dbOrders, setDbOrders] = useState<Order[] | null>(null);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const seenPending = useRef<Set<string>>(new Set());
  const pendingPrimed = useRef(false);
  useEffect(() => {
    if (!(recording && cafeId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale queue/sales when recording toggles off (rare, owner-initiated)
      setPendingOrders([]);
      setDbOrders(null);
      return;
    }
    let stop = false;
    const tick = async () => {
      try {
        const [rec, queue] = await Promise.all([getRecordedOrders(cafeId), getCounterQueue(cafeId)]);
        if (stop) return;
        setDbOrders(rec);
        setPendingOrders(queue);
        // Chime once per genuinely-new pending order; primed on the first
        // load so a page refresh never re-chimes the existing queue.
        const fresh = queue.filter((q) => !seenPending.current.has(q.id));
        queue.forEach((q) => seenPending.current.add(q.id));
        if (pendingPrimed.current && fresh.length && soundOnRef.current) {
          playChime();
          setToastMsg(fresh.length === 1 ? `Order ${fresh[0].code} is waiting at the counter` : `${fresh.length} orders waiting at the counter`);
        }
        pendingPrimed.current = true;
      } catch {
        /* transient network/auth hiccup — the next poll retries */
      }
    };
    void tick();
    const t = setInterval(() => void tick(), 10000);
    return () => { stop = true; clearInterval(t); };
  }, [recording, cafeId]);

  const confirmPending = async (orderId: string) => {
    const r = await confirmOrder(orderId);
    if (r.ok) {
      setPendingOrders((arr) => arr.filter((o) => o.id !== orderId));
      if (cafeId) getRecordedOrders(cafeId).then(setDbOrders).catch(() => {});
      toast("Recorded — it's in today's sales");
    } else {
      toast("Couldn't confirm — it may have expired");
    }
  };

  // What the rest of the dashboard treats as "the orders".
  const effectiveOrders = recording && dbOrders ? dbOrders : orders;

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (next) {
      playChime(); // confirm it's audible + unlock AudioContext via this click
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission();
      }
      toast("Order alerts on");
    } else {
      toast("Order alerts off");
    }
  };

  const toggle = (id: string) => {
    const it = items.find((m) => m.id === id);
    if (it) logActivity(slug, it.soldOut ? "restock" : "86", it.name); // feeds the Day Close recap
    setItems((arr) => arr.map((m) => (m.id === id ? { ...m, soldOut: !m.soldOut } : m)));
  };
  // Delete a category, reassigning its items to the first remaining category so
  // they never get orphaned (an item whose category isn't listed renders nowhere).
  const deleteCategory = (c: string) => {
    const target = categories.find((x) => x !== "All" && x !== c);
    if (target) setItems((arr) => arr.map((m) => (m.cat === c ? { ...m, cat: target } : m)));
    setCategories((arr) => arr.filter((x) => x !== c));
  };
  // Reorder an item within its category by swapping with its nearest
  // same-category neighbour in the given direction (live menu renders array order).
  const moveItem = (id: string, dir: -1 | 1) => setItems((arr) => {
    const i = arr.findIndex((m) => m.id === id);
    if (i < 0) return arr;
    let j = i + dir;
    while (j >= 0 && j < arr.length && arr[j].cat !== arr[i].cat) j += dir;
    if (j < 0 || j >= arr.length) return arr;
    const next = arr.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  // Duplicate an item (same category/price/options/tags) right after it, then
  // open the copy in the editor to tweak. New id keeps cart keys distinct.
  const duplicateItem = (id: string) => {
    const src = items.find((m) => m.id === id);
    if (!src) return;
    const copy: MenuItem = { ...src, id: "item-" + Date.now(), name: `${src.name} (copy)`, best: false };
    setItems((arr) => {
      const i = arr.findIndex((m) => m.id === id);
      const next = arr.slice();
      next.splice(i < 0 ? next.length : i + 1, 0, copy);
      return next;
    });
    setEditing(copy);
    toast("Duplicated — edit the copy");
  };
  const addItem = () => setEditing({ id: "new-" + Date.now(), _new: true, name: "", price: 0, cat: categories.find((c) => c !== "All") || "Hot Coffee", desc: "", img: items[0]?.img || PLACEHOLDER_IMG });
  // First-run helper: populate an empty café with a sample menu (auto-saves).
  const loadSampleMenu = () => {
    setCategories(["All", ...Array.from(new Set(MENU.map((m) => m.cat)))]);
    setItems(MENU.map((m) => ({ ...m })));
    toast("Sample menu added — edit or replace anything.");
  };
  // Bulk sold-out toggle for a whole category (kitchen closed / ran out).
  const setCategorySoldOut = (cat: string, soldOut: boolean) => {
    logActivity(slug, soldOut ? "bulk86" : "bulkRestock", cat);
    setItems((arr) => arr.map((m) => (m.cat === cat ? { ...m, soldOut } : m)));
    toast(soldOut ? `“${cat}” marked sold out` : `“${cat}” back available`);
  };
  const save = (draft: DraftItem) => {
    logActivity(slug, draft._new ? "add" : "edit", draft.name || "Untitled item");
    setItems((arr) => {
      const exists = arr.some((m) => m.id === draft.id);
      const clean: MenuItem = { ...draft, price: Number(draft.price) };
      delete (clean as DraftItem)._new;
      return exists ? arr.map((m) => (m.id === draft.id ? clean : m)) : [...arr, clean];
    });
    setEditing(null);
    toast("Saved · your live menu is updated");
  };

  // The café's custom tags (used on any item, minus the presets) — offered as
  // quick-adds when editing other items so the tag set grows organically.
  const customTags: MenuTag[] = (() => {
    const out: MenuTag[] = [];
    const seen = new Set(DIET_TAGS.map((t) => t.label.toLowerCase()));
    items.forEach((it) => (it.tags ?? []).forEach((t) => {
      const k = t.label.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(t); }
    }));
    return out;
  })();

  const value: StudioContextValue = {
    slug,
    planId,
    dbSave,
    saveStatus,
    items,
    cafe,
    setCafe,
    brand,
    setBrand,
    theme,
    setTheme,
    promos,
    setPromos,
    categories,
    setCategories,
    uploadImage,
    orders: effectiveOrders,
    ordersApi,
    kitchenOrders,
    newOrders,
    recording,
    pendingOrders,
    confirmPending,
    soundOn,
    toggleSound,
    caps,
    editing,
    setEditing,
    toastMsg,
    toast,
    onSwitchPlan,
    allowedTabs,
    toggle,
    deleteCategory,
    moveItem,
    duplicateItem,
    addItem,
    loadSampleMenu,
    setCategorySoldOut,
    save,
    customTags,
  };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

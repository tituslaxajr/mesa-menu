-- ============================================================================
-- Mesa POS — staff cashier terminal (Phase A: shift + ring-up + cash tender).
-- A staff member opens a cash drawer (shift), rings items into a ticket, takes
-- CASH / MANUAL tender (amount tendered → change; no money moves through Mesa),
-- and records the sale straight to the DB as a completed `channel='pos'` order.
-- POS sales flow into the same analytics path as Phase-2 confirmed orders
-- (getRecordedOrders → sales.ts). Void/refund + X/Z readings land in Phase C.
--
-- Gating: brew/roast plan AND the owner's per-café `pos_enabled` opt-in (mirrors
-- record_sales). Re-checked server-side in the RPCs — never trust the client.
-- Whole-peso integers throughout, matching menu_items.price.
-- ============================================================================

-- ---- Owner opt-in + service-charge default (on cafes) ----------------------
alter table public.cafes
  add column if not exists pos_enabled         boolean not null default false,
  add column if not exists service_charge_rate integer not null default 0;  -- whole %

-- ---- shifts — one cash-drawer session; one open shift per café -------------
create table if not exists public.shifts (
  id             uuid primary key default gen_random_uuid(),
  cafe_id        uuid not null references public.cafes(id) on delete cascade,
  opened_by      uuid not null references auth.users(id),
  opened_at      timestamptz not null default now(),
  starting_float integer not null default 0,   -- cash in the drawer at open (₱)
  closed_by      uuid references auth.users(id),
  closed_at      timestamptz,
  counted_cash   integer,                       -- physically counted at close
  expected_cash  integer,                       -- float + cash sales − cash refunds
  over_short     integer,                       -- counted − expected
  note           text,
  status         text not null default 'open'   -- open | closed
);
create index if not exists shifts_cafe_idx on public.shifts(cafe_id);
-- Enforce a single open drawer per café (v1 = one register).
create unique index if not exists shifts_one_open_per_cafe
  on public.shifts(cafe_id) where status = 'open';

-- ---- POS fields on orders (nullable — null for guest orders) ---------------
-- `total` stays the grand total (goods subtotal + service charge). net/vat are
-- the VAT-inclusive breakdown of the GOODS only; service charge rides on top.
alter table public.orders
  add column if not exists shift_id        uuid references public.shifts(id),
  add column if not exists cashier_id      uuid references auth.users(id),
  add column if not exists tender_type     text,     -- cash | gcash | card | other
  add column if not exists tender_label    text,     -- free label for non-cash
  add column if not exists amount_tendered integer,
  add column if not exists change_due      integer,
  add column if not exists paid_at         timestamptz,
  add column if not exists net_amount      integer,  -- goods ex-VAT
  add column if not exists vat_amount      integer,  -- 12% portion of goods
  add column if not exists service_charge  integer not null default 0;
create index if not exists orders_shift_idx on public.orders(shift_id);

-- ---- sale_adjustments — void/refund audit trail (written in Phase C) -------
create table if not exists public.sale_adjustments (
  id         uuid primary key default gen_random_uuid(),
  cafe_id    uuid not null references public.cafes(id) on delete cascade,
  order_id   uuid not null references public.orders(id) on delete cascade,
  shift_id   uuid references public.shifts(id),
  kind       text not null,          -- void | refund
  amount     integer not null,
  reason     text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists sale_adjustments_cafe_idx on public.sale_adjustments(cafe_id);
create index if not exists sale_adjustments_order_idx on public.sale_adjustments(order_id);

-- ---- RLS — any café member (owner/manager/staff) reads & writes -------------
-- Order rows themselves are only ever written inside the SECURITY DEFINER RPCs
-- below, so the existing orders_member_* policies cover POS-order reads.
alter table public.shifts           enable row level security;
alter table public.sale_adjustments enable row level security;

create policy shifts_member_all on public.shifts
  for all to authenticated
  using (public.is_member_of_cafe(cafe_id))
  with check (public.is_member_of_cafe(cafe_id));

create policy sale_adjustments_member_all on public.sale_adjustments
  for all to authenticated
  using (public.is_member_of_cafe(cafe_id))
  with check (public.is_member_of_cafe(cafe_id));

-- ---- Expose the opt-in on the public projection ----------------------------
-- The guest menu never renders POS, but cafe_public is rebuilt here so the
-- owner read path (getOwnerCafeData selects cafes.*) and the projection stay in
-- lockstep with 0011's shape plus the two new columns.
create or replace view public.cafe_public as
  select c.id, c.account_id, c.slug, c.name, c.tagline, c.intro, c.hours,
         c.cover, c.theme, c.order_mode, c.accepting_orders, c.position,
         a.plan, a.plan_status,
         c.open_min, c.close_min,
         c.record_sales,
         c.pos_enabled, c.service_charge_rate
  from public.cafes c
  join public.accounts a on a.id = c.account_id
  where c.published = true;

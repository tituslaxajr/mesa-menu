-- Structured opening hours for the day-phase engine ("Araw" redesign).
-- Nullable on purpose: cafés without structured hours fall back to a
-- best-effort parse of the free-text `hours` column, then to a 7:00–21:00
-- default (see src/lib/day-phase.ts). The display string `hours` stays the
-- diner-facing source so the public menu render path does not change.

alter table public.cafes
  add column if not exists open_min  int,
  add column if not exists close_min int;

comment on column public.cafes.open_min  is 'Opening time, minutes since midnight (420 = 7:00 AM). Null = derive from hours text.';
comment on column public.cafes.close_min is 'Closing time, minutes since midnight (1260 = 9:00 PM). Null = derive from hours text.';

alter table public.cafes
  add constraint cafes_open_min_range
    check (open_min is null or (open_min between 0 and 1439)),
  add constraint cafes_close_min_range
    check (close_min is null or (close_min between 0 and 1439));

-- Expose the new columns on the curated public projection (appended at the
-- end so `create or replace view` is allowed). Same definer-view rationale as
-- the original: published cafés + non-sensitive columns only.
create or replace view public.cafe_public as
  select c.id, c.account_id, c.slug, c.name, c.tagline, c.intro, c.hours,
         c.cover, c.theme, c.order_mode, c.accepting_orders, c.position,
         a.plan, a.plan_status,
         c.open_min, c.close_min
  from public.cafes c
  join public.accounts a on a.id = c.account_id
  where c.published = true;


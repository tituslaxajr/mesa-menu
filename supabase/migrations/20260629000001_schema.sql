-- ============================================================================
-- Mesa — multi-tenant schema
-- Tenant key = account_id. An account (billable subscriber) owns 1..N cafes.
-- Every tenant-owned row carries cafe_id; option_*/order_lines denormalize it
-- so RLS policies stay single-predicate.
-- ============================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid / gen_random_bytes

-- ---- Enums (mirror the TS unions in src/lib/data.ts) -----------------------
create type plan_id       as enum ('starter', 'brew', 'roast');
create type theme_key     as enum ('warm', 'minimal', 'bold', 'soft', 'playful');
create type order_mode    as enum ('browse', 'counter', 'kitchen');
create type order_status  as enum ('new', 'preparing', 'ready', 'completed', 'cancelled');
create type order_channel as enum ('kitchen', 'counter');
create type member_role   as enum ('owner', 'manager', 'staff');
create type brand_shape   as enum ('sharp', 'rounded', 'soft');
create type color_mode    as enum ('preset', 'auto');

-- ---- updated_at helper -----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---- accounts — the billable tenant ----------------------------------------
create table public.accounts (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  plan                    plan_id not null default 'starter',
  plan_status             text not null default 'active',   -- active|past_due|canceled|trialing
  billing_cycle           text not null default 'monthly',  -- monthly|annual
  paymongo_customer_id    text unique,
  paymongo_subscription_id text unique,
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create trigger accounts_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();

-- ---- cafes — one location (maps Cafe) --------------------------------------
create table public.cafes (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references public.accounts(id) on delete cascade,
  slug             text not null unique,
  name             text not null,
  tagline          text not null default '',
  intro            text not null default '',
  hours            text not null default '',
  cover            text,                              -- storage path or absolute URL
  theme            theme_key not null default 'warm',
  order_mode       order_mode,                        -- null = legacy default
  accepting_orders boolean not null default true,
  published        boolean not null default false,    -- public-read gate
  position         int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index cafes_account_id_idx on public.cafes(account_id);
create trigger cafes_updated_at before update on public.cafes
  for each row execute function public.set_updated_at();

-- ---- platform_admins — the SaaS operator(s), spanning ALL tenants ----------
-- Separate from cafe roles: a platform admin is NOT a café member. Populate by
-- inserting your auth user id (service role / SQL editor) after you sign up.
create table public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---- cafe_members — owners/teams ↔ Supabase auth users ---------------------
-- cafe_id null  = account-wide membership (owners / brand-level managers).
-- cafe_id set   = scoped to a single location (per-location managers / staff).
create table public.cafe_members (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  cafe_id    uuid references public.cafes(id) on delete cascade,
  role       member_role not null default 'owner',
  created_at timestamptz not null default now()
);
create index cafe_members_user_id_idx on public.cafe_members(user_id);
create index cafe_members_account_idx on public.cafe_members(account_id);
-- At most one account-wide row per user per account, and one scoped row per café.
create unique index cafe_members_account_wide_uniq
  on public.cafe_members(account_id, user_id) where cafe_id is null;
create unique index cafe_members_cafe_scoped_uniq
  on public.cafe_members(account_id, user_id, cafe_id) where cafe_id is not null;

-- ---- categories ------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  cafe_id    uuid not null references public.cafes(id) on delete cascade,
  name       text not null,
  position   int not null default 0,
  created_at timestamptz not null default now(),
  unique (cafe_id, name)
);
create index categories_cafe_id_idx on public.categories(cafe_id);

-- ---- menu_items ------------------------------------------------------------
create table public.menu_items (
  id          uuid primary key default gen_random_uuid(),
  cafe_id     uuid not null references public.cafes(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name        text not null,
  price       integer not null,                       -- whole pesos (₱)
  descr       text not null default '',
  img         text,
  badge       text,
  sold_out    boolean not null default false,
  best        boolean not null default false,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index menu_items_cafe_id_idx on public.menu_items(cafe_id);
create index menu_items_category_id_idx on public.menu_items(category_id);
create trigger menu_items_updated_at before update on public.menu_items
  for each row execute function public.set_updated_at();

-- ---- option_groups / option_choices (cafe_id denormalized for RLS) ---------
create table public.option_groups (
  id           uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  cafe_id      uuid not null references public.cafes(id) on delete cascade,
  label        text not null,
  required     boolean not null default false,
  multi        boolean not null default false,
  position     int not null default 0
);
create index option_groups_item_idx on public.option_groups(menu_item_id);

create table public.option_choices (
  id              uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references public.option_groups(id) on delete cascade,
  cafe_id         uuid not null references public.cafes(id) on delete cascade,
  label           text not null,
  price_delta     integer not null default 0,
  position        int not null default 0
);
create index option_choices_group_idx on public.option_choices(option_group_id);

-- ---- menu_tags + join (maps MenuTag) ---------------------------------------
create table public.menu_tags (
  id        uuid primary key default gen_random_uuid(),
  cafe_id   uuid not null references public.cafes(id) on delete cascade,
  key       text not null,                            -- preset id or custom slug
  label     text not null,
  emoji     text,
  is_preset boolean not null default false,
  unique (cafe_id, key)
);
create index menu_tags_cafe_id_idx on public.menu_tags(cafe_id);

create table public.menu_item_tags (
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  tag_id       uuid not null references public.menu_tags(id) on delete cascade,
  primary key (menu_item_id, tag_id)
);

-- ---- brand_kits (1:1 cafe; stored UN-clamped) ------------------------------
create table public.brand_kits (
  cafe_id      uuid primary key references public.cafes(id) on delete cascade,
  logo         text,
  accent       text not null default '#AE4A24',
  palette_id   text not null default 'clay',
  heading_font text not null default 'newsreader',
  body_font    text not null default 'hanken',
  pairing_id   text not null default 'editorial',
  color_mode   color_mode not null default 'preset',
  surface      text,
  surface_id   text not null default 'none',
  shape        brand_shape not null default 'rounded',
  updated_at   timestamptz not null default now()
);
create trigger brand_kits_updated_at before update on public.brand_kits
  for each row execute function public.set_updated_at();

-- ---- promos ----------------------------------------------------------------
create table public.promos (
  id       uuid primary key default gen_random_uuid(),
  cafe_id  uuid not null references public.cafes(id) on delete cascade,
  title    text not null,
  descr    text not null default '',
  period   text not null default '',
  active   boolean not null default true,
  tone     text not null default 'neutral',           -- highlight|brand|neutral
  position int not null default 0
);
create index promos_cafe_id_idx on public.promos(cafe_id);

-- ---- orders / order_lines (maps Order / OrderLine) -------------------------
create table public.orders (
  id           uuid primary key default gen_random_uuid(),
  cafe_id      uuid not null references public.cafes(id) on delete cascade,
  code         text not null,                          -- short guest-facing code
  table_label  text,                                   -- TS `table` (reserved word)
  total        integer not null,
  note         text,
  status       order_status not null default 'new',
  channel      order_channel not null default 'kitchen',
  placed_at    timestamptz not null default now(),
  completed_at timestamptz,
  guest_token  uuid,                                   -- anonymous ownership
  unique (cafe_id, code)
);
create index orders_cafe_placed_idx on public.orders(cafe_id, placed_at desc);
create index orders_cafe_status_idx on public.orders(cafe_id, status);
create index orders_guest_token_idx on public.orders(guest_token);

create table public.order_lines (
  id       uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  cafe_id  uuid not null references public.cafes(id) on delete cascade,
  name     text not null,
  price    integer not null,                           -- effective unit price
  qty      integer not null,
  options  text[] not null default '{}',               -- chosen labels
  position int not null default 0
);
create index order_lines_order_idx on public.order_lines(order_id);

-- ---- RLS helper functions (SECURITY DEFINER, fixed search_path) ------------
-- Defined here so 0002_rls.sql can reference them. SECURITY DEFINER lets the
-- membership lookup run regardless of the caller's own RLS, avoiding recursion.
-- NOTE: platform admins are intentionally NOT folded into these helpers — a
-- creator must not have ambient read/write over tenants' private data (orders,
-- team PII, drafts). Their only standing cross-tenant access is the read-only,
-- non-PII `admin_cafe_overview` view below; deeper actions are explicit,
-- audited service-role operations (break-glass).

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

-- Any membership in the account (account-wide OR a café within it).
create or replace function public.is_member_of_account(a uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cafe_members m
    where m.account_id = a and m.user_id = auth.uid()
  );
$$;

-- Owner of the account → billing, team management, create/delete locations.
create or replace function public.is_account_owner(a uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cafe_members m
    where m.account_id = a and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- Any role on a café (account-wide owner, or manager/staff scoped to it) →
-- can view drafts and work the live orders board.
create or replace function public.is_member_of_cafe(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cafes cf
    join public.cafe_members m on m.account_id = cf.account_id
    where cf.id = c and m.user_id = auth.uid()
      and (m.cafe_id is null or m.cafe_id = c)
  );
$$;

-- Owner or manager on a café → edit menu, branding, categories, promos, profile.
create or replace function public.can_manage_cafe(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cafes cf
    join public.cafe_members m on m.account_id = cf.account_id
    where cf.id = c and m.user_id = auth.uid()
      and (m.cafe_id is null or m.cafe_id = c)
      and m.role in ('owner', 'manager')
  );
$$;

-- ---- cafe_public — curated public projection (intentional definer view) ----
-- Views bypass the underlying tables' RLS by default. This is deliberate: it
-- exposes ONLY published cafes and ONLY non-sensitive columns (no billing ids)
-- to anon, plus the plan needed for read-path gating (clampBrand/clampTheme).
create view public.cafe_public as
  select c.id, c.account_id, c.slug, c.name, c.tagline, c.intro, c.hours,
         c.cover, c.theme, c.order_mode, c.accepting_orders, c.position,
         a.plan, a.plan_status
  from public.cafes c
  join public.accounts a on a.id = c.account_id
  where c.published = true;

grant select on public.cafe_public to anon, authenticated;

-- ---- admin_cafe_overview — the creator's ONLY standing cross-tenant view ----
-- Least-privilege support surface: structural + diagnostic fields and aggregate
-- COUNTS only. Deliberately excludes everything private — no order contents,
-- diner notes, table labels, guest tokens, team identities, or PayMongo tokens.
-- The `where is_platform_admin()` predicate means non-admins get zero rows.
create view public.admin_cafe_overview as
  select
    a.id   as account_id,
    a.name as account_name,
    a.plan,
    a.plan_status,
    a.billing_cycle,
    a.current_period_end,
    c.id   as cafe_id,
    c.slug,
    c.name as cafe_name,
    c.published,
    c.accepting_orders,
    c.order_mode,
    c.theme,
    c.created_at,
    c.updated_at,
    (select count(*) from public.menu_items mi where mi.cafe_id = c.id)  as menu_items_count,
    (select count(*) from public.categories ct where ct.cafe_id = c.id)  as categories_count,
    (select count(*) from public.cafe_members m where m.account_id = a.id) as members_count,
    (select count(*) from public.orders o where o.cafe_id = c.id)        as orders_total,
    (select count(*) from public.orders o
       where o.cafe_id = c.id and o.status in ('new','preparing','ready')) as orders_open,
    (select max(o.placed_at) from public.orders o where o.cafe_id = c.id) as last_order_at
  from public.accounts a
  join public.cafes c on c.account_id = a.id
  where public.is_platform_admin();

grant select on public.admin_cafe_overview to authenticated;

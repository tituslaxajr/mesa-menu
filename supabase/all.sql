-- >>> 20260629000001_schema.sql ========================================
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


-- >>> 20260629000002_rls.sql ========================================
-- ============================================================================
-- Mesa — Row-Level Security (role-aware)
-- Axes:
--   * platform_admins  → blanket access across all tenants (folded into helpers)
--   * account owner     → billing, team, create/delete locations
--   * owner|manager     → can_manage_cafe(): menu, branding, categories, promos
--   * any café member   → is_member_of_cafe(): view drafts + work the orders board
--   * anon (diners)     → SELECT only on content of PUBLISHED cafés; orders via RPC
-- ============================================================================

alter table public.accounts        enable row level security;
alter table public.platform_admins enable row level security;
alter table public.cafes           enable row level security;
alter table public.cafe_members    enable row level security;
alter table public.categories      enable row level security;
alter table public.menu_items      enable row level security;
alter table public.option_groups   enable row level security;
alter table public.option_choices  enable row level security;
alter table public.menu_tags       enable row level security;
alter table public.menu_item_tags  enable row level security;
alter table public.brand_kits      enable row level security;
alter table public.promos          enable row level security;
alter table public.orders          enable row level security;
alter table public.order_lines     enable row level security;

-- ---- platform_admins -------------------------------------------------------
-- Readable by admins (and a user can see their own row). Never written via the
-- client — populate with the service role / SQL editor.
create policy platform_admins_select on public.platform_admins
  for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

-- ---- accounts --------------------------------------------------------------
-- Members read their account; plan/billing is written only by the service role
-- (PayMongo webhook). Owners get name edits via a Server Action later if needed.
create policy accounts_member_select on public.accounts
  for select to authenticated using (public.is_member_of_account(id));

-- ---- cafe_members ----------------------------------------------------------
create policy members_account_select on public.cafe_members
  for select to authenticated using (public.is_member_of_account(account_id));
create policy members_owner_write on public.cafe_members
  for all to authenticated
  using (public.is_account_owner(account_id))
  with check (public.is_account_owner(account_id));

-- ---- cafes -----------------------------------------------------------------
create policy cafes_public_select on public.cafes
  for select to anon, authenticated using (published = true);
create policy cafes_member_select on public.cafes
  for select to authenticated using (public.is_member_of_cafe(id));
-- Create a location: account owners only (the cafe doesn't exist yet → check account).
create policy cafes_owner_insert on public.cafes
  for insert to authenticated with check (public.is_account_owner(account_id));
-- Edit profile/theme/publish/pause: owners + managers.
create policy cafes_manage_update on public.cafes
  for update to authenticated
  using (public.can_manage_cafe(id))
  with check (public.can_manage_cafe(id));
-- Delete a location: account owners only.
create policy cafes_owner_delete on public.cafes
  for delete to authenticated using (public.is_account_owner(account_id));

-- ---- content tables: public read (published) + member read + manager write -
-- categories
create policy categories_public_select on public.categories
  for select to anon, authenticated
  using (exists (select 1 from public.cafes c where c.id = categories.cafe_id and c.published));
create policy categories_member_select on public.categories
  for select to authenticated using (public.is_member_of_cafe(cafe_id));
create policy categories_manage_all on public.categories
  for all to authenticated
  using (public.can_manage_cafe(cafe_id)) with check (public.can_manage_cafe(cafe_id));

-- menu_items
create policy menu_items_public_select on public.menu_items
  for select to anon, authenticated
  using (exists (select 1 from public.cafes c where c.id = menu_items.cafe_id and c.published));
create policy menu_items_member_select on public.menu_items
  for select to authenticated using (public.is_member_of_cafe(cafe_id));
create policy menu_items_manage_all on public.menu_items
  for all to authenticated
  using (public.can_manage_cafe(cafe_id)) with check (public.can_manage_cafe(cafe_id));

-- option_groups
create policy option_groups_public_select on public.option_groups
  for select to anon, authenticated
  using (exists (select 1 from public.cafes c where c.id = option_groups.cafe_id and c.published));
create policy option_groups_member_select on public.option_groups
  for select to authenticated using (public.is_member_of_cafe(cafe_id));
create policy option_groups_manage_all on public.option_groups
  for all to authenticated
  using (public.can_manage_cafe(cafe_id)) with check (public.can_manage_cafe(cafe_id));

-- option_choices
create policy option_choices_public_select on public.option_choices
  for select to anon, authenticated
  using (exists (select 1 from public.cafes c where c.id = option_choices.cafe_id and c.published));
create policy option_choices_member_select on public.option_choices
  for select to authenticated using (public.is_member_of_cafe(cafe_id));
create policy option_choices_manage_all on public.option_choices
  for all to authenticated
  using (public.can_manage_cafe(cafe_id)) with check (public.can_manage_cafe(cafe_id));

-- menu_tags
create policy menu_tags_public_select on public.menu_tags
  for select to anon, authenticated
  using (exists (select 1 from public.cafes c where c.id = menu_tags.cafe_id and c.published));
create policy menu_tags_member_select on public.menu_tags
  for select to authenticated using (public.is_member_of_cafe(cafe_id));
create policy menu_tags_manage_all on public.menu_tags
  for all to authenticated
  using (public.can_manage_cafe(cafe_id)) with check (public.can_manage_cafe(cafe_id));

-- menu_item_tags (no cafe_id column → scope via the parent item)
create policy menu_item_tags_public_select on public.menu_item_tags
  for select to anon, authenticated
  using (exists (
    select 1 from public.menu_items mi join public.cafes c on c.id = mi.cafe_id
    where mi.id = menu_item_tags.menu_item_id and c.published));
create policy menu_item_tags_member_select on public.menu_item_tags
  for select to authenticated
  using (exists (
    select 1 from public.menu_items mi
    where mi.id = menu_item_tags.menu_item_id and public.is_member_of_cafe(mi.cafe_id)));
create policy menu_item_tags_manage_all on public.menu_item_tags
  for all to authenticated
  using (exists (
    select 1 from public.menu_items mi
    where mi.id = menu_item_tags.menu_item_id and public.can_manage_cafe(mi.cafe_id)))
  with check (exists (
    select 1 from public.menu_items mi
    where mi.id = menu_item_tags.menu_item_id and public.can_manage_cafe(mi.cafe_id)));

-- brand_kits
create policy brand_kits_public_select on public.brand_kits
  for select to anon, authenticated
  using (exists (select 1 from public.cafes c where c.id = brand_kits.cafe_id and c.published));
create policy brand_kits_member_select on public.brand_kits
  for select to authenticated using (public.is_member_of_cafe(cafe_id));
create policy brand_kits_manage_all on public.brand_kits
  for all to authenticated
  using (public.can_manage_cafe(cafe_id)) with check (public.can_manage_cafe(cafe_id));

-- promos
create policy promos_public_select on public.promos
  for select to anon, authenticated
  using (exists (select 1 from public.cafes c where c.id = promos.cafe_id and c.published));
create policy promos_member_select on public.promos
  for select to authenticated using (public.is_member_of_cafe(cafe_id));
create policy promos_manage_all on public.promos
  for all to authenticated
  using (public.can_manage_cafe(cafe_id)) with check (public.can_manage_cafe(cafe_id));

-- ---- orders / order_lines --------------------------------------------------
-- Any café member (owner/manager/staff) works the board. Guests NEVER select
-- directly: inserts via place_order(), reads via get_my_orders() / get_order().
create policy orders_member_select on public.orders
  for select to authenticated using (public.is_member_of_cafe(cafe_id));
create policy orders_member_update on public.orders
  for update to authenticated
  using (public.is_member_of_cafe(cafe_id))
  with check (public.is_member_of_cafe(cafe_id));
create policy orders_member_delete on public.orders
  for delete to authenticated using (public.is_member_of_cafe(cafe_id));

create policy order_lines_member_select on public.order_lines
  for select to authenticated using (public.is_member_of_cafe(cafe_id));


-- >>> 20260629000003_functions.sql ========================================
-- ============================================================================
-- Mesa — RPCs (the secure analog of the old client-side stores)
--   place_order()   : anonymous guests create orders without a raw table insert
--   get_my_orders() : guests read back only their own orders (by guest_token)
--   get_order()     : single-order lookup for the guest tracker deep link
--   order_to_json() : shapes a row into the TS `Order` DTO (epoch-ms timestamps)
-- All run SECURITY DEFINER so they can bypass RLS in a tightly-scoped way.
-- ============================================================================

-- ---- Order → TS-shaped JSON (id, code, table, total, lines[], placedAt ms) -
create or replace function public.order_to_json(o public.orders)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id',          o.id,
    'code',        o.code,
    'table',       o.table_label,
    'total',       o.total,
    'note',        o.note,
    'status',      o.status,
    'channel',     o.channel,
    'placedAt',    (extract(epoch from o.placed_at) * 1000)::bigint,
    'completedAt', case when o.completed_at is null then null
                        else (extract(epoch from o.completed_at) * 1000)::bigint end,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'name', l.name, 'price', l.price,
               'qty', l.qty, 'options', to_jsonb(l.options))
             order by l.position)
      from public.order_lines l where l.order_id = o.id), '[]'::jsonb)
  );
$$;

-- ---- gen_order_code — short human code (3 base36 chars) --------------------
-- cafe_id reserved for future per-cafe sequencing; collisions are handled by
-- the retry loop + unique(cafe_id, code) constraint in place_order().
create or replace function public.gen_order_code(p_cafe_id uuid)
returns text language plpgsql volatile as $$
declare
  chars constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  code  text := '';
  i     int;
begin
  for i in 1..3 loop
    code := code || substr(chars, 1 + floor(random() * 36)::int, 1);
  end loop;
  return code;
end;
$$;

-- ---- place_order — anonymous order creation --------------------------------
create or replace function public.place_order(
  p_slug        text,
  p_table       text,
  p_note        text,
  p_channel     order_channel,
  p_guest_token uuid,
  p_lines       jsonb
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_cafe    public.cafes;
  v_plan    plan_id;
  v_total   int;
  v_order   public.orders;
  v_code    text;
  v_tries   int := 0;
  v_line    jsonb;
  v_pos     int := 0;
begin
  -- 1. Resolve the cafe by slug; must be published.
  select * into v_cafe from public.cafes where slug = p_slug and published = true;
  if not found then
    raise exception 'cafe not found or not published';
  end if;

  -- 2. Honour the owner pause switch.
  if not v_cafe.accepting_orders then
    raise exception 'cafe is not accepting orders';
  end if;

  -- 3. Kitchen orders require an ordering plan (brew/roast); counter is fine on any.
  select plan into v_plan from public.accounts where id = v_cafe.account_id;
  if p_channel = 'kitchen' and v_plan = 'starter' then
    raise exception 'ordering is not enabled for this plan';
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'order has no lines';
  end if;

  -- 4. Recompute the total server-side — never trust a client-supplied total.
  select coalesce(sum((l->>'price')::int * (l->>'qty')::int), 0)
    into v_total
  from jsonb_array_elements(p_lines) l;

  -- 5. Insert the order with a collision-safe code (retry on unique violation).
  loop
    v_tries := v_tries + 1;
    v_code := public.gen_order_code(v_cafe.id);
    begin
      insert into public.orders (cafe_id, code, table_label, note, channel,
                                 guest_token, total, status, completed_at)
      values (
        v_cafe.id, v_code, nullif(p_table, ''), nullif(p_note, ''), p_channel,
        p_guest_token, v_total,
        case when p_channel = 'counter' then 'completed'::order_status
             else 'new'::order_status end,
        case when p_channel = 'counter' then now() else null end
      )
      returning * into v_order;
      exit;  -- success
    exception when unique_violation then
      if v_tries >= 10 then raise exception 'could not allocate order code'; end if;
    end;
  end loop;

  -- 6. Insert the lines (resolved labels + effective unit price).
  for v_line in select * from jsonb_array_elements(p_lines) loop
    insert into public.order_lines (order_id, cafe_id, name, price, qty, options, position)
    values (
      v_order.id, v_cafe.id,
      v_line->>'name',
      (v_line->>'price')::int,
      (v_line->>'qty')::int,
      coalesce((select array(select jsonb_array_elements_text(v_line->'options'))), '{}'),
      v_pos
    );
    v_pos := v_pos + 1;
  end loop;

  return public.order_to_json(v_order);
end;
$$;

-- ---- get_my_orders / get_order — guest reads scoped by token ---------------
create or replace function public.get_my_orders(p_slug text, p_guest_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.order_to_json(o) order by o.placed_at desc), '[]'::jsonb)
  from public.orders o
  join public.cafes c on c.id = o.cafe_id
  where c.slug = p_slug and o.guest_token = p_guest_token;
$$;

create or replace function public.get_order(p_id uuid, p_guest_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select public.order_to_json(o)
  from public.orders o
  where o.id = p_id and o.guest_token = p_guest_token;
$$;

-- Guests (anon) and owners may call the order RPCs.
grant execute on function public.place_order(text, text, text, order_channel, uuid, jsonb) to anon, authenticated;
grant execute on function public.get_my_orders(text, uuid) to anon, authenticated;
grant execute on function public.get_order(uuid, uuid) to anon, authenticated;

-- ---- seed_preset_tags — used by the signup trigger + demo seed -------------
-- Definer + restricted: NOT callable by anon/authenticated (would let anyone
-- write tags into any cafe). Only the SECURITY DEFINER signup trigger and the
-- migration role (service_role) invoke it.
create or replace function public.seed_preset_tags(p_cafe_id uuid)
returns void language sql volatile security definer set search_path = public as $$
  insert into public.menu_tags (cafe_id, key, label, emoji, is_preset)
  values
    (p_cafe_id, 'vegetarian', 'Vegetarian',     '🥬', true),
    (p_cafe_id, 'vegan',      'Vegan',          '🌱', true),
    (p_cafe_id, 'spicy',      'Spicy',          '🌶️', true),
    (p_cafe_id, 'nuts',       'Contains nuts',  '🥜', true),
    (p_cafe_id, 'dairy',      'Contains dairy', '🥛', true),
    (p_cafe_id, 'gluten',     'Contains gluten','🌾', true)
  on conflict (cafe_id, key)
    do update set label = excluded.label, emoji = excluded.emoji, is_preset = excluded.is_preset;
$$;

revoke all on function public.seed_preset_tags(uuid) from public, anon, authenticated;
grant execute on function public.seed_preset_tags(uuid) to service_role;


-- >>> 20260629000004_seed.sql ========================================
-- ============================================================================
-- Mesa — idempotent demo seed
-- Reproduces DEMO_CAFE ("Kape Kalye", brew) and DEMO_CAFE_STARTER
-- ("Tindahan Coffee", starter) from src/lib/data.ts so /m/demo and
-- /m/demo-starter render identically once the read path is flipped to the DB.
-- Safe to re-run: keyed on cafes.slug; menu/promos are reset each run.
-- ============================================================================

-- ---- helpers (demo-only, service_role) -------------------------------------
create or replace function public.link_tags(p_item uuid, p_cafe uuid, p_keys text[])
returns void language sql volatile security definer set search_path = public as $$
  insert into public.menu_item_tags (menu_item_id, tag_id)
  select p_item, t.id from public.menu_tags t
  where t.cafe_id = p_cafe and t.key = any(p_keys)
  on conflict do nothing;
$$;

create or replace function public.add_coffee_options(p_item uuid, p_cafe uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare g uuid;
begin
  insert into public.option_groups (menu_item_id, cafe_id, label, required, multi, position)
    values (p_item, p_cafe, 'Size', true, false, 0) returning id into g;
  insert into public.option_choices (option_group_id, cafe_id, label, price_delta, position) values
    (g, p_cafe, 'Small', 0, 0), (g, p_cafe, 'Medium', 20, 1), (g, p_cafe, 'Large', 40, 2);

  insert into public.option_groups (menu_item_id, cafe_id, label, required, multi, position)
    values (p_item, p_cafe, 'Milk', true, false, 1) returning id into g;
  insert into public.option_choices (option_group_id, cafe_id, label, price_delta, position) values
    (g, p_cafe, 'Whole milk', 0, 0), (g, p_cafe, 'Oat milk', 30, 1), (g, p_cafe, 'Almond milk', 30, 2);

  insert into public.option_groups (menu_item_id, cafe_id, label, required, multi, position)
    values (p_item, p_cafe, 'Add-ons', false, true, 2) returning id into g;
  insert into public.option_choices (option_group_id, cafe_id, label, price_delta, position) values
    (g, p_cafe, 'Extra shot', 40, 0), (g, p_cafe, 'Vanilla syrup', 25, 1);
end;
$$;

create or replace function public.seed_demo_menu(p_cafe_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_hot uuid; v_iced uuid; v_sweet uuid; v_kitchen uuid;
  v_item uuid; v_grp uuid;
  b text := 'https://images.unsplash.com/';
  q text := '?w=600&q=72&auto=format&fit=crop';
begin
  -- reset menu content (cascade clears option_*/menu_item_tags)
  delete from public.menu_items where cafe_id = p_cafe_id;
  delete from public.categories where cafe_id = p_cafe_id;
  perform public.seed_preset_tags(p_cafe_id);

  insert into public.categories (cafe_id, name, position) values (p_cafe_id, 'Hot Coffee', 0)   returning id into v_hot;
  insert into public.categories (cafe_id, name, position) values (p_cafe_id, 'Iced Coffee', 1)  returning id into v_iced;
  insert into public.categories (cafe_id, name, position) values (p_cafe_id, 'Sweet Things', 2) returning id into v_sweet;
  insert into public.categories (cafe_id, name, position) values (p_cafe_id, 'Kitchen', 3)      returning id into v_kitchen;

  -- Hot Coffee
  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, badge, best, position)
    values (p_cafe_id, v_hot, 'Flat White', 130, 'Slow-pulled espresso, steamed milk, a little foam.',
            b||'photo-1541167760496-1628856ab772'||q, 'Bestseller', true, 0) returning id into v_item;
  perform public.add_coffee_options(v_item, p_cafe_id);
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy']);

  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, position)
    values (p_cafe_id, v_hot, 'Cappuccino', 120, 'Equal parts espresso, steamed milk, and airy foam.',
            b||'photo-1572442388796-11668a67e53d'||q, 1) returning id into v_item;
  perform public.add_coffee_options(v_item, p_cafe_id);
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy']);

  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, position)
    values (p_cafe_id, v_hot, 'Salted Caramel Latte', 150, 'House caramel, a pinch of sea salt, velvety milk.',
            b||'photo-1534687941688-651ccaafbff8'||q, 2) returning id into v_item;
  perform public.add_coffee_options(v_item, p_cafe_id);
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy']);

  -- Iced Coffee
  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, badge, position)
    values (p_cafe_id, v_iced, 'Iced Spanish Latte', 150, 'Sweet condensed milk over a double shot, lots of ice.',
            b||'photo-1461023058943-07fcbe16d735'||q, 'New', 0) returning id into v_item;
  perform public.add_coffee_options(v_item, p_cafe_id);
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy']);

  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, position)
    values (p_cafe_id, v_iced, 'Iced Latte', 140, 'Smooth espresso, cold milk, slow melt.',
            b||'photo-1517701550927-30cf4ba1dba5'||q, 1) returning id into v_item;
  perform public.add_coffee_options(v_item, p_cafe_id);
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy']);

  -- Sweet Things
  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, position)
    values (p_cafe_id, v_sweet, 'Butter Croissant', 95, 'Baked this morning. Flaky, buttery, warm.',
            b||'photo-1555507036-ab1f4038808a'||q, 0) returning id into v_item;
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy','gluten']);

  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, position)
    values (p_cafe_id, v_sweet, 'Raspberry Cream Cake', 165, 'Soft sponge, fresh cream, tart raspberries.',
            b||'photo-1565958011703-44f9829ba187'||q, 1) returning id into v_item;
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy','gluten']);

  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, sold_out, position)
    values (p_cafe_id, v_sweet, 'Brown Butter Cookies', 80, 'Crisp edges, gooey middle, dark chocolate.',
            b||'photo-1499636136210-6f4ee915583e'||q, true, 2) returning id into v_item;
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy','gluten','nuts']);

  -- Kitchen
  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, position)
    values (p_cafe_id, v_kitchen, 'Pulled Pork Sandwich', 220, 'Slow-cooked pork, slaw, toasted brioche.',
            b||'photo-1606755962773-d324e0a13086'||q, 0) returning id into v_item;
  insert into public.option_groups (menu_item_id, cafe_id, label, required, multi, position)
    values (v_item, p_cafe_id, 'Add-ons', false, true, 0) returning id into v_grp;
  insert into public.option_choices (option_group_id, cafe_id, label, price_delta, position) values
    (v_grp, p_cafe_id, 'Make it a combo (fries + drink)', 90, 0),
    (v_grp, p_cafe_id, 'Extra slaw', 20, 1);
  perform public.link_tags(v_item, p_cafe_id, array['gluten','spicy']);

  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, position)
    values (p_cafe_id, v_kitchen, 'Sourdough & Eggs', 195, 'House sourdough, soft eggs, salted butter.',
            b||'photo-1509440159596-0249088772ff'||q, 1) returning id into v_item;
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy','gluten']);
end;
$$;

revoke all on function public.link_tags(uuid, uuid, text[]) from public, anon, authenticated;
revoke all on function public.add_coffee_options(uuid, uuid) from public, anon, authenticated;
revoke all on function public.seed_demo_menu(uuid) from public, anon, authenticated;

-- ---- create the two demo cafes + content -----------------------------------
do $$
declare
  c_demo uuid; a_demo uuid;
  c_star uuid; a_star uuid;
  cover_base text := 'https://images.unsplash.com/';
  cover_q    text := '?w=1200&q=72&auto=format&fit=crop';
begin
  -- Kape Kalye — Brew, warm, accepting orders, published.
  select id, account_id into c_demo, a_demo from public.cafes where slug = 'demo';
  if c_demo is null then
    insert into public.accounts (name, plan, plan_status) values ('Kape Kalye', 'brew', 'active')
      returning id into a_demo;
    insert into public.cafes (account_id, slug, name, tagline, intro, hours, cover, theme,
                              order_mode, accepting_orders, published)
      values (a_demo, 'demo', 'Kape Kalye',
              'Neighborhood coffee · San Fernando, Pampanga',
              'Slow coffee, fresh pastries, and a quiet corner — made for staying a while.',
              'Open today · 7:00am – 10:00pm',
              cover_base||'photo-1554118811-1e0d58224f24'||cover_q,
              'warm', null, true, true)
      returning id into c_demo;
  else
    update public.accounts set plan = 'brew', plan_status = 'active' where id = a_demo;
    update public.cafes set name = 'Kape Kalye',
           tagline = 'Neighborhood coffee · San Fernando, Pampanga',
           intro = 'Slow coffee, fresh pastries, and a quiet corner — made for staying a while.',
           hours = 'Open today · 7:00am – 10:00pm',
           theme = 'warm', order_mode = null, published = true,
           accepting_orders = true where id = c_demo;
  end if;
  insert into public.brand_kits (cafe_id) values (c_demo) on conflict (cafe_id) do nothing;
  perform public.seed_demo_menu(c_demo);

  delete from public.promos where cafe_id = c_demo;
  insert into public.promos (cafe_id, title, descr, period, active, tone, position) values
    (c_demo, 'Merienda hour', '2–5 PM · ₱20 off any pastry with a hot drink.', 'Daily · 2:00–5:00 PM', true, 'highlight', 0),
    (c_demo, 'Student Tuesdays', '10% off for students, all day Tuesday.', 'Every Tuesday', true, 'brand', 1),
    (c_demo, 'Rainy-day soup set', 'Free soup with any sandwich when it rains.', 'Seasonal · paused', false, 'neutral', 2);

  -- Tindahan Coffee — Starter, minimal, browse-only, published.
  select id, account_id into c_star, a_star from public.cafes where slug = 'demo-starter';
  if c_star is null then
    insert into public.accounts (name, plan, plan_status) values ('Tindahan Coffee', 'starter', 'active')
      returning id into a_star;
    insert into public.cafes (account_id, slug, name, tagline, intro, hours, cover, theme,
                              order_mode, accepting_orders, published)
      values (a_star, 'demo-starter', 'Tindahan Coffee',
              'Small-batch roasts · Angeles, Pampanga',
              'Small-batch roasts and simple, honest food, served all day.',
              'Open today · 8:00am – 9:00pm',
              cover_base||'photo-1453614512568-c4024d13c247'||cover_q,
              'minimal', 'browse', true, true)
      returning id into c_star;
  else
    update public.accounts set plan = 'starter', plan_status = 'active' where id = a_star;
    update public.cafes set name = 'Tindahan Coffee',
           tagline = 'Small-batch roasts · Angeles, Pampanga',
           intro = 'Small-batch roasts and simple, honest food, served all day.',
           hours = 'Open today · 8:00am – 9:00pm',
           theme = 'minimal', order_mode = 'browse',
           published = true where id = c_star;
  end if;
  insert into public.brand_kits (cafe_id) values (c_star) on conflict (cafe_id) do nothing;
  perform public.seed_demo_menu(c_star);
end;
$$;


-- >>> 20260629000005_auth.sql ========================================
-- ============================================================================
-- Mesa — auth provisioning
-- When a new owner signs up, create their billable account + an account-wide
-- owner membership. The café itself is created in an onboarding step (a Server
-- Action) where they choose a name/slug — avoids guessing a unique slug here.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_account uuid;
begin
  insert into public.accounts (name)
  values (coalesce(
    nullif(new.raw_user_meta_data->>'cafe_name', ''),
    nullif(split_part(new.email, '@', 1), ''),
    'My café'))
  returning id into v_account;

  insert into public.cafe_members (account_id, user_id, role, cafe_id)
  values (v_account, new.id, 'owner', null);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- >>> 20260629000006_studio_save.sql ========================================
-- ============================================================================
-- Mesa — Studio save: transactional menu replace
-- Saving the menu touches categories + items + option groups/choices + tag links
-- across several tables. Doing that as separate client requests risks a partial
-- write, so it's one SECURITY DEFINER function that replaces the café's menu
-- atomically. Authorization is checked INSIDE via can_manage_cafe(auth.uid()),
-- so only an owner/manager of this café (or a platform admin) can run it.
--
-- Brand kit, café profile, and promos are single-table writes done directly from
-- Server Actions under RLS (no function needed).
--
-- p_categories : jsonb array of category names, in display order (no "All").
-- p_items      : jsonb array of
--   { name, price, descr, img, badge, sold_out, best, cat,
--     options:[ {label,required,multi, choices:[{label,price_delta}]} ],
--     tags:[ {key,label,emoji} ] }
-- ============================================================================

create or replace function public.save_cafe_menu(
  p_cafe_id    uuid,
  p_categories jsonb,
  p_items      jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  cat_map  jsonb := '{}'::jsonb;
  v_cat    text;
  v_cat_id uuid;
  v_item   jsonb;
  v_grp    jsonb;
  v_choice jsonb;
  v_tag    jsonb;
  v_item_id uuid;
  v_grp_id  uuid;
  v_tag_id  uuid;
  v_pos int := 0;
  v_i   int := 0;
  v_gi  int := 0;
  v_ci  int := 0;
begin
  if not public.can_manage_cafe(p_cafe_id) then
    raise exception 'not authorized to edit this cafe';
  end if;

  -- Wipe current menu (cascades option groups/choices + tag links).
  delete from public.menu_items where cafe_id = p_cafe_id;
  delete from public.categories where cafe_id = p_cafe_id;

  -- Categories in order → name→id map for item linking.
  for v_cat in select value from jsonb_array_elements_text(p_categories) loop
    insert into public.categories (cafe_id, name, position)
      values (p_cafe_id, v_cat, v_pos) returning id into v_cat_id;
    cat_map := jsonb_set(cat_map, array[v_cat], to_jsonb(v_cat_id::text));
    v_pos := v_pos + 1;
  end loop;

  -- Upsert every tag referenced by an item, so custom tags persist.
  for v_item in select value from jsonb_array_elements(p_items) loop
    for v_tag in select value from jsonb_array_elements(coalesce(v_item->'tags', '[]'::jsonb)) loop
      insert into public.menu_tags (cafe_id, key, label, emoji, is_preset)
        values (p_cafe_id, v_tag->>'key', v_tag->>'label', v_tag->>'emoji', false)
        on conflict (cafe_id, key) do update
          set label = excluded.label, emoji = excluded.emoji;
    end loop;
  end loop;

  -- Items, in array order, with nested options/choices and tag links.
  v_i := 0;
  for v_item in select value from jsonb_array_elements(p_items) loop
    insert into public.menu_items
      (cafe_id, category_id, name, price, descr, img, badge, sold_out, best, position)
    values (
      p_cafe_id,
      nullif(cat_map->>(v_item->>'cat'), '')::uuid,
      coalesce(v_item->>'name', ''),
      coalesce((v_item->>'price')::int, 0),
      coalesce(v_item->>'descr', ''),
      nullif(v_item->>'img', ''),
      nullif(v_item->>'badge', ''),
      coalesce((v_item->>'sold_out')::boolean, false),
      coalesce((v_item->>'best')::boolean, false),
      v_i
    ) returning id into v_item_id;

    v_gi := 0;
    for v_grp in select value from jsonb_array_elements(coalesce(v_item->'options', '[]'::jsonb)) loop
      insert into public.option_groups (menu_item_id, cafe_id, label, required, multi, position)
        values (v_item_id, p_cafe_id, v_grp->>'label',
                coalesce((v_grp->>'required')::boolean, false),
                coalesce((v_grp->>'multi')::boolean, false), v_gi)
        returning id into v_grp_id;
      v_ci := 0;
      for v_choice in select value from jsonb_array_elements(coalesce(v_grp->'choices', '[]'::jsonb)) loop
        insert into public.option_choices (option_group_id, cafe_id, label, price_delta, position)
          values (v_grp_id, p_cafe_id, v_choice->>'label',
                  coalesce((v_choice->>'price_delta')::int, 0), v_ci);
        v_ci := v_ci + 1;
      end loop;
      v_gi := v_gi + 1;
    end loop;

    for v_tag in select value from jsonb_array_elements(coalesce(v_item->'tags', '[]'::jsonb)) loop
      select id into v_tag_id from public.menu_tags
        where cafe_id = p_cafe_id and key = v_tag->>'key';
      if v_tag_id is not null then
        insert into public.menu_item_tags (menu_item_id, tag_id)
          values (v_item_id, v_tag_id) on conflict do nothing;
      end if;
    end loop;

    v_i := v_i + 1;
  end loop;
end;
$$;

revoke all on function public.save_cafe_menu(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_cafe_menu(uuid, jsonb, jsonb) to authenticated;


-- >>> 20260629000007_storage.sql ========================================
-- ============================================================================
-- Mesa — Storage for café images (logos, covers, menu-item photos)
-- One public-read bucket. Objects are foldered by café id: <cafe_id>/<kind>/<file>.
-- Write/update/delete is allowed only to a manager of that café (path's first
-- segment must be a café they can manage); everyone can read (public menus).
-- This replaces storing data-URL images in table columns.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('cafe-public', 'cafe-public', true)
on conflict (id) do nothing;

-- Public read of anything in the bucket.
create policy "cafe-public read"
  on storage.objects for select
  using (bucket_id = 'cafe-public');

-- Manager-only writes, scoped to their café's folder (first path segment = cafe_id).
create policy "cafe-public insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'cafe-public'
    and public.can_manage_cafe((storage.foldername(name))[1]::uuid)
  );

create policy "cafe-public update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'cafe-public'
    and public.can_manage_cafe((storage.foldername(name))[1]::uuid)
  );

create policy "cafe-public delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'cafe-public'
    and public.can_manage_cafe((storage.foldername(name))[1]::uuid)
  );


-- >>> 20260629000008_beta_plan.sql ========================================
-- ============================================================================
-- Mesa — tier chosen at registration (beta, no payment)
-- The owner picks their plan during onboarding. set_account_plan applies it,
-- but ONLY before the account has any café — i.e. only at first registration.
-- After that an owner cannot change their own tier (no self-service switching);
-- changing it is an admin/billing action. When PayMongo (Phase 7) lands, the
-- plan should move only via the verified payment webhook.
-- ============================================================================

create or replace function public.set_account_plan(p_plan plan_id)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_account uuid;
begin
  select account_id into v_account
  from public.cafe_members
  where user_id = auth.uid() and role = 'owner'
  limit 1;

  if v_account is null then
    raise exception 'no owner account for current user';
  end if;

  -- Registration-only: once a café exists, the tier is locked to the owner.
  if exists (select 1 from public.cafes where account_id = v_account) then
    raise exception 'tier can only be chosen at registration';
  end if;

  update public.accounts
  set plan = p_plan, updated_at = now()
  where id = v_account;
end;
$$;

revoke all on function public.set_account_plan(plan_id) from public, anon;
grant execute on function public.set_account_plan(plan_id) to authenticated;



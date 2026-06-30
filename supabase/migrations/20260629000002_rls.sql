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

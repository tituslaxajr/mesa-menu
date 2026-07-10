-- Promo discounts — promos graduate from display-only banners to real price
-- rules. A promo may carry a discount (percent or fixed ₱), target the whole
-- menu / named categories / named items, and run on a schedule (days of week,
-- a daily time window, a date range) evaluated in Asia/Manila. Banner-only
-- promos (discount_type = 'none') behave exactly as before.
--
-- Targeting keys on NAMES, not ids: save_cafe_menu wipes and reinserts items
-- and categories on every menu save, so names are the only stable key — the
-- same convention order_lines and sales analytics already use.

alter table public.promos
  add column discount_type     text not null default 'none'
    check (discount_type in ('none','percent','fixed')),
  add column discount_value    integer not null default 0,
  add column applies_to        text not null default 'all'
    check (applies_to in ('all','categories','items')),
  add column target_categories text[] not null default '{}',
  add column target_items      text[] not null default '{}',
  -- Schedule (all Manila wall-clock). Null = no constraint on that axis;
  -- everything null = the manual `active` switch alone decides.
  add column days_of_week      int[],   -- 0=Sun .. 6=Sat
  add column start_min         int,     -- minutes since midnight, inclusive
  add column end_min           int,     -- exclusive
  add column start_date        date,    -- inclusive
  add column end_date          date;    -- inclusive

alter table public.promos
  add constraint promos_discount_value_range check (
    discount_value >= 0
    and (discount_type <> 'percent' or discount_value <= 100)
  );

-- Order snapshot: what the guest actually saved, frozen at order time (promos
-- churn — never join back to them). orig_price on a line = the pre-discount
-- unit price; null means no discount applied. `price` stays the EFFECTIVE
-- unit price so every existing total/analytics path keeps working untouched.
alter table public.orders
  add column discount_total integer not null default 0,
  add column promo_titles   text[] not null default '{}';

alter table public.order_lines
  add column orig_price integer;

-- place_order learns discounts without changing its signature: each line may
-- now carry `orig_price` (pre-discount unit ₱) and `promo` (title). The
-- function aggregates discount_total / promo_titles itself. The server action
-- recomputes authoritative prices before calling; the total is still summed
-- here from line prices, never trusted from the client as a lump figure.
create or replace function public.place_order(
  p_slug        text,
  p_table       text,
  p_note        text,
  p_channel     order_channel,
  p_guest_token uuid,
  p_lines       jsonb
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_cafe     public.cafes;
  v_plan     plan_id;
  v_total    int;
  v_discount int;
  v_promos   text[];
  v_order    public.orders;
  v_code     text;
  v_tries    int := 0;
  v_line     jsonb;
  v_pos      int := 0;
begin
  select * into v_cafe from public.cafes where slug = p_slug and published = true;
  if not found then
    raise exception 'cafe not found or not published';
  end if;

  if not v_cafe.accepting_orders then
    raise exception 'cafe is not accepting orders';
  end if;

  if p_channel = 'counter' and not v_cafe.record_sales then
    raise exception 'cafe does not record counter orders';
  end if;

  select plan into v_plan from public.accounts where id = v_cafe.account_id;
  if v_plan = 'starter' then
    raise exception 'ordering is not enabled for this plan';
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'order has no lines';
  end if;

  -- Rate limit: a small café never sees 20 orders/minute; a script does.
  if (select count(*) from public.orders
      where cafe_id = v_cafe.id and placed_at > now() - interval '1 minute') >= 20 then
    raise exception 'too many orders — try again in a moment';
  end if;

  -- Recompute totals server-side — never trust a client-supplied total.
  -- Effective total from line prices; savings from orig_price where present.
  select
    coalesce(sum((l->>'price')::int * (l->>'qty')::int), 0),
    coalesce(sum(
      (coalesce(nullif(l->>'orig_price', '')::int, (l->>'price')::int)
        - (l->>'price')::int) * (l->>'qty')::int), 0)
    into v_total, v_discount
  from jsonb_array_elements(p_lines) l;

  if v_discount < 0 then
    raise exception 'invalid discount';
  end if;

  select coalesce(array_agg(distinct l->>'promo'), '{}')
    into v_promos
  from jsonb_array_elements(p_lines) l
  where coalesce(l->>'promo', '') <> '';

  loop
    v_tries := v_tries + 1;
    v_code := public.gen_order_code(v_cafe.id);
    begin
      insert into public.orders (cafe_id, code, table_label, note, channel,
                                 guest_token, total, discount_total, promo_titles,
                                 status, expires_at)
      values (
        v_cafe.id, v_code, nullif(p_table, ''), nullif(p_note, ''), p_channel,
        p_guest_token, v_total, v_discount, v_promos,
        case when p_channel = 'counter' then 'pending'::order_status
             else 'new'::order_status end,
        case when p_channel = 'counter' then now() + interval '60 minutes'
             else null end
      )
      returning * into v_order;
      exit;
    exception when unique_violation then
      if v_tries >= 10 then raise exception 'could not allocate order code'; end if;
    end;
  end loop;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    insert into public.order_lines (order_id, cafe_id, name, price, qty, options,
                                    orig_price, position)
    values (
      v_order.id, v_cafe.id,
      v_line->>'name', (v_line->>'price')::int, (v_line->>'qty')::int,
      coalesce(array(select jsonb_array_elements_text(v_line->'options')), '{}'),
      nullif(v_line->>'orig_price', '')::int,
      v_pos
    );
    v_pos := v_pos + 1;
  end loop;

  return public.order_to_json(v_order.id);
end;
$$;

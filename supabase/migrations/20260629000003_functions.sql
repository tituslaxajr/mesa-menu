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

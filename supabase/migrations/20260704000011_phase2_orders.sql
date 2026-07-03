-- Phase 2 — "Record sales with Mesa": guest submits an order as PENDING with
-- a short code; staff taps the matching code at the counter to CONFIRM it →
-- only then is it a recorded sale. Unconfirmed orders lazily expire (reads
-- ignore them past expires_at) and never count. The confirm gate is also the
-- anti-abuse answer: anyone can submit, only staff confirmation records.

-- 1. New order state + expiry.
alter type order_status add value if not exists 'pending' before 'new';

alter table public.orders
  add column if not exists expires_at timestamptz;

-- 2. Per-café opt-in switch (Phase 1 cafés keep the show-at-counter summary).
alter table public.cafes
  add column if not exists record_sales boolean not null default false;

-- 3. Expose the switch (and keep 0010's hours) on the public projection so
--    the diner menu knows whether to offer "Send to counter".
create or replace view public.cafe_public as
  select c.id, c.account_id, c.slug, c.name, c.tagline, c.intro, c.hours,
         c.cover, c.theme, c.order_mode, c.accepting_orders, c.position,
         a.plan, a.plan_status,
         c.open_min, c.close_min,
         c.record_sales
  from public.cafes c
  join public.accounts a on a.id = c.account_id
  where c.published = true;

-- 4. place_order learns the Phase 2 lifecycle:
--    * counter + record_sales ON  → status 'pending', expires in 60 minutes
--      (a recorded sale only after staff confirms).
--    * counter + record_sales OFF → rejected: Phase 1 cafés keep the local
--      show-at-counter summary; nothing is recorded (sales integrity).
--    * kitchen orders unchanged (still gated by plan; used when the live
--      board ships).
--    Also adds a per-café rate limit — anti-abuse floor under the confirm gate.
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

  -- Recompute the total server-side — never trust a client-supplied total.
  select coalesce(sum((l->>'price')::int * (l->>'qty')::int), 0)
    into v_total
  from jsonb_array_elements(p_lines) l;

  loop
    v_tries := v_tries + 1;
    v_code := public.gen_order_code(v_cafe.id);
    begin
      insert into public.orders (cafe_id, code, table_label, note, channel,
                                 guest_token, total, status, expires_at)
      values (
        v_cafe.id, v_code, nullif(p_table, ''), nullif(p_note, ''), p_channel,
        p_guest_token, v_total,
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
    insert into public.order_lines (order_id, cafe_id, name, price, qty, options, position)
    values (
      v_order.id, v_cafe.id,
      v_line->>'name', (v_line->>'price')::int, (v_line->>'qty')::int,
      coalesce(array(select jsonb_array_elements_text(v_line->'options')), '{}'),
      v_pos
    );
    v_pos := v_pos + 1;
  end loop;

  return public.order_to_json(v_order.id);
end;
$$;

-- 5. confirm_order — the gate. Staff taps the guest's code; only then is the
--    order a recorded sale. Members only; pending + unexpired only.
create or replace function public.confirm_order(p_order_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'order not found';
  end if;
  if not public.is_member_of_cafe(v_order.cafe_id) then
    raise exception 'not allowed';
  end if;
  if v_order.status <> 'pending' then
    raise exception 'order is not pending';
  end if;
  if v_order.expires_at is not null and v_order.expires_at < now() then
    raise exception 'order expired';
  end if;

  update public.orders
     set status = 'completed', completed_at = now()
   where id = p_order_id
   returning * into v_order;

  return public.order_to_json(v_order.id);
end;
$$;

grant execute on function public.confirm_order(uuid) to authenticated;

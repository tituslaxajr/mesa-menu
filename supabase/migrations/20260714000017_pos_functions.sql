-- ============================================================================
-- Mesa POS — RPCs (SECURITY DEFINER, the secure analog of the client stores).
--   pos_open_shift()   : staff opens the cash drawer (one open shift per café)
--   pos_close_shift()  : count the drawer → expected/over-short (Z reading)
--   pos_record_sale()  : record a staff-rung, cash/manual-tendered sale
-- All gate on café membership + (for sales) brew/roast plan AND pos_enabled,
-- re-checked here so the client gate can't be bypassed. Line prices arrive
-- already re-priced by the pos-actions server layer (which owns menu/promo
-- math, exactly like submitCounterOrder → place_order); totals/VAT/change are
-- recomputed here so the DB, not the client, is authoritative.
-- ============================================================================

-- ---- order_to_json — extended with the POS tender/tax/cashier fields -------
-- Superset of 0003's shape; guest orders simply carry nulls for the POS keys.
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
    'tenderType',     o.tender_type,
    'tenderLabel',    o.tender_label,
    'amountTendered', o.amount_tendered,
    'changeDue',      o.change_due,
    'netAmount',      o.net_amount,
    'vatAmount',      o.vat_amount,
    'serviceCharge',  o.service_charge,
    'cashierId',      o.cashier_id,
    'shiftId',        o.shift_id,
    'paidAt',      case when o.paid_at is null then null
                        else (extract(epoch from o.paid_at) * 1000)::bigint end,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'name', l.name, 'price', l.price,
               'qty', l.qty, 'options', to_jsonb(l.options))
             order by l.position)
      from public.order_lines l where l.order_id = o.id), '[]'::jsonb)
  );
$$;

-- ---- shift → JSON ----------------------------------------------------------
create or replace function public.shift_to_json(s public.shifts)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id',            s.id,
    'cafeId',        s.cafe_id,
    'openedBy',      s.opened_by,
    'openedAt',      (extract(epoch from s.opened_at) * 1000)::bigint,
    'startingFloat', s.starting_float,
    'closedAt',      case when s.closed_at is null then null
                          else (extract(epoch from s.closed_at) * 1000)::bigint end,
    'countedCash',   s.counted_cash,
    'expectedCash',  s.expected_cash,
    'overShort',     s.over_short,
    'note',          s.note,
    'status',        s.status
  );
$$;

-- Shared gate: café must be on an ordering plan AND have POS switched on.
create or replace function public.pos_enabled_for(p_cafe_id uuid)
returns void language plpgsql stable security definer set search_path = public as $$
declare
  v_cafe public.cafes;
  v_plan plan_id;
begin
  select * into v_cafe from public.cafes where id = p_cafe_id;
  if not found then raise exception 'cafe not found'; end if;
  if not public.is_member_of_cafe(p_cafe_id) then raise exception 'not allowed'; end if;
  if not v_cafe.pos_enabled then raise exception 'POS is not enabled for this cafe'; end if;
  select plan into v_plan from public.accounts where id = v_cafe.account_id;
  if v_plan not in ('brew', 'roast') then
    raise exception 'POS is not available on this plan';
  end if;
end;
$$;

-- ---- pos_open_shift --------------------------------------------------------
create or replace function public.pos_open_shift(p_cafe_id uuid, p_float integer)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_shift public.shifts;
begin
  perform public.pos_enabled_for(p_cafe_id);
  if exists (select 1 from public.shifts where cafe_id = p_cafe_id and status = 'open') then
    raise exception 'a drawer is already open for this cafe';
  end if;
  insert into public.shifts (cafe_id, opened_by, starting_float)
  values (p_cafe_id, auth.uid(), greatest(0, coalesce(p_float, 0)))
  returning * into v_shift;
  return public.shift_to_json(v_shift);
end;
$$;

-- ---- pos_close_shift — count the drawer, compute expected + over/short -----
-- Expected cash = starting float + cash that landed in the drawer from POS
-- sales this shift. (Refund handling arrives with the Phase-C void/refund RPCs.)
create or replace function public.pos_close_shift(
  p_shift_id     uuid,
  p_counted_cash integer,
  p_note         text
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_shift    public.shifts;
  v_cash     integer;
  v_expected integer;
begin
  select * into v_shift from public.shifts where id = p_shift_id;
  if not found then raise exception 'shift not found'; end if;
  if not public.is_member_of_cafe(v_shift.cafe_id) then raise exception 'not allowed'; end if;
  if v_shift.status <> 'open' then raise exception 'shift is not open'; end if;

  select coalesce(sum(total), 0) into v_cash
  from public.orders
  where shift_id = p_shift_id and channel = 'pos'
    and status = 'completed' and tender_type = 'cash';

  v_expected := v_shift.starting_float + v_cash;

  update public.shifts
     set status        = 'closed',
         closed_by     = auth.uid(),
         closed_at     = now(),
         counted_cash  = p_counted_cash,
         expected_cash = v_expected,
         over_short    = coalesce(p_counted_cash, 0) - v_expected,
         note          = nullif(p_note, '')
   where id = p_shift_id
   returning * into v_shift;

  return public.shift_to_json(v_shift);
end;
$$;

-- ---- pos_record_sale — the till. Records a completed, tendered POS order ----
-- p_lines: [{ name, price, qty, options[] }] already re-priced by pos-actions.
create or replace function public.pos_record_sale(
  p_cafe_id             uuid,
  p_shift_id            uuid,
  p_lines               jsonb,
  p_tender_type         text,
  p_tender_label        text,
  p_amount_tendered     integer,
  p_service_charge_rate integer
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_subtotal int;
  v_service  int;
  v_total    int;
  v_net      int;
  v_vat      int;
  v_change   int;
  v_order    public.orders;
  v_code     text;
  v_tries    int := 0;
  v_line     jsonb;
  v_pos      int := 0;
begin
  perform public.pos_enabled_for(p_cafe_id);

  if not exists (select 1 from public.shifts
                 where id = p_shift_id and cafe_id = p_cafe_id and status = 'open') then
    raise exception 'no open drawer — open a shift first';
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'ticket has no items';
  end if;

  -- Authoritative money math (server-priced lines in, totals recomputed here).
  select coalesce(sum((l->>'price')::int * (l->>'qty')::int), 0)
    into v_subtotal
  from jsonb_array_elements(p_lines) l;

  v_service := round(v_subtotal * greatest(0, coalesce(p_service_charge_rate, 0)) / 100.0);
  v_total   := v_subtotal + v_service;
  -- PH prices are VAT-inclusive at 12%; VAT is the portion of GOODS only.
  v_net     := round(v_subtotal / 1.12);
  v_vat     := v_subtotal - v_net;
  v_change  := case when p_tender_type = 'cash'
                    then greatest(0, coalesce(p_amount_tendered, 0) - v_total)
                    else 0 end;

  loop
    v_tries := v_tries + 1;
    v_code := public.gen_order_code(p_cafe_id);
    begin
      insert into public.orders (
        cafe_id, code, total, status, channel, completed_at,
        shift_id, cashier_id, tender_type, tender_label,
        amount_tendered, change_due, paid_at,
        net_amount, vat_amount, service_charge
      ) values (
        p_cafe_id, v_code, v_total, 'completed'::order_status, 'pos'::order_channel, now(),
        p_shift_id, auth.uid(), p_tender_type, nullif(p_tender_label, ''),
        p_amount_tendered, v_change, now(),
        v_net, v_vat, v_service
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
      v_order.id, p_cafe_id,
      v_line->>'name', (v_line->>'price')::int, (v_line->>'qty')::int,
      coalesce((select array(select jsonb_array_elements_text(v_line->'options'))), '{}'),
      v_pos
    );
    v_pos := v_pos + 1;
  end loop;

  return public.order_to_json(v_order);
end;
$$;

-- Staff/manager/owner (authenticated members) only — never anon.
revoke all on function public.pos_open_shift(uuid, integer) from public, anon;
revoke all on function public.pos_close_shift(uuid, integer, text) from public, anon;
revoke all on function public.pos_record_sale(uuid, uuid, jsonb, text, text, integer, integer) from public, anon;
grant execute on function public.pos_open_shift(uuid, integer) to authenticated;
grant execute on function public.pos_close_shift(uuid, integer, text) to authenticated;
grant execute on function public.pos_record_sale(uuid, uuid, jsonb, text, text, integer, integer) to authenticated;

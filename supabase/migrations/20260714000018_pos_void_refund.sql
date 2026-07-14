-- ============================================================================
-- Mesa POS — Phase C: void & refund, manager/owner only, with an audit trail.
--   void   = a mistake on a just-rung ticket   → order status 'cancelled'
--   refund = a completed sale that was returned → order status 'refunded'
-- Both write a sale_adjustments row (who / when / why) and drop the sale out of
-- revenue (sales.isSale already excludes cancelled + refunded). Gated on
-- can_manage_cafe (owner/manager) — staff can ring sales but not reverse them.
--
-- Cash-drawer note: pos_close_shift sums cash from status='completed' sales, so
-- a voided/refunded sale (no longer 'completed') automatically nets to zero in
-- the expected-cash math — the cashier physically returns the cash. No change
-- to pos_close_shift is needed.
-- ============================================================================

create or replace function public.pos_adjust_sale(
  p_order_id uuid,
  p_kind     text,          -- 'void' | 'refund'
  p_reason   text
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_order    public.orders;
  v_newstat  order_status;
begin
  if p_kind not in ('void', 'refund') then
    raise exception 'invalid adjustment kind';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'sale not found'; end if;

  -- Manager/owner only (staff cannot reverse a sale).
  if not public.can_manage_cafe(v_order.cafe_id) then
    raise exception 'only a manager or owner can void or refund a sale';
  end if;

  if v_order.channel <> 'pos' then
    raise exception 'not a POS sale';
  end if;
  if v_order.status <> 'completed' then
    raise exception 'only a completed sale can be % ed', p_kind;
  end if;

  v_newstat := case when p_kind = 'void' then 'cancelled'::order_status
                    else 'refunded'::order_status end;

  update public.orders
     set status = v_newstat
   where id = p_order_id
   returning * into v_order;

  insert into public.sale_adjustments (cafe_id, order_id, shift_id, kind, amount, reason, created_by)
  values (v_order.cafe_id, v_order.id, v_order.shift_id, p_kind, v_order.total,
          nullif(p_reason, ''), auth.uid());

  return public.order_to_json(v_order);
end;
$$;

revoke all on function public.pos_adjust_sale(uuid, text, text) from public, anon;
grant execute on function public.pos_adjust_sale(uuid, text, text) to authenticated;

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

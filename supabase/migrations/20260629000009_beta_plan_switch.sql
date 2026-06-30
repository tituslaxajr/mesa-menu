-- ============================================================================
-- Mesa — BETA: let owners switch tiers freely (no payment)
-- Supersedes the registration-only guard from migration 0008 so beta testers
-- can flip between tiers and try each one's feature gating. Still owner-scoped
-- (only changes the caller's own account).
-- LOCK THIS DOWN when real billing (PayMongo, Phase 7) lands: the plan must then
-- move only via the verified payment webhook, not a client-callable RPC.
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

  update public.accounts
  set plan = p_plan, updated_at = now()
  where id = v_account;
end;
$$;

revoke all on function public.set_account_plan(plan_id) from public, anon;
grant execute on function public.set_account_plan(plan_id) to authenticated;

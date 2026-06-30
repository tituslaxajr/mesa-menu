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

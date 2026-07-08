-- ============================================================================
-- Mesa — beta access gate
-- During closed beta, nobody should be able to just sign up on their own. A
-- café applies via `beta_requests` (public insert, no auth.users row yet); a
-- platform admin reviews it from /admin/requests; only once approved can that
-- email complete a real Supabase Auth signup. Enforced at the DB level via a
-- BEFORE INSERT trigger on auth.users, so it can't be bypassed by calling
-- Supabase Auth directly instead of going through the app.
--
-- Idempotent: safe to run more than once (guarded type, IF NOT EXISTS tables/
-- indexes, DROP-then-CREATE policies/trigger, CREATE OR REPLACE functions).
-- ============================================================================

do $$ begin
  create type beta_request_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

-- ---- beta_requests — one row per café that asks for beta access ------------
create table if not exists public.beta_requests (
  id           uuid primary key default gen_random_uuid(),
  cafe_name    text not null,
  contact_name text not null,
  email        text not null,
  phone        text,
  message      text,
  status       beta_request_status not null default 'pending',
  reviewed_by  uuid references auth.users(id),
  reviewed_at  timestamptz,
  used_at      timestamptz,            -- set once this approval is consumed by a real signup
  created_at   timestamptz not null default now(),
  constraint beta_requests_email_format check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);
create index if not exists beta_requests_status_idx on public.beta_requests(status);
create index if not exists beta_requests_email_idx  on public.beta_requests(lower(email));

-- At most one "live" request per email: pending, or approved-but-unused.
-- Rejected (or approved+used) rows don't count, so re-applying after a
-- rejection just works with no cleanup needed.
create unique index if not exists beta_requests_email_live_uniq
  on public.beta_requests (lower(email))
  where status = 'pending' or (status = 'approved' and used_at is null);

alter table public.beta_requests enable row level security;

-- Public request form — anyone (incl. anon) can insert; no client read-back.
drop policy if exists beta_requests_public_insert on public.beta_requests;
create policy beta_requests_public_insert on public.beta_requests
  for insert to anon, authenticated with check (true);

-- Only platform admins can list/review. All status changes go through the
-- SECURITY DEFINER RPCs below — no client UPDATE policy at all, mirroring
-- feedback_threads (writes only via definer RPCs).
drop policy if exists beta_requests_admin_select on public.beta_requests;
create policy beta_requests_admin_select on public.beta_requests
  for select to authenticated using (public.is_platform_admin());

-- ---- is_beta_approved — narrow, non-PII existence check for the signup -----
-- Server Action's UX pre-check. SECURITY DEFINER so anon can call it despite
-- the admin-only SELECT policy above; leaks nothing but a boolean.
create or replace function public.is_beta_approved(p_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.beta_requests
    where lower(email) = lower(p_email) and status = 'approved' and used_at is null
  );
$$;
grant execute on function public.is_beta_approved(text) to anon, authenticated;

-- ---- approve / reject — admin-only, reversible until the approval is used --
-- (deliberately not restricted to status = 'pending' — lets an admin flip
-- pending<->approved<->rejected freely right up until someone actually signs up)
create or replace function public.approve_beta_request(p_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed'; end if;
  update public.beta_requests
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_id and used_at is null;
  if not found then raise exception 'request not found or already used'; end if;
end;
$$;

create or replace function public.reject_beta_request(p_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed'; end if;
  update public.beta_requests
     set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_id and used_at is null;
  if not found then raise exception 'request not found or already used'; end if;
end;
$$;

grant execute on function public.approve_beta_request(uuid) to authenticated;
grant execute on function public.reject_beta_request(uuid)  to authenticated;

-- ---- the real gate: BEFORE INSERT on auth.users ----------------------------
-- Postgres fires all BEFORE triggers before any AFTER trigger for the same
-- row event, so this always runs ahead of on_auth_user_created (0005_auth.sql,
-- AFTER INSERT). If no approved + unused request matches, raising here rolls
-- back the whole INSERT, so on_auth_user_created never runs and no
-- accounts/cafe_members row is created. Fires only on INSERT, so every
-- pre-existing auth.users row (the real beta cafés already signed up) is
-- untouched.
create or replace function public.check_beta_approval()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.beta_requests
  where lower(email) = lower(new.email) and status = 'approved' and used_at is null
  order by created_at desc
  limit 1
  for update;

  if v_id is null then
    raise exception 'beta access required for %', new.email using errcode = 'P0001';
  end if;

  update public.beta_requests set used_at = now() where id = v_id;
  return new;
end;
$$;

drop trigger if exists on_beta_gate_before_insert on auth.users;
create trigger on_beta_gate_before_insert
  before insert on auth.users
  for each row execute function public.check_beta_approval();

-- ---- bootstrap: pre-approve the platform admin's own signup ----------------
-- Lets tituslaxajr@cortanatechsolutions.com pass the same gate as everyone
-- else — no app-code special-casing. See supabase/README.md "Roles" for the
-- full sequence (migrate -> sign up -> manually insert into platform_admins).
insert into public.beta_requests (cafe_name, contact_name, email, message, status)
select 'Mesa (platform admin)', 'Titus Laxa Jr.', 'tituslaxajr@cortanatechsolutions.com',
       'Bootstrap seed row — platform admin account.', 'approved'
where not exists (
  select 1 from public.beta_requests
  where lower(email) = lower('tituslaxajr@cortanatechsolutions.com')
);

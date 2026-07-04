-- ============================================================================
-- Mesa — feedback / support messaging (two-way: café team ↔ platform admin)
-- Café members open topic threads and message from the dashboard; platform
-- admins read every thread and reply from /admin/feedback. Writes go through
-- SECURITY DEFINER RPCs (sender role decided server-side, never trusted from
-- the client), mirroring place_order/confirm_order. Reads are RLS-scoped.
--
-- Idempotent: safe to run more than once (guarded type, IF NOT EXISTS tables/
-- indexes, DROP-then-CREATE policies, CREATE OR REPLACE functions/view).
-- ============================================================================

do $$ begin
  create type feedback_status as enum ('open', 'closed');
exception when duplicate_object then null;
end $$;

-- ---- feedback_threads — one topic/ticket per café account ------------------
create table if not exists public.feedback_threads (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references public.accounts(id) on delete cascade,
  cafe_id          uuid references public.cafes(id) on delete set null, -- context only
  subject          text not null,
  status           feedback_status not null default 'open',
  created_by       uuid not null references auth.users(id),
  last_message_at  timestamptz not null default now(),
  last_sender_role text not null default 'owner',   -- 'owner' | 'admin'
  owner_read_at    timestamptz,                      -- café side last read
  admin_read_at    timestamptz,                      -- platform admin last read
  created_at       timestamptz not null default now()
);
create index if not exists feedback_threads_account_idx on public.feedback_threads(account_id);
create index if not exists feedback_threads_activity_idx on public.feedback_threads(last_message_at desc);

-- ---- feedback_messages — account_id denormalized for single-predicate RLS --
create table if not exists public.feedback_messages (
  id             uuid primary key default gen_random_uuid(),
  thread_id      uuid not null references public.feedback_threads(id) on delete cascade,
  account_id     uuid not null references public.accounts(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id),
  sender_role    text not null,                      -- 'owner' | 'admin'
  body           text not null,
  created_at     timestamptz not null default now()
);
create index if not exists feedback_messages_thread_idx on public.feedback_messages(thread_id, created_at);

-- ---- RLS: read only (all writes go through the definer RPCs below) ----------
alter table public.feedback_threads  enable row level security;
alter table public.feedback_messages enable row level security;

-- Feedback is meant to be read by the operator, so admin access is EXPLICIT
-- here — the deliberate exception to the "admins stay out of tenant helpers"
-- note in 0001_schema.sql.
drop policy if exists feedback_threads_select on public.feedback_threads;
create policy feedback_threads_select on public.feedback_threads
  for select to authenticated
  using (public.is_member_of_account(account_id) or public.is_platform_admin());

drop policy if exists feedback_messages_select on public.feedback_messages;
create policy feedback_messages_select on public.feedback_messages
  for select to authenticated
  using (public.is_member_of_account(account_id) or public.is_platform_admin());

-- ---- open_feedback_thread — café member starts a topic ---------------------
create or replace function public.open_feedback_thread(p_subject text, p_body text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  v_account uuid;
  v_cafe    uuid;
  v_thread  uuid;
  v_subject text := nullif(btrim(p_subject), '');
  v_body    text := nullif(btrim(p_body), '');
begin
  if v_subject is null then raise exception 'subject is required'; end if;
  if v_body    is null then raise exception 'message is required'; end if;

  -- Resolve the caller's account (any member role) — reject non-members.
  select account_id into v_account
  from public.cafe_members
  where user_id = auth.uid()
  limit 1;
  if v_account is null then raise exception 'not a café member'; end if;

  -- First café in the account is the thread's context (nice-to-have label).
  select id into v_cafe from public.cafes
  where account_id = v_account order by position limit 1;

  insert into public.feedback_threads
    (account_id, cafe_id, subject, created_by, last_message_at, last_sender_role, owner_read_at)
  values
    (v_account, v_cafe, left(v_subject, 200), auth.uid(), now(), 'owner', now())
  returning id into v_thread;

  insert into public.feedback_messages
    (thread_id, account_id, sender_user_id, sender_role, body)
  values
    (v_thread, v_account, auth.uid(), 'owner', v_body);

  return v_thread;
end;
$$;

-- ---- post_feedback_message — either side adds to an existing thread --------
create or replace function public.post_feedback_message(p_thread_id uuid, p_body text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_thread public.feedback_threads;
  v_admin  boolean := public.is_platform_admin();
  v_role   text;
  v_body   text := nullif(btrim(p_body), '');
begin
  if v_body is null then raise exception 'message is required'; end if;

  select * into v_thread from public.feedback_threads where id = p_thread_id;
  if not found then raise exception 'thread not found'; end if;

  if v_admin then
    v_role := 'admin';
  elsif public.is_member_of_account(v_thread.account_id) then
    v_role := 'owner';
  else
    raise exception 'not allowed';
  end if;

  insert into public.feedback_messages
    (thread_id, account_id, sender_user_id, sender_role, body)
  values
    (p_thread_id, v_thread.account_id, auth.uid(), v_role, v_body);

  -- Bump activity + mark the sender's own side as read (they just wrote it).
  update public.feedback_threads
     set last_message_at  = now(),
         last_sender_role = v_role,
         admin_read_at = case when v_admin then now() else admin_read_at end,
         owner_read_at = case when v_admin then owner_read_at else now() end
   where id = p_thread_id;
end;
$$;

-- ---- mark_feedback_read — the viewing side clears its unread ---------------
create or replace function public.mark_feedback_read(p_thread_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_thread public.feedback_threads;
begin
  select * into v_thread from public.feedback_threads where id = p_thread_id;
  if not found then raise exception 'thread not found'; end if;

  if public.is_platform_admin() then
    update public.feedback_threads set admin_read_at = now() where id = p_thread_id;
  elsif public.is_member_of_account(v_thread.account_id) then
    update public.feedback_threads set owner_read_at = now() where id = p_thread_id;
  else
    raise exception 'not allowed';
  end if;
end;
$$;

-- ---- set_feedback_status — close / reopen (admin or account member) --------
create or replace function public.set_feedback_status(p_thread_id uuid, p_status feedback_status)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_thread public.feedback_threads;
begin
  select * into v_thread from public.feedback_threads where id = p_thread_id;
  if not found then raise exception 'thread not found'; end if;
  if not (public.is_platform_admin() or public.is_member_of_account(v_thread.account_id)) then
    raise exception 'not allowed';
  end if;
  update public.feedback_threads set status = p_status where id = p_thread_id;
end;
$$;

grant execute on function public.open_feedback_thread(text, text)          to authenticated;
grant execute on function public.post_feedback_message(uuid, text)         to authenticated;
grant execute on function public.mark_feedback_read(uuid)                  to authenticated;
grant execute on function public.set_feedback_status(uuid, feedback_status) to authenticated;

-- ---- admin_feedback_overview — the operator's inbox (definer view) ---------
-- Mirrors admin_cafe_overview: gated by is_platform_admin() so non-admins get
-- zero rows, and it joins in account/café names the admin can't otherwise read
-- (plain accounts/cafes RLS doesn't grant admins name access).
create or replace view public.admin_feedback_overview as
  select
    t.id               as thread_id,
    t.account_id,
    a.name             as account_name,
    t.cafe_id,
    c.name             as cafe_name,
    c.slug             as cafe_slug,
    t.subject,
    t.status,
    t.last_message_at,
    t.last_sender_role,
    t.admin_read_at,
    t.owner_read_at,
    t.created_at,
    (t.last_sender_role = 'owner'
       and (t.admin_read_at is null or t.admin_read_at < t.last_message_at)) as needs_reply,
    (select count(*) from public.feedback_messages m where m.thread_id = t.id) as message_count
  from public.feedback_threads t
  join public.accounts a on a.id = t.account_id
  left join public.cafes c on c.id = t.cafe_id
  where public.is_platform_admin();

grant select on public.admin_feedback_overview to authenticated;

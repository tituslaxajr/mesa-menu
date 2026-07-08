# Mesa — Supabase backend

Multi-tenant backend for Mesa. Tenant key = `account_id`; an account (billable
subscriber) owns 1..N cafés. Every tenant row carries `cafe_id`, and **Row-Level
Security is the real isolation boundary**.

## Migrations (run in order)

| File | What it does |
|------|--------------|
| `20260629000001_schema.sql` | Extensions, enums, tables, indexes, `updated_at` triggers, RLS helper functions, the `cafe_public` view |
| `20260629000002_rls.sql` | Enables RLS and all policies (public read of *published* cafés; owner writes scoped by membership) |
| `20260629000003_functions.sql` | `place_order`, `get_my_orders`, `get_order`, `gen_order_code`, `order_to_json`, `seed_preset_tags` |
| `20260629000004_seed.sql` | Idempotent demo seed: `demo` (Kape Kalye, Brew) + `demo-starter` (Tindahan Coffee, Starter) |

### How to run

**Option A — Supabase SQL editor (simplest):** open each file in order and run it.

**Option B — Supabase CLI:**
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## After migrating (you-click checklist)

1. **API keys** — Project Settings → API → copy URL + anon key + service-role key into `.env.local` and Vercel.
2. **Realtime** — Database → Replication → enable `orders` and `order_lines` (for the live order board, Phase 5).
3. **Storage** — create a public bucket `cafe-public` (for logos/cover/item images, Phase 6).
4. **Auth** — Authentication → Providers → enable Email; set Site URL to your deployment.
5. **PayMongo** — create test-mode Plans; point the webhook at `/api/paymongo/webhook` (Phase 7).

## Roles

Two independent axes — don't conflate them:

- **Platform admin (you, the operator)** — a row in `platform_admins`. **Least privilege by
  design:** an admin is *not* folded into the café-access helpers, so you have **no** ambient
  access to tenants' private data (orders, diner notes, team identities, PayMongo tokens). Your
  only standing cross-tenant access is the read-only, non-PII `admin_cafe_overview` view
  (plan/status, published/paused state, counts, last-order *time*). Anything deeper is an
  explicit, audited service-role operation (break-glass). Grant yourself admin after sign-up:
  ```sql
  insert into public.platform_admins (user_id)
  values ('<your-auth-user-id>');  -- Authentication → Users → copy the UUID
  ```
  Example — bootstrapping the first platform admin end-to-end (see
  `20260708000013_beta_gate.sql`, which seeds an approved `beta_requests` row so this
  email can pass the beta gate below):
  1. Run the migrations (includes the pre-approved seed row for
     `tituslaxajr@cortanatechsolutions.com`).
  2. Sign up at `/signup` with that email — the beta gate lets it through.
  3. Run in the SQL editor:
     ```sql
     insert into public.platform_admins (user_id)
     select id from auth.users where email = 'tituslaxajr@cortanatechsolutions.com';
     ```
- **Beta access gate** (`20260708000013_beta_gate.sql`) — while in closed beta, nobody can
  sign up unprompted. A café applies via the public `/request-access` form, which inserts a
  `beta_requests` row (no `auth.users` row yet). A platform admin approves/rejects it from
  `/admin/requests`. Only an approved, unused request lets that email complete a real signup —
  enforced by a `BEFORE INSERT ON auth.users` trigger, not just app code, so it can't be
  bypassed by calling Supabase Auth directly.
- **Café team** (`cafe_members.role`): `owner` (billing, team, create/delete locations) ›
  `manager` (menu, branding, categories, promos) › `staff` (work the live orders board).
  `cafe_members.cafe_id` is `null` for account-wide members (owners) or set to scope a
  manager/staffer to **one location**.
- **Diner** — anonymous, no login, no role. Public read + a client `guest_token`.

## Security notes

- `cafe_public` is an intentional *definer* view: it exposes only **published** cafés and only
  non-sensitive columns (no billing ids) to `anon`, plus the `plan` needed for read-path gating.
- Guests never read `orders` directly — inserts go through `place_order()` and reads through
  `get_my_orders()` / `get_order()`, all `SECURITY DEFINER` and scoped by `guest_token`.
- `place_order()` recomputes the order total server-side and never trusts a client total.

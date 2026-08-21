-- ═══════════════════════════════════════════════════════════════════════
-- PrintFlow 2.0 · Migration 001 — Workspaces and tenancy
-- Plan task 0.4
--
-- Multi-tenant from day one (decision Q2). Every business table hangs off
-- workspace_id, and every RLS policy anchors to app.user_workspace_ids().
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- Private helper schema. NOT exposed through PostgREST, so RLS helpers and
-- trigger functions are unreachable from the client.
create schema if not exists app;
revoke all on schema app from anon, authenticated;

-- ── Shared utilities ──────────────────────────────────────────────────
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── Workspaces ────────────────────────────────────────────────────────
create type workspace_role as enum ('owner', 'admin', 'member', 'viewer');

create table workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workspaces_touch
  before update on workspaces
  for each row execute function app.touch_updated_at();

create table workspace_members (
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         workspace_role not null default 'member',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on workspace_members (user_id);

-- ── The RLS anchor ────────────────────────────────────────────────────
-- SECURITY DEFINER so it can read workspace_members without tripping that
-- table's own RLS policy, which would otherwise recurse infinitely.
create or replace function app.user_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select workspace_id
  from workspace_members
  where user_id = auth.uid();
$$;

-- Convenience for single-workspace clients: the caller's default workspace.
create or replace function app.current_workspace()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select workspace_id
  from workspace_members
  where user_id = auth.uid()
  order by case role when 'owner' then 0 when 'admin' then 1 else 2 end,
           created_at
  limit 1;
$$;

-- Same SECURITY DEFINER reasoning, narrowed to roles that may administer a
-- workspace. Any policy needing this MUST go through here: reading
-- workspace_members directly from a policy on workspace_members recurses.
create or replace function app.user_admin_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select workspace_id
  from workspace_members
  where user_id = auth.uid()
    and role in ('owner', 'admin');
$$;

grant usage on schema app to authenticated;
grant execute on function app.user_workspace_ids() to authenticated;
grant execute on function app.current_workspace() to authenticated;
grant execute on function app.user_admin_workspace_ids() to authenticated;

-- ── Signup: every new user gets a workspace they own ──────────────────
-- Migration 005 replaces this to also seed the workspace's default config.
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ws_id uuid;
  ws_name text;
begin
  ws_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'workspace_name'), ''),
    'PrintFlow'
  );

  insert into workspaces (name) values (ws_name) returning id into ws_id;
  insert into workspace_members (workspace_id, user_id, role)
    values (ws_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

comment on function app.user_workspace_ids() is
  'Workspace ids the current user belongs to. SECURITY DEFINER to avoid RLS recursion. Every business-table policy anchors here.';

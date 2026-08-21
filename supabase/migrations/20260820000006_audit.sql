-- ═══════════════════════════════════════════════════════════════════════
-- PrintFlow 2.0 · Migration 006 — Audit trail and soft-delete convention
-- Plan task 0.9
--
-- Two things the current app has no answer for:
--   * "who changed this rate, and when" (plan §6.5, Settings change history)
--   * "I deleted that by mistake"       (DEFECT 7)
--
-- Migration 004 already made hard deletes impossible on business tables by
-- withholding the DELETE policy. This adds the record of what happened, and
-- normalises soft-delete so a deleted row is unambiguous.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function app.audit_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ws     uuid;
  rid    uuid;
  act    audit_action;
  before_j jsonb;
  after_j  jsonb;
begin
  if tg_op = 'INSERT' then
    act := 'insert'; before_j := null; after_j := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    act := 'update'; before_j := to_jsonb(old); after_j := to_jsonb(new);
    -- Nothing actually changed: don't write a row.
    if before_j = after_j then
      return new;
    end if;
  else
    act := 'delete'; before_j := to_jsonb(old); after_j := null;
  end if;

  rid := coalesce(after_j, before_j) ->> 'id';

  -- The workspaces table has no workspace_id column: its own id IS the
  -- scope. Without this, workspace audit rows get a NULL workspace_id and
  -- become invisible to every RLS policy, including their own members'.
  if tg_table_name = 'workspaces' then
    ws := rid;
  else
    ws := coalesce(after_j, before_j) ->> 'workspace_id';
  end if;

  insert into audit_log (workspace_id, table_name, row_id, action, before, after, actor)
  values (ws, tg_table_name, rid, act, before_j, after_j, auth.uid());

  return coalesce(new, old);
end;
$$;

comment on function app.audit_row() is
  'Generic audit trigger. Skips no-op updates so the log stays readable.';

-- ── Attach to everything worth an audit trail ─────────────────────────
-- Deliberately excluded: inventory_moves and audit_log (already append-only,
-- auditing them would just double every write).
do $$
declare t text;
begin
  foreach t in array array[
    'workspaces', 'workspace_members',
    'filament_types', 'printers', 'packaging_options', 'sales_channels',
    'expense_categories', 'promotions', 'settings', 'cost_model_versions',
    'filament_lots', 'products', 'inventory_items', 'print_jobs',
    'expenses', 'shipping_trips', 'sales', 'promo_applications'
  ]
  loop
    execute format(
      'create trigger %1$s_audit
         after insert or update or delete on %1$I
         for each row execute function app.audit_row()', t
    );
  end loop;
end;
$$;

-- ── Soft-delete helpers ───────────────────────────────────────────────
-- Clients set deleted_at directly; these exist so reports and pickers can
-- express "live rows only" once instead of repeating the predicate.
create or replace function app.is_live(deleted_at timestamptz)
returns boolean
language sql
immutable
as $$ select deleted_at is null $$;

-- Guard: a soft-deleted row must not be silently resurrected by an update
-- that forgets to clear deleted_at. Un-deleting is allowed, but it has to be
-- the only thing the update does, so it reads as a deliberate restore.
create or replace function app.guard_undelete()
returns trigger
language plpgsql
as $$
begin
  if old.deleted_at is not null and new.deleted_at is null then
    if to_jsonb(new) - 'deleted_at' - 'updated_at'
       <> to_jsonb(old) - 'deleted_at' - 'updated_at' then
      raise exception
        'Restore % first, then edit it (restore and edit cannot be one update).',
        tg_table_name
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'printers', 'filament_lots', 'products', 'inventory_items',
    'print_jobs', 'expenses', 'shipping_trips', 'sales'
  ]
  loop
    execute format(
      'create trigger %1$s_guard_undelete
         before update on %1$I
         for each row execute function app.guard_undelete()', t
    );
  end loop;
end;
$$;

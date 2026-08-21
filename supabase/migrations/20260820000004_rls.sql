-- ═══════════════════════════════════════════════════════════════════════
-- PrintFlow 2.0 · Migration 004 — Row Level Security
-- Plan task 0.7
--
-- DEFECT 6: the Apps Script backend is deployed "Execute as: Me / Who has
--   access: Anyone", so anyone holding the /exec URL can read and write the
--   entire business ledger. Every table below is now scoped to the caller's
--   workspace membership, with no anonymous access at all.
--
-- DELETE POLICY, deliberately asymmetric:
--   * Business and ledger tables get NO delete policy. Removal is setting
--     deleted_at. This is DEFECT 7 (deleteRow() destroyed tax records with
--     no undo) fixed at the database, not in the client.
--   * Config tables DO allow delete, because FK RESTRICT already means you
--     can only delete a row nothing references. That is exactly the right
--     semantics: fix a typo freely, but you cannot orphan two years of
--     sales by removing a packaging size (plan §6.4).
--   * inventory_moves, audit_log, cost_model_versions are append-only.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Workspaces and membership ─────────────────────────────────────────
alter table workspaces        enable row level security;
alter table workspace_members enable row level security;

create policy workspaces_select on workspaces
  for select to authenticated
  using (id in (select app.user_workspace_ids()));

create policy workspaces_update on workspaces
  for update to authenticated
  using (id in (select app.user_admin_workspace_ids()))
  with check (id in (select app.user_admin_workspace_ids()));

create policy workspace_members_select on workspace_members
  for select to authenticated
  using (workspace_id in (select app.user_workspace_ids()));

-- NOT "for all": a FOR ALL policy also applies to SELECT, and this table's
-- membership check reads workspace_members -- which recurses infinitely
-- unless it goes through the SECURITY DEFINER helper. Split by command, and
-- routed through the helper, so neither trap is reachable.
create policy workspace_members_insert on workspace_members
  for insert to authenticated
  with check (workspace_id in (select app.user_admin_workspace_ids()));

create policy workspace_members_update on workspace_members
  for update to authenticated
  using (workspace_id in (select app.user_admin_workspace_ids()))
  with check (workspace_id in (select app.user_admin_workspace_ids()));

create policy workspace_members_delete on workspace_members
  for delete to authenticated
  using (workspace_id in (select app.user_admin_workspace_ids()));

-- ── Config tables: full CRUD, protected by FK RESTRICT ────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'filament_types', 'printers', 'packaging_options', 'sales_channels',
    'expense_categories', 'promotions', 'settings'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format($p$
      create policy %1$s_all on %1$I
        for all to authenticated
        using (workspace_id in (select app.user_workspace_ids()))
        with check (workspace_id in (select app.user_workspace_ids()))
    $p$, t);
  end loop;
end;
$$;

-- ── Business tables: select / insert / update, but never delete ────────
do $$
declare t text;
begin
  foreach t in array array[
    'filament_lots', 'products', 'inventory_items', 'print_jobs',
    'expenses', 'shipping_trips', 'sales'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format($p$
      create policy %1$s_select on %1$I
        for select to authenticated
        using (workspace_id in (select app.user_workspace_ids()))
    $p$, t);
    execute format($p$
      create policy %1$s_insert on %1$I
        for insert to authenticated
        with check (workspace_id in (select app.user_workspace_ids()))
    $p$, t);
    execute format($p$
      create policy %1$s_update on %1$I
        for update to authenticated
        using (workspace_id in (select app.user_workspace_ids()))
        with check (workspace_id in (select app.user_workspace_ids()))
    $p$, t);
    -- intentionally no DELETE policy: use deleted_at
  end loop;
end;
$$;

-- ── Append-only: read and insert, never change or remove ──────────────
do $$
declare t text;
begin
  foreach t in array array['inventory_moves', 'cost_model_versions']
  loop
    execute format('alter table %I enable row level security', t);
    execute format($p$
      create policy %1$s_select on %1$I
        for select to authenticated
        using (workspace_id in (select app.user_workspace_ids()))
    $p$, t);
    execute format($p$
      create policy %1$s_insert on %1$I
        for insert to authenticated
        with check (workspace_id in (select app.user_workspace_ids()))
    $p$, t);
  end loop;
end;
$$;

-- ── Join tables ───────────────────────────────────────────────────────
alter table promo_applications enable row level security;
alter table promotion_products enable row level security;

create policy promo_applications_select on promo_applications
  for select to authenticated
  using (workspace_id in (select app.user_workspace_ids()));

create policy promo_applications_insert on promo_applications
  for insert to authenticated
  with check (workspace_id in (select app.user_workspace_ids()));

-- Voiding a sale should be able to unwind its promo link.
create policy promo_applications_delete on promo_applications
  for delete to authenticated
  using (workspace_id in (select app.user_workspace_ids()));

-- promotion_products has no workspace_id of its own; it inherits scope
-- from its parent promotion.
create policy promotion_products_all on promotion_products
  for all to authenticated
  using (exists (
    select 1 from promotions p
    where p.id = promotion_id
      and p.workspace_id in (select app.user_workspace_ids())
  ))
  with check (exists (
    select 1 from promotions p
    where p.id = promotion_id
      and p.workspace_id in (select app.user_workspace_ids())
  ));

-- ── Audit log: read-only to clients. Only triggers write it. ──────────
alter table audit_log enable row level security;

create policy audit_log_select on audit_log
  for select to authenticated
  using (workspace_id in (select app.user_workspace_ids()));

-- ── Table privileges ─────────────────────────────────────────────────
-- RLS is necessary but NOT sufficient: a policy only filters rows the role
-- already has DML privileges on. This project's default privileges grant
-- authenticated only REFERENCES/TRIGGER/TRUNCATE, so without the grants
-- below every policy above would filter an empty set. Granted explicitly
-- rather than relying on ALTER DEFAULT PRIVILEGES, so the intent is visible
-- and the DELETE asymmetry above is enforced at two levels, not one.

-- Config: full CRUD (FK RESTRICT is what protects referenced rows)
grant select, insert, update, delete on
  filament_types, printers, packaging_options, sales_channels,
  expense_categories, promotions, settings
  to authenticated;

-- Business: no DELETE privilege at all -- removal is setting deleted_at
grant select, insert, update on
  filament_lots, products, inventory_items, print_jobs,
  expenses, shipping_trips, sales
  to authenticated;

-- Append-only
grant select, insert on inventory_moves, cost_model_versions to authenticated;

-- Read-only (written by triggers running as owner)
grant select on audit_log to authenticated;

-- Tenancy
grant select, update on workspaces to authenticated;
grant select, insert, update, delete on workspace_members to authenticated;

-- Join tables
grant select, insert, delete on promo_applications to authenticated;
grant select, insert, update, delete on promotion_products to authenticated;

-- ── No anonymous access anywhere ──────────────────────────────────────
-- DEFECT 6 in one line: the current backend is readable and writable by
-- anyone with the URL. Here, unauthenticated callers get nothing.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

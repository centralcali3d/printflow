-- ═══════════════════════════════════════════════════════════════════════
-- PrintFlow 2.0 · Schema verification (plan task 0.14)
--
-- Asserts that each verified defect from §1 of MODERNIZATION_PLAN.md is
-- closed BY THE SCHEMA, not by client discipline. Run with:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/001_schema_verification.sql
-- Any failure raises and aborts with a non-zero exit.
-- ═══════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on

create or replace function pg_temp.ok(cond boolean, msg text)
returns void language plpgsql as $$
begin
  if not cond then
    raise exception 'FAILED: %', msg;
  end if;
  raise notice '  ok  %', msg;
end $$;

-- ═══ Signup seeds a workspace that prices like v1.11.0 ═══════════════
\echo '\n── Signup and seeded defaults ──'
do $$
declare
  uid uuid := gen_random_uuid();
  ws  uuid;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (uid, 'owner-a@test.local', '{"workspace_name":"Central Cali 3D"}'::jsonb);

  select workspace_id into ws from workspace_members where user_id = uid;
  perform pg_temp.ok(ws is not null, 'signup created a workspace');
  perform pg_temp.ok(
    (select name from workspaces where id = ws) = 'Central Cali 3D',
    'workspace_name from user metadata is honoured');
  perform pg_temp.ok(
    (select role from workspace_members where user_id = uid) = 'owner',
    'signing user is the owner');

  -- Counts match the constants they replace
  perform pg_temp.ok((select count(*) from packaging_options  where workspace_id = ws) = 4,
    '4 packaging options seeded (was PACKAGING_COSTS)');
  perform pg_temp.ok((select count(*) from sales_channels     where workspace_id = ws) = 3,
    '3 sales channels seeded (TikTok / In-Person / Sample)');
  perform pg_temp.ok((select count(*) from expense_categories where workspace_id = ws) = 10,
    '10 expense categories seeded');
  perform pg_temp.ok((select count(*) from cost_model_versions where workspace_id = ws) = 1,
    'one cost model version seeded');

  -- Values match v1.11.0 exactly
  perform pg_temp.ok(
    (select cost from packaging_options where workspace_id = ws and name = 'Small Box') = 1.25,
    'Small Box = $1.25');
  perform pg_temp.ok(
    (select cost from packaging_options where workspace_id = ws and name = 'Medium Box') = 1.75,
    'Medium Box = $1.75');
  perform pg_temp.ok(
    (select cost from packaging_options where workspace_id = ws and name = 'Large Box') = 2.00,
    'Large Box = $2.00');
  perform pg_temp.ok(
    (select is_default from packaging_options where workspace_id = ws and name = 'Small Box'),
    'Small Box is the default (matches productCost fallback)');
  perform pg_temp.ok(
    (select fee_pct from sales_channels where workspace_id = ws and name = 'TikTok') = 10,
    'TikTok fee = 10% (was tiktok_default_fee_pct)');
  perform pg_temp.ok(
    (select not counts_as_revenue from sales_channels where workspace_id = ws and name = 'Sample'),
    'Sample channel does not count as revenue');
  perform pg_temp.ok(
    (select electricity_rate_per_hr from cost_model_versions where workspace_id = ws) = 0.17,
    'electricity rate = $0.17/hr');
  perform pg_temp.ok(
    (select labor_rate_per_hr from cost_model_versions where workspace_id = ws) = 25.00,
    'labor rate = $25.00/hr');
  perform pg_temp.ok(
    (select post_office_miles from cost_model_versions where workspace_id = ws) = 3.6,
    'post office miles = 3.6');
  perform pg_temp.ok(
    (select machine_rate_per_hr = 0 and overhead_per_unit = 0 and default_waste_pct = 0
       and electricity_mode = 'flat' from cost_model_versions where workspace_id = ws),
    'every cost extension is OFF by default (reproduces v1.11.0)');
  perform pg_temp.ok(
    (select is_mileage from expense_categories where workspace_id = ws and name = 'Mileage'),
    'Mileage category flagged is_mileage');
end $$;

-- ═══ DEFECT 3 — filament cost per lot, real spool weight ═════════════
\echo '\n── DEFECT 3: filament cost is per-lot and spool-weight aware ──'
do $$
declare
  ws uuid := (select workspace_id from workspace_members where user_id in
                (select id from auth.users where email = 'owner-a@test.local'));
  ft uuid;
  black uuid; white uuid;
begin
  select id into ft from filament_types where workspace_id = ws and name = 'PLA Basic';

  -- Same type, two colors, DIFFERENT prices and DIFFERENT spool weights.
  -- Today filCostPerKg('PLA Basic') returns whichever row it finds first,
  -- so both of these would have costed identically and wrongly.
  insert into filament_lots (workspace_id, filament_type_id, color, spool_weight_g, cost_per_spool, on_hand_g)
  values (ws, ft, 'Black', 1000, 12.99, 1000) returning id into black;
  insert into filament_lots (workspace_id, filament_type_id, color, spool_weight_g, cost_per_spool, on_hand_g)
  values (ws, ft, 'Matte White', 750, 21.00, 750) returning id into white;

  perform pg_temp.ok(
    (select round(cost_per_g, 6) from filament_lots where id = black) = 0.012990,
    '1000g @ $12.99 -> $0.01299/g');
  perform pg_temp.ok(
    (select round(cost_per_g, 6) from filament_lots where id = white) = 0.028000,
    '750g @ $21.00 -> $0.028/g (a non-1kg spool is now priced correctly)');
  perform pg_temp.ok(
    (select count(distinct cost_per_g) from filament_lots where workspace_id = ws) = 2,
    'two colors of one type carry two different costs');

  -- cost_per_g is GENERATED: no code path can compute it differently
  begin
    insert into filament_lots (workspace_id, filament_type_id, color, spool_weight_g, cost_per_spool, cost_per_g)
    values (ws, ft, 'Bogus', 1000, 5, 99);
    raise exception 'FAILED: cost_per_g should not be directly writable';
  exception when generated_always then
    raise notice '  ok  cost_per_g is generated, not writable';
  end;

  -- A zero spool weight must fail the CHECK with a readable message, not
  -- leak a raw division-by-zero from the generated column.
  begin
    insert into filament_lots (workspace_id, filament_type_id, color, spool_weight_g, cost_per_spool)
    values (ws, ft, 'Zero', 0, 5);
    raise exception 'FAILED: spool_weight_g = 0 should be rejected';
  exception
    when check_violation then
      raise notice '  ok  spool_weight_g must be > 0 (clean check violation)';
    when division_by_zero then
      raise exception 'FAILED: leaked division_by_zero instead of a check violation';
  end;
end $$;

-- ═══ DEFECT 1 — packaging on products actually persists ══════════════
\echo '\n── DEFECT 1: Products.packaging is a real FK ──'
do $$
declare
  ws uuid := (select workspace_id from workspace_members where user_id in
                (select id from auth.users where email = 'owner-a@test.local'));
  med uuid; prod uuid;
begin
  select id into med from packaging_options where workspace_id = ws and name = 'Medium Box';

  insert into products (workspace_id, name, filament_g, print_time_hr, prep_time_hr,
                        packaging_option_id, sale_price)
  values (ws, 'Makeup Holder', 250, 8.5, 0.30, med, 34.99) returning id into prod;

  -- The exact failure mode of defect 1: the value survives the write.
  perform pg_temp.ok(
    (select packaging_option_id from products where id = prod) = med,
    'a Medium Box selection persists (today it is silently dropped)');
  perform pg_temp.ok(
    (select po.cost from products p join packaging_options po on po.id = p.packaging_option_id
      where p.id = prod) = 1.75,
    'product resolves to $1.75, not the $1.25 Small Box fallback');

  -- An unknown packaging value is now an error, not a silent default
  begin
    insert into products (workspace_id, name, packaging_option_id)
    values (ws, 'Bad Packaging', gen_random_uuid());
    raise exception 'FAILED: unknown packaging_option_id should be rejected';
  exception when foreign_key_violation then
    raise notice '  ok  unknown packaging is rejected at write time';
  end;

  perform pg_temp.ok(
    (select batch_size = 1 and waste_pct = 0 from products where id = prod),
    'batch_size and waste_pct default to reproducing v1.11.0');
end $$;

-- ═══ Inventory uniqueness + DEFECT 8 queue dedupe ════════════════════
\echo '\n── Inventory uniqueness and queue dedupe ──'
do $$
declare
  ws uuid := (select workspace_id from workspace_members where user_id in
                (select id from auth.users where email = 'owner-a@test.local'));
  prod uuid; lot uuid; inv uuid;
begin
  select id into prod from products where workspace_id = ws and name = 'Makeup Holder';
  select id into lot  from filament_lots where workspace_id = ws and color = 'Black';

  insert into inventory_items (workspace_id, product_id, filament_lot_id, qty_available, build_to)
  values (ws, prod, lot, 3, 10) returning id into inv;

  -- v1.7 fixed duplicate inventory rows in client code. Now it is a
  -- database guarantee instead of a code path that must stay correct.
  begin
    insert into inventory_items (workspace_id, product_id, filament_lot_id, qty_available)
    values (ws, prod, lot, 5);
    raise exception 'FAILED: duplicate product/lot inventory row should be rejected';
  exception when unique_violation then
    raise notice '  ok  duplicate product+lot inventory row is impossible';
  end;

  perform pg_temp.ok(
    (select qty_available from inventory_items where id = inv) = 3,
    'inventory row intact after the rejected duplicate');

  -- DEFECT 8: refreshQueue() doubled the queue when run twice
  insert into print_jobs (workspace_id, product_id, filament_lot_id, qty,
                          auto_generated, source_inventory_item_id, status)
  values (ws, prod, lot, 7, true, inv, 'pending');
  begin
    insert into print_jobs (workspace_id, product_id, filament_lot_id, qty,
                            auto_generated, source_inventory_item_id, status)
    values (ws, prod, lot, 7, true, inv, 'pending');
    raise exception 'FAILED: a second auto job for the same source should be rejected';
  exception when unique_violation then
    raise notice '  ok  running refresh twice cannot double the queue';
  end;

  -- Manual jobs are unaffected: you can queue the same thing on purpose
  insert into print_jobs (workspace_id, product_id, filament_lot_id, qty, auto_generated)
  values (ws, prod, lot, 2, false);
  insert into print_jobs (workspace_id, product_id, filament_lot_id, qty, auto_generated)
  values (ws, prod, lot, 2, false);
  perform pg_temp.ok(
    (select count(*) from print_jobs where workspace_id = ws and not auto_generated) = 2,
    'manual duplicate jobs are still allowed');

  -- Negative stock is rejected outright
  begin
    update inventory_items set qty_available = -1 where id = inv;
    raise exception 'FAILED: negative qty_available should be rejected';
  exception when check_violation then
    raise notice '  ok  stock cannot go negative';
  end;
end $$;

-- ═══ Snapshots, audit trail, and reports ═════════════════════════════
\echo '\n── Sale snapshots, audit trail, reports ──'
do $$
declare
  ws uuid := (select workspace_id from workspace_members where user_id in
                (select id from auth.users where email = 'owner-a@test.local'));
  prod uuid; lot uuid; ch uuid; pkg uuid; cmv uuid; sale uuid;
  n_audit bigint;
  pnl record;
begin
  select id into prod from products       where workspace_id = ws and name = 'Makeup Holder';
  select id into lot  from filament_lots  where workspace_id = ws and color = 'Black';
  select id into ch   from sales_channels where workspace_id = ws and name = 'TikTok';
  select id into pkg  from packaging_options where workspace_id = ws and name = 'Medium Box';
  select id into cmv  from cost_model_versions where workspace_id = ws;

  -- 2 x $34.99 on TikTok at 10%: subtotal 69.98, payout 62.982 -> 62.98
  insert into sales (workspace_id, sold_at, order_ref, channel_id, product_id, filament_lot_id,
                     qty, sale_price, subtotal, payout, status,
                     packaging_option_id, packaging_cost,
                     unit_cost, total_cost, profit, margin_pct, cost_model_version_id)
  values (ws, current_date, 'TT-1001', ch, prod, lot,
          2, 34.99, 69.98, 62.98, 'Completed',
          pkg, 1.75,
          14.60, 29.20, 33.78, 53.6349, cmv)
  returning id into sale;

  perform pg_temp.ok(
    (select app.sales_snapshot_complete(s) from sales s where s.id = sale),
    'sale snapshot is complete (the invariant reports depend on)');
  perform pg_temp.ok(
    (select cost_model_version_id from sales where id = sale) = cmv,
    'sale records which cost model priced it');

  -- Audit trail exists for the sale
  select count(*) into n_audit from audit_log
    where table_name = 'sales' and row_id = sale and action = 'insert';
  perform pg_temp.ok(n_audit = 1, 'insert is recorded in audit_log');

  update sales set notes = 'promo order' where id = sale;
  select count(*) into n_audit from audit_log
    where table_name = 'sales' and row_id = sale and action = 'update';
  perform pg_temp.ok(n_audit = 1, 'update is recorded in audit_log');

  -- A no-op update must not pollute the change history
  update sales set notes = 'promo order' where id = sale;
  select count(*) into n_audit from audit_log
    where table_name = 'sales' and row_id = sale and action = 'update';
  perform pg_temp.ok(n_audit = 1, 'a no-op update writes no audit row');

  -- Reports read snapshots and agree with them
  select * into pnl from report_pnl(current_date - 1, current_date + 1);
  perform pg_temp.ok(pnl.revenue      = 69.98, 'report_pnl revenue = 69.98');
  perform pg_temp.ok(pnl.payout       = 62.98, 'report_pnl payout = 62.98');
  perform pg_temp.ok(pnl.cogs         = 29.20, 'report_pnl COGS reads the snapshot');
  perform pg_temp.ok(pnl.gross_profit = 33.78, 'report_pnl gross profit = payout - COGS');
  perform pg_temp.ok(pnl.units_sold   = 2,     'report_pnl units sold = 2');
  perform pg_temp.ok(pnl.net_profit   = 33.78, 'report_pnl net = gross with no expenses yet');

  perform pg_temp.ok(
    (select count(*) from report_sales_detail(current_date - 1, current_date + 1)) = 1,
    'report_sales_detail returns the sale');
  perform pg_temp.ok(
    (select channel from report_sales_by_channel(current_date - 1, current_date + 1)) = 'TikTok',
    'report_sales_by_channel resolves the channel name');
end $$;

-- ═══ Mileage: trip + expense, IRS fields ═════════════════════════════
\echo '\n── Shipping trip and mileage reporting ──'
do $$
declare
  ws uuid := (select workspace_id from workspace_members where user_id in
                (select id from auth.users where email = 'owner-a@test.local'));
  cat uuid; exp uuid; trip uuid;
  pnl record;
begin
  select id into cat from expense_categories where workspace_id = ws and name = 'Mileage';

  insert into expenses (workspace_id, incurred_at, category_id, description, amount, miles)
  values (ws, current_date, cat, 'USPS Post Office - shipping customer orders', 2.52, 3.6)
  returning id into exp;

  insert into shipping_trips (workspace_id, occurred_at, miles, rate_used, amount, order_refs, expense_id)
  values (ws, current_date, 3.6, 0.70, 2.52, array['TT-1001'], exp)
  returning id into trip;

  perform pg_temp.ok(
    (select destination = 'USPS Post Office' and purpose = 'Shipping customer orders'
       from shipping_trips where id = trip),
    'IRS fields default correctly (date, destination, purpose, miles)');

  select * into pnl from report_pnl(current_date - 1, current_date + 1);
  perform pg_temp.ok(pnl.mileage_amount = 2.52, 'report_pnl picks up mileage amount');
  perform pg_temp.ok(pnl.mileage_miles  = 3.6,  'report_pnl picks up mileage miles');
  perform pg_temp.ok(pnl.net_profit     = 31.26, 'net profit drops by the expense');

  perform pg_temp.ok(
    (select count(*) from report_mileage_log(current_date - 1, current_date + 1)) = 1,
    'report_mileage_log returns the trip');
end $$;

-- ═══ DEFECT 6 — RLS isolates workspaces ══════════════════════════════
\echo '\n── DEFECT 6: RLS isolation between workspaces ──'
do $$
declare
  uid_b uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (uid_b, 'owner-b@test.local', '{"workspace_name":"Someone Else 3D"}'::jsonb);
  perform pg_temp.ok(
    (select count(*) from workspaces) = 2, 'two workspaces exist (as superuser, RLS bypassed)');
end $$;

-- Act as user B through the authenticated role. This MUST be an explicit
-- transaction: SET LOCAL is a no-op under psql autocommit, which would
-- silently leave us as superuser with RLS bypassed and pass vacuously.
begin;

-- Claims must be set while still superuser -- authenticated cannot read auth.users.
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'owner-b@test.local'),
    'role', 'authenticated'
  )::text,
  true
) as claims_set \gset

set local role authenticated;

do $$
begin
  -- Guard against the failure mode this restructure fixed: if the role or
  -- claims did not take, every assertion below would pass for the wrong
  -- reason. Prove we are actually acting as user B first.
  perform pg_temp.ok(current_user = 'authenticated',
    'acting as the authenticated role, not superuser');
  perform pg_temp.ok(auth.uid() is not null,
    'auth.uid() resolves from the JWT claims');

  perform pg_temp.ok((select count(*) from workspaces) = 1,
    'user B sees only their own workspace');
  perform pg_temp.ok((select name from workspaces) = 'Someone Else 3D',
    'and it is the right one');
  perform pg_temp.ok((select count(*) from sales) = 0,
    'user B cannot see user A''s sales');
  perform pg_temp.ok((select count(*) from products) = 0,
    'user B cannot see user A''s products');
  perform pg_temp.ok((select count(*) from filament_lots) = 0,
    'user B cannot see user A''s filament');
  -- B legitimately sees their own audit trail (signup + seeding wrote rows).
  -- What matters is that NONE of it belongs to another workspace.
  perform pg_temp.ok((select count(*) from audit_log) > 0,
    'user B can read their own audit trail');
  perform pg_temp.ok(
    (select count(*) from audit_log
      where workspace_id is distinct from (select id from workspaces)) = 0,
    'every audit row user B can see belongs to user B''s workspace');
  perform pg_temp.ok(
    (select count(*) from audit_log where table_name = 'sales') = 0,
    'user A''s sale audit rows are not visible to user B');
  perform pg_temp.ok(
    (select count(*) from audit_log where table_name = 'workspaces') = 1,
    'workspace audit rows are scoped to their own id, not orphaned as NULL');
  perform pg_temp.ok(
    (select count(*) from report_sales_detail(current_date - 30, current_date + 1)) = 0,
    'reports are workspace-scoped too (security_invoker holds)');
  perform pg_temp.ok((select count(*) from packaging_options) = 4,
    'user B got their own seeded config');
end $$;

-- ═══ DEFECT 7 — clients cannot hard-delete ═══════════════════════════
\echo '\n── DEFECT 7: business rows cannot be hard-deleted ──'
do $$
declare
  ws   uuid;
  prod uuid;
begin
  select workspace_id into ws from workspace_members where user_id = auth.uid();
  perform pg_temp.ok(ws is not null, 'user B resolves their workspace under RLS');

  insert into products (workspace_id, name) values (ws, 'Doomed Product') returning id into prod;

  begin
    delete from products where id = prod;
    raise exception 'FAILED: client DELETE on products should be denied';
  exception when insufficient_privilege then
    raise notice '  ok  DELETE privilege is withheld on products';
  end;

  -- The supported path
  update products set deleted_at = now() where id = prod;
  perform pg_temp.ok(
    (select deleted_at is not null from products where id = prod),
    'soft delete works');
  perform pg_temp.ok(
    (select count(*) from v_products where id = prod) = 0,
    'soft-deleted rows drop out of the live views reports use');

  -- Restore-and-edit in one update is refused, so a restore reads as a restore
  begin
    update products set deleted_at = null, name = 'Sneaky Rename' where id = prod;
    raise exception 'FAILED: restore-and-edit in one update should be refused';
  exception when check_violation then
    raise notice '  ok  restore and edit cannot be the same update';
  end;

  update products set deleted_at = null where id = prod;
  perform pg_temp.ok(
    (select deleted_at is null and name = 'Doomed Product' from products where id = prod),
    'a clean restore is allowed');

  -- Cross-tenant write attempt
  begin
    insert into products (workspace_id, name)
    values ((select id from workspaces where name = 'Central Cali 3D' limit 1), 'Trespass');
    raise exception 'FAILED: cross-workspace insert should be denied';
  exception
    when insufficient_privilege then raise notice '  ok  cross-workspace insert denied by RLS';
    when not_null_violation  then raise notice '  ok  cross-workspace insert denied by RLS';
  end;
end $$;

rollback;

-- ═══ Anonymous access ════════════════════════════════════════════════
\echo '\n── Anonymous callers get nothing ──'
do $$
declare n int;
begin
  select count(*) into n
  from information_schema.role_table_grants
  where grantee = 'anon' and table_schema = 'public'
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  perform pg_temp.ok(n = 0, 'anon holds no DML privilege on any public table');
end $$;

\echo '\n════════════════════════════════════════════════'
\echo ' ALL SCHEMA VERIFICATION CHECKS PASSED'
\echo '════════════════════════════════════════════════\n'

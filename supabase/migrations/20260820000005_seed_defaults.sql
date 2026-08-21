-- ═══════════════════════════════════════════════════════════════════════
-- PrintFlow 2.0 · Migration 005 — Default configuration on signup
-- Plan task 0.8
--
-- Every value here is chosen to reproduce v1.11.0 EXACTLY, so a fresh
-- workspace prices identically to the current app before anything is
-- touched. Sources:
--   PACKAGING_COSTS            index.html
--   SETTINGS defaults          index.html + PrintFlow_AppsScript.js
--   channel list               sale-channel <select>
--   expense category list      PrintFlow_AppsScript.js
--
-- NOTE ON mileage_rate: index.html and PrintFlow_AppsScript.js both default
-- to 0.70, while README.md's settings table documents 0.725. Seeding 0.70 to
-- match the two code paths. The live sheet's real value is authoritative and
-- gets imported in Stage 2, which overwrites this. Flagged for the user.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function app.seed_workspace_defaults(ws uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- ── Packaging (was the PACKAGING_COSTS constant) ────────────────────
  insert into packaging_options (workspace_id, name, cost, is_default, sort) values
    (ws, 'Small Box',  1.25, true,  10),
    (ws, 'Medium Box', 1.75, false, 20),
    (ws, 'Large Box',  2.00, false, 30),
    (ws, 'Other',      0.00, false, 40)
  on conflict (workspace_id, name) do nothing;

  -- ── Sales channels (were hardcoded option values) ───────────────────
  -- TikTok's 10% was the tiktok_default_fee_pct setting; it belongs to the
  -- channel now, which is what makes adding Etsy or a craft fair free.
  insert into sales_channels
    (workspace_id, name, fee_model, fee_pct, allows_affiliate, counts_as_revenue, default_status, sort) values
    (ws, 'TikTok',    'percent', 10, true,  true,  'Pending',   10),
    (ws, 'In-Person', 'none',     0, false, true,  'Completed', 20),
    (ws, 'Sample',    'none',     0, false, false, 'Sample',    30)
  on conflict (workspace_id, name) do nothing;

  -- ── Expense categories, mapped to Schedule C lines ──────────────────
  -- Defaults only. The README already advises confirming with a CPA; these
  -- are editable in Settings (task 5.9).
  insert into expense_categories
    (workspace_id, name, schedule_c_line, is_mileage, sort) values
    (ws, 'Hardware',           'Line 13 — Depreciation and section 179', false, 10),
    (ws, 'Hotends',            'Line 22 — Supplies',                     false, 20),
    (ws, 'Bed Plates',         'Line 22 — Supplies',                     false, 30),
    (ws, 'Consumables',        'Line 22 — Supplies',                     false, 40),
    (ws, 'Marketing',          'Line 8 — Advertising',                   false, 50),
    (ws, 'Video/Editing',      'Line 8 — Advertising',                   false, 60),
    (ws, 'Software/Licensing', 'Line 18 — Office expense',               false, 70),
    (ws, 'Mileage',            'Line 9 — Car and truck expenses',        true,  80),
    (ws, 'Shipping',           'Line 27a — Other expenses',              false, 90),
    (ws, 'Other',              'Line 27a — Other expenses',              false, 100)
  on conflict (workspace_id, name) do nothing;

  -- ── Filament type ───────────────────────────────────────────────────
  -- productCost() falls back to 'PLA Basic', so it must exist.
  insert into filament_types (workspace_id, name, default_cost_per_kg, sort) values
    (ws, 'PLA Basic', 12.99, 10)
  on conflict (workspace_id, name) do nothing;

  -- ── Cost model v1: today's rates, every extension off ───────────────
  insert into cost_model_versions (
    workspace_id, effective_from,
    electricity_mode, electricity_rate_per_hr, kwh_rate,
    labor_rate_per_hr, machine_rate_per_hr, overhead_per_unit,
    default_waste_pct, mileage_rate, post_office_miles, notes
  ) values (
    ws, date '2000-01-01',
    'flat', 0.17, 0,
    25.00, 0, 0,
    0, 0.70, 3.6,
    'Seeded to reproduce v1.11.0 exactly. Extensions (machine rate, overhead, waste, metered electricity) intentionally zeroed.'
  )
  on conflict (workspace_id, effective_from) do nothing;

  -- ── Settings: non-cost preferences only ─────────────────────────────
  -- Cost rates live in cost_model_versions. See migration 002's header.
  insert into settings
    (workspace_id, key, value, value_type, scope, label, description, unit, group_name, min_value, max_value, options, sort)
  values
    (ws, 'business_name', 'Central Cali 3D', 'text', 'workspace',
      'Business name', 'Shown on exported reports and PDFs.', null, 'Business', null, null, null, 10),
    (ws, 'fiscal_year_start', '01-01', 'text', 'workspace',
      'Fiscal year start', 'MM-DD. Drives the year-to-date and quarter presets.', null, 'Business', null, null, null, 20),
    (ws, 'currency', 'USD', 'select', 'workspace',
      'Currency', null, null, 'Business', null, null, array['USD'], 30),

    (ws, 'default_report_range', 'YTD', 'select', 'workspace',
      'Default report range', 'Preselected when you open a report.', null, 'Reports & exports',
      null, null, array['Today', 'MTD', 'QTD', 'YTD', 'Last year', 'Custom'], 10),
    (ws, 'samples_count_as_revenue', 'false', 'bool', 'workspace',
      'Samples count as revenue', 'Off matches v1.11.0: Sample sales are $0 and track cost only.', null, 'Reports & exports', null, null, null, 20),
    (ws, 'csv_delimiter', ',', 'select', 'workspace',
      'CSV delimiter', null, null, 'Reports & exports', null, null, array[',', ';', 'tab'], 30),
    (ws, 'decimal_places', '2', 'number', 'workspace',
      'Decimal places', 'Applies to exported money columns.', null, 'Reports & exports', 0, 4, null, 40),

    (ws, 'default_target_margin_pct', '40', 'percent', 'workspace',
      'Default target margin', 'Used by the Pricing screen''s recommended price.', '%', 'Product defaults', 0, 95, null, 10),

    (ws, 'theme', 'system', 'select', 'device',
      'Theme', null, null, 'Appearance', null, null, array['system', 'light', 'dark'], 10),
    (ws, 'compact_tables', 'false', 'bool', 'device',
      'Compact tables', 'Tighter row height on iPad.', null, 'Appearance', null, null, null, 20)
  on conflict (workspace_id, key) do nothing;
end;
$$;

comment on function app.seed_workspace_defaults(uuid) is
  'Seeds a workspace with config that reproduces v1.11.0 pricing exactly. Idempotent.';

-- ── Wire seeding into signup ──────────────────────────────────────────
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ws_id   uuid;
  ws_name text;
begin
  ws_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'workspace_name'), ''),
    'PrintFlow'
  );

  insert into workspaces (name) values (ws_name) returning id into ws_id;
  insert into workspace_members (workspace_id, user_id, role)
    values (ws_id, new.id, 'owner');

  perform app.seed_workspace_defaults(ws_id);

  return new;
end;
$$;

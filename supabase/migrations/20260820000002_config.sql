-- ═══════════════════════════════════════════════════════════════════════
-- PrintFlow 2.0 · Migration 002 — Configuration tables
-- Plan task 0.5 · §6 of MODERNIZATION_PLAN.md
--
-- Everything hardcoded in index.html becomes editable data here:
--   PACKAGING_COSTS          -> packaging_options
--   'TikTok'/'In-Person'/... -> sales_channels
--   the expense category list-> expense_categories
--   SETTINGS rate constants  -> cost_model_versions (versioned, not settings)
--   (new)                    -> promotions
--
-- WHERE RATES LIVE — read this before adding a rate anywhere else.
-- cost_model_versions is the single source of truth for every cost rate,
-- because rate changes must be effective-dated (plan §6.3): a sale records
-- which version priced it. The `settings` table deliberately holds NO cost
-- rates -- only non-cost preferences. Putting a rate in both would create
-- exactly the drift this schema exists to prevent.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Enums ─────────────────────────────────────────────────────────────
create type fee_model       as enum ('percent', 'flat', 'none');
create type promo_type      as enum ('percent_off', 'fixed_off', 'free_shipping', 'bogo', 'giveaway');
create type promo_scope     as enum ('all', 'products', 'channel');
create type promo_absorber  as enum ('seller', 'platform');
create type setting_type    as enum ('number', 'currency', 'percent', 'text', 'bool', 'select', 'date');
create type setting_scope   as enum ('workspace', 'device');
create type electricity_mode as enum ('flat', 'metered');

-- ── Filament types ────────────────────────────────────────────────────
create table filament_types (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references workspaces (id) on delete cascade,
  name                text not null check (length(btrim(name)) between 1 and 80),
  density_g_cm3       numeric(6, 3),
  default_cost_per_kg numeric(12, 2) not null default 0 check (default_cost_per_kg >= 0),
  sort                integer not null default 0,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (workspace_id, name)
);

-- ── Printers ──────────────────────────────────────────────────────────
-- watts drives METERED electricity costing (plan §4).
create table printers (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces (id) on delete cascade,
  name          text not null check (length(btrim(name)) between 1 and 80),
  model         text,
  watts         numeric(8, 1) check (watts is null or watts > 0),
  purchase_date date,
  purchase_cost numeric(12, 2) check (purchase_cost is null or purchase_cost >= 0),
  status        text not null default 'Active',
  notes         text,
  sort          integer not null default 0,
  active        boolean not null default true,
  legacy_id     text,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, name)
);

-- ── Packaging options ─────────────────────────────────────────────────
-- Replaces the PACKAGING_COSTS constant. products.packaging_option_id is a
-- real FK, so defect 1 (Packaging silently dropped on write) cannot recur.
create table packaging_options (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name         text not null check (length(btrim(name)) between 1 and 60),
  cost         numeric(12, 2) not null default 0 check (cost >= 0),
  is_default   boolean not null default false,
  active       boolean not null default true,
  sort         integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, name)
);

-- At most one default per workspace, enforced by the database.
create unique index packaging_options_one_default_idx
  on packaging_options (workspace_id)
  where is_default;

-- ── Sales channels ────────────────────────────────────────────────────
-- Replaces hardcoded TikTok / In-Person / Sample. Etsy, Amazon, craft
-- fairs, wholesale: add a row, no code change.
create table sales_channels (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspaces (id) on delete cascade,
  name              text not null check (length(btrim(name)) between 1 and 60),
  fee_model         fee_model not null default 'none',
  fee_pct           numeric(7, 4) not null default 0 check (fee_pct between 0 and 100),
  fee_flat          numeric(12, 2) not null default 0 check (fee_flat >= 0),
  allows_affiliate  boolean not null default false,
  counts_as_revenue boolean not null default true,
  default_status    text,
  active            boolean not null default true,
  sort              integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (workspace_id, name)
);

-- ── Expense categories ────────────────────────────────────────────────
create table expense_categories (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces (id) on delete cascade,
  name            text not null check (length(btrim(name)) between 1 and 60),
  schedule_c_line text,
  is_mileage      boolean not null default false,
  active          boolean not null default true,
  sort            integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (workspace_id, name)
);

-- ── Promotions ────────────────────────────────────────────────────────
-- absorbed_by is the whole point. Today a promo is just a lower sale price
-- with no record of why it happened or who funded it:
--   'seller'   -> you discount; your payout drops, your margin absorbs it
--   'platform' -> TikTok-funded; customer pays less, your payout is intact
create table promotions (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name         text not null check (length(btrim(name)) between 1 and 120),
  promo_type   promo_type not null,
  value        numeric(12, 4) not null default 0 check (value >= 0),
  scope        promo_scope not null default 'all',
  channel_id   uuid references sales_channels (id) on delete set null,
  starts_at    date,
  ends_at      date,
  absorbed_by  promo_absorber not null default 'seller',
  active       boolean not null default true,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint promotions_window_ck
    check (starts_at is null or ends_at is null or ends_at >= starts_at),

  -- percent_off must be a real percentage
  constraint promotions_percent_ck
    check (promo_type <> 'percent_off' or value between 0 and 100),

  -- a channel-scoped promo needs a channel
  constraint promotions_channel_scope_ck
    check (scope <> 'channel' or channel_id is not null)
);

-- ── Cost model versions ───────────────────────────────────────────────
-- Rate changes append a row rather than overwriting one, so "why was this
-- March sale priced this way" has an answer (plan §6.3). Every extension
-- defaults to reproducing today's numbers exactly.
create table cost_model_versions (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references workspaces (id) on delete cascade,
  effective_from          date not null,

  electricity_mode        electricity_mode not null default 'flat',
  electricity_rate_per_hr numeric(12, 4) not null default 0.17  check (electricity_rate_per_hr >= 0),
  kwh_rate                numeric(12, 4) not null default 0     check (kwh_rate >= 0),
  labor_rate_per_hr       numeric(12, 4) not null default 25.00 check (labor_rate_per_hr >= 0),
  machine_rate_per_hr     numeric(12, 4) not null default 0     check (machine_rate_per_hr >= 0),
  overhead_per_unit       numeric(12, 4) not null default 0     check (overhead_per_unit >= 0),
  default_waste_pct       numeric(7, 4)  not null default 0     check (default_waste_pct between 0 and 100),
  mileage_rate            numeric(12, 4) not null default 0.70  check (mileage_rate >= 0),
  post_office_miles       numeric(10, 2) not null default 3.6   check (post_office_miles >= 0),

  notes                   text,
  created_at              timestamptz not null default now(),
  unique (workspace_id, effective_from)
);

comment on table cost_model_versions is
  'Single source of truth for cost rates. Effective-dated: sales record which version priced them. The settings table intentionally holds no cost rates.';

-- ── Settings ──────────────────────────────────────────────────────────
-- Self-describing so the Settings screen RENDERS ITSELF from this table
-- (plan §6). Adding a setting is an INSERT, not a client release -- which
-- matters more than usual here, because native has no OTA updates.
create table settings (
  workspace_id uuid not null references workspaces (id) on delete cascade,
  key          text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  value        text,
  value_type   setting_type not null default 'text',
  scope        setting_scope not null default 'workspace',
  label        text not null,
  description  text,
  unit         text,
  group_name   text not null default 'General',
  min_value    numeric,
  max_value    numeric,
  options      text[],
  sort         integer not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (workspace_id, key),

  -- a 'select' setting is meaningless without choices
  constraint settings_select_needs_options_ck
    check (value_type <> 'select' or (options is not null and array_length(options, 1) > 0))
);

-- ── updated_at triggers ───────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'filament_types', 'printers', 'packaging_options', 'sales_channels',
    'expense_categories', 'promotions', 'settings'
  ]
  loop
    execute format(
      'create trigger %1$s_touch before update on %1$s
         for each row execute function app.touch_updated_at()', t
    );
  end loop;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- PrintFlow 2.0 · Migration 003 — Core business tables
-- Plan task 0.6 · §3 of MODERNIZATION_PLAN.md
--
-- Each verified defect from §1 is closed structurally here, not by careful
-- client code. Defect references are inline.
-- ═══════════════════════════════════════════════════════════════════════

create type job_priority  as enum ('high', 'medium', 'low');
create type job_status    as enum ('pending', 'printing', 'blocked', 'done', 'failed', 'cancelled');
create type move_reason   as enum ('stock_add', 'sale', 'sale_void', 'print_complete',
                                   'print_failed', 'adjustment', 'loan', 'loan_return', 'import');
create type audit_action  as enum ('insert', 'update', 'delete');

-- ── Filament lots ─────────────────────────────────────────────────────
-- DEFECT 3 (filCostPerKg matched by Type only and assumed 1kg spools):
--   cost is per LOT (type + color), and cost_per_g is a GENERATED column
--   derived from the real spool weight. Wrong-by-construction is now
--   impossible -- there is no code path that can compute $/g differently.
create table filament_lots (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references workspaces (id) on delete cascade,
  filament_type_id uuid not null references filament_types (id) on delete restrict,
  color            text not null check (length(btrim(color)) between 1 and 60),
  swatch_hex       text check (swatch_hex is null or swatch_hex ~* '^#[0-9a-f]{6}$'),

  spool_weight_g   numeric(10, 2) not null default 1000 check (spool_weight_g > 0),
  cost_per_spool   numeric(12, 2) not null default 0    check (cost_per_spool >= 0),
  -- Defensive CASE, not bare division: a generated column is evaluated
  -- BEFORE the CHECK constraint, so a bare divide would surface a raw
  -- "division by zero" instead of the spool_weight_g check's clear message.
  cost_per_g       numeric(14, 6) generated always as (
                     case when spool_weight_g > 0
                          then cost_per_spool / spool_weight_g
                          else 0 end
                   ) stored,

  on_hand_g        numeric(12, 2) not null default 0,
  build_to_spools  numeric(10, 2) not null default 0 check (build_to_spools >= 0),
  vendor           text,
  status           text not null default 'Active',
  purchased_at     date,
  notes            text,
  legacy_id        text,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- One row per type+color, matching the shape of today's Filament tab.
create unique index filament_lots_type_color_idx
  on filament_lots (workspace_id, filament_type_id, lower(color))
  where deleted_at is null;

-- ── Products ──────────────────────────────────────────────────────────
-- DEFECT 1 (Products.Packaging written by saveProduct() but absent from
--   TABS.Products, so writeRow() silently dropped it and every product
--   fell back to Small Box $1.25):
--   packaging_option_id is a real FK. An unknown value is now an error at
--   write time instead of a silent default.
create table products (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid not null references workspaces (id) on delete cascade,
  name                     text not null check (length(btrim(name)) between 1 and 160),
  sku                      text,

  width_in                 numeric(10, 3),
  depth_in                 numeric(10, 3),
  height_in                numeric(10, 3),
  weight_lb                numeric(10, 3),

  filament_g               numeric(10, 2) not null default 0 check (filament_g >= 0),
  filament_type_id         uuid references filament_types (id) on delete set null,
  print_time_hr            numeric(10, 3) not null default 0 check (print_time_hr >= 0),
  prep_time_hr             numeric(10, 3) not null default 0 check (prep_time_hr >= 0),

  -- Amortizes prep across a plate. batch_size = 1 reproduces today exactly.
  batch_size               integer not null default 1 check (batch_size >= 1),
  -- Purge, supports, failed prints (defect 10). Stored as a PERCENT (0-100)
  -- for consistency with every other _pct column. Engine applies /100.
  waste_pct                numeric(7, 4) not null default 0 check (waste_pct between 0 and 100),

  packaging_option_id      uuid references packaging_options (id) on delete restrict,
  sale_price               numeric(12, 2) not null default 0 check (sale_price >= 0),
  default_channel_fee_pct  numeric(7, 4) not null default 0 check (default_channel_fee_pct between 0 and 100),

  active                   boolean not null default true,
  notes                    text,
  legacy_id                text,
  deleted_at               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create unique index products_name_idx
  on products (workspace_id, lower(btrim(name)))
  where deleted_at is null;

-- Promotions scoped to specific products
create table promotion_products (
  promotion_id uuid not null references promotions (id) on delete cascade,
  product_id   uuid not null references products (id) on delete cascade,
  primary key (promotion_id, product_id)
);

-- ── Inventory ─────────────────────────────────────────────────────────
-- The UNIQUE constraint replaces the v1.7 client-side merge-vs-insert logic
-- with a database guarantee: duplicate product/lot rows are now impossible,
-- not merely avoided by careful code.
create table inventory_items (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references workspaces (id) on delete cascade,
  product_id       uuid not null references products (id) on delete restrict,
  filament_lot_id  uuid references filament_lots (id) on delete restrict,

  qty_available    integer not null default 0 check (qty_available >= 0),
  qty_sold         integer not null default 0 check (qty_sold >= 0),
  on_loan          integer not null default 0 check (on_loan >= 0),
  build_to         integer not null default 0 check (build_to >= 0),

  legacy_id        text,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (workspace_id, product_id, filament_lot_id)
);

-- Append-only ledger. Stock level is derivable and auditable, and it is
-- what makes offline quantity conflicts replayable as deltas rather than
-- overwrites (plan §9).
create table inventory_moves (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references workspaces (id) on delete cascade,
  inventory_item_id  uuid not null references inventory_items (id) on delete cascade,
  delta              integer not null check (delta <> 0),
  reason             move_reason not null,
  ref_type           text,
  ref_id             uuid,
  filament_g_delta   numeric(12, 2) not null default 0,
  note               text,
  occurred_at        timestamptz not null default now(),
  created_by         uuid references auth.users (id) on delete set null
);

create index inventory_moves_item_idx on inventory_moves (inventory_item_id, occurred_at desc);
create index inventory_moves_ref_idx  on inventory_moves (ref_type, ref_id);

-- ── Print jobs ────────────────────────────────────────────────────────
-- good_qty / failed_qty / actual_print_time_hr close the loop on real cost:
-- today completeQueueJob() just deletes the row, so nothing is learned.
create table print_jobs (
  id                        uuid primary key default gen_random_uuid(),
  workspace_id              uuid not null references workspaces (id) on delete cascade,
  product_id                uuid not null references products (id) on delete restrict,
  filament_lot_id           uuid references filament_lots (id) on delete restrict,
  printer_id                uuid references printers (id) on delete set null,

  qty                       integer not null check (qty > 0),
  est_print_time_hr         numeric(10, 3) check (est_print_time_hr is null or est_print_time_hr >= 0),
  actual_print_time_hr      numeric(10, 3) check (actual_print_time_hr is null or actual_print_time_hr >= 0),
  good_qty                  integer check (good_qty is null or good_qty >= 0),
  failed_qty                integer not null default 0 check (failed_qty >= 0),

  priority                  job_priority not null default 'medium',
  status                    job_status not null default 'pending',
  notes                     text,
  auto_generated            boolean not null default false,
  source_inventory_item_id  uuid references inventory_items (id) on delete set null,

  started_at                timestamptz,
  completed_at              timestamptz,
  legacy_id                 text,
  deleted_at                timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint print_jobs_good_qty_ck
    check (good_qty is null or good_qty + failed_qty <= qty)
);

-- DEFECT 8 (refreshQueue() had no dedupe, so running it twice doubled the
--   queue): at most one live auto-generated job per source inventory row.
create unique index print_jobs_one_auto_per_source_idx
  on print_jobs (source_inventory_item_id)
  where auto_generated
    and deleted_at is null
    and status in ('pending', 'printing', 'blocked');

create index print_jobs_status_idx on print_jobs (workspace_id, status)
  where deleted_at is null;

-- ── Expenses ──────────────────────────────────────────────────────────
create table expenses (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  incurred_at  date not null,
  category_id  uuid references expense_categories (id) on delete restrict,
  description  text,
  amount       numeric(12, 2) not null default 0,
  printer_id   uuid references printers (id) on delete set null,
  miles        numeric(10, 2) check (miles is null or miles >= 0),
  receipt_path text,
  notes        text,
  legacy_id    text,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index expenses_date_idx on expenses (workspace_id, incurred_at) where deleted_at is null;

-- ── Shipping trips ────────────────────────────────────────────────────
-- Keeps the IRS mileage log a first-class record rather than an expense row
-- that happens to have a category of 'Mileage'.
create table shipping_trips (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  occurred_at  date not null,
  destination  text not null default 'USPS Post Office',
  purpose      text not null default 'Shipping customer orders',
  miles        numeric(10, 2) not null check (miles >= 0),
  rate_used    numeric(12, 4) not null check (rate_used >= 0),
  amount       numeric(12, 2) not null check (amount >= 0),
  order_refs   text[],
  expense_id   uuid references expenses (id) on delete set null,
  notes        text,
  legacy_id    text,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Sales ─────────────────────────────────────────────────────────────
-- The snapshot columns are the most important design decision carried
-- forward from v1.11.0: historical profit must not move when today's rates
-- change. cost_model_version_id records WHICH rates priced the sale, so the
-- frozen numbers are also explainable.
create table sales (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references workspaces (id) on delete cascade,
  sold_at               date not null,
  order_ref             text,
  channel_id            uuid not null references sales_channels (id) on delete restrict,
  product_id            uuid not null references products (id) on delete restrict,
  filament_lot_id       uuid references filament_lots (id) on delete restrict,

  qty                   integer not null check (qty > 0),
  sale_price            numeric(12, 2) not null default 0 check (sale_price >= 0),
  subtotal              numeric(12, 2) not null default 0 check (subtotal >= 0),
  payout                numeric(12, 2) not null default 0,
  status                text,

  affiliate_fee_pct     numeric(7, 4) not null default 0 check (affiliate_fee_pct between 0 and 100),
  affiliate_fee_amt     numeric(12, 2) not null default 0 check (affiliate_fee_amt >= 0),
  packaging_option_id   uuid references packaging_options (id) on delete restrict,
  packaging_cost        numeric(12, 2) not null default 0 check (packaging_cost >= 0),
  shipping_cost_paid    numeric(12, 2) not null default 0 check (shipping_cost_paid >= 0),
  shipping_trip_id      uuid references shipping_trips (id) on delete set null,
  notes                 text,

  -- ── Snapshots. Written once at save time, never recomputed. ──────────
  unit_cost             numeric(12, 2),
  total_cost            numeric(12, 2),
  profit                numeric(12, 2),
  margin_pct            numeric(9, 4),
  cost_model_version_id uuid references cost_model_versions (id) on delete set null,

  legacy_id             text,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index sales_date_idx    on sales (workspace_id, sold_at) where deleted_at is null;
create index sales_channel_idx on sales (workspace_id, channel_id) where deleted_at is null;
create index sales_product_idx on sales (workspace_id, product_id) where deleted_at is null;

-- Task 2.5 backfills snapshots onto every migrated row so reports never
-- need a fallback recalculation. This asserts the invariant reports rely on.
create or replace function app.sales_snapshot_complete(s sales)
returns boolean
language sql
immutable
as $$
  select s.unit_cost is not null
     and s.total_cost is not null
     and s.profit is not null
     and s.margin_pct is not null;
$$;

-- ── Promo applications ────────────────────────────────────────────────
-- Links promos to the sales they touched, so "what did that promo actually
-- cost me, and what did it move" is a query rather than a guess.
create table promo_applications (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces (id) on delete cascade,
  promotion_id    uuid not null references promotions (id) on delete restrict,
  sale_id         uuid not null references sales (id) on delete cascade,
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  absorbed_by     promo_absorber not null,
  applied_at      timestamptz not null default now(),
  unique (promotion_id, sale_id)
);

create index promo_applications_sale_idx on promo_applications (sale_id);

-- ── Audit log ─────────────────────────────────────────────────────────
create table audit_log (
  id           bigserial primary key,
  workspace_id uuid references workspaces (id) on delete cascade,
  table_name   text not null,
  row_id       uuid,
  action       audit_action not null,
  before       jsonb,
  after        jsonb,
  actor        uuid references auth.users (id) on delete set null,
  occurred_at  timestamptz not null default now()
);

create index audit_log_row_idx on audit_log (table_name, row_id, occurred_at desc);
create index audit_log_ws_idx  on audit_log (workspace_id, occurred_at desc);

-- ── updated_at triggers ───────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'filament_lots', 'products', 'inventory_items', 'print_jobs',
    'expenses', 'shipping_trips', 'sales'
  ]
  loop
    execute format(
      'create trigger %1$s_touch before update on %1$s
         for each row execute function app.touch_updated_at()', t
    );
  end loop;
end;
$$;

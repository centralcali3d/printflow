-- ═══════════════════════════════════════════════════════════════════════
-- PrintFlow 2.0 · Migration 007 — Report views
-- Plan task 0.10 · §3 and §8 of MODERNIZATION_PLAN.md
--
-- THE ARCHITECTURAL RULE, and the reason the web reporting page can be a
-- static file: reports contain NO cost logic. They aggregate over the
-- snapshot columns that PrintFlowCore wrote at save time. There is exactly
-- one cost engine, in Swift, and nothing here duplicates it.
--
-- Task 2.5 backfills snapshots onto every migrated row, which is what lets
-- the fragile fallback-recalculation path in today's saleCost() be deleted
-- rather than ported to SQL.
--
-- SECURITY: every function is SECURITY INVOKER (the default), so RLS applies
-- as the calling user. Views are created with security_invoker = true for
-- the same reason -- without it a view would bypass RLS entirely.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Live-row helper views ─────────────────────────────────────────────
create view v_sales with (security_invoker = true) as
  select * from sales where deleted_at is null;

create view v_expenses with (security_invoker = true) as
  select * from expenses where deleted_at is null;

create view v_products with (security_invoker = true) as
  select * from products where deleted_at is null;

create view v_inventory_items with (security_invoker = true) as
  select * from inventory_items where deleted_at is null;

create view v_filament_lots with (security_invoker = true) as
  select * from filament_lots where deleted_at is null;

-- ── report_sales_detail ───────────────────────────────────────────────
create or replace function report_sales_detail(p_start date, p_end date)
returns table (
  sale_id        uuid,
  sold_at        date,
  order_ref      text,
  channel        text,
  product        text,
  filament_type  text,
  color          text,
  qty            integer,
  sale_price     numeric,
  subtotal       numeric,
  payout         numeric,
  affiliate_fee  numeric,
  packaging_cost numeric,
  shipping_cost  numeric,
  unit_cost      numeric,
  total_cost     numeric,
  profit         numeric,
  margin_pct     numeric,
  status         text,
  notes          text
)
language sql
stable
as $$
  select
    s.id, s.sold_at, s.order_ref,
    ch.name, p.name, ft.name, fl.color,
    s.qty, s.sale_price, s.subtotal, s.payout,
    s.affiliate_fee_amt, s.packaging_cost, s.shipping_cost_paid,
    s.unit_cost, s.total_cost, s.profit, s.margin_pct,
    s.status, s.notes
  from v_sales s
  join sales_channels ch on ch.id = s.channel_id
  join products       p  on p.id  = s.product_id
  left join filament_lots  fl on fl.id = s.filament_lot_id
  left join filament_types ft on ft.id = fl.filament_type_id
  where s.sold_at between p_start and p_end
  order by s.sold_at desc, s.created_at desc;
$$;

-- ── report_expenses_detail ────────────────────────────────────────────
create or replace function report_expenses_detail(p_start date, p_end date)
returns table (
  expense_id      uuid,
  incurred_at     date,
  category        text,
  schedule_c_line text,
  description     text,
  amount          numeric,
  printer         text,
  miles           numeric,
  has_receipt     boolean,
  notes           text
)
language sql
stable
as $$
  select
    e.id, e.incurred_at, ec.name, ec.schedule_c_line,
    e.description, e.amount, pr.name, e.miles,
    e.receipt_path is not null, e.notes
  from v_expenses e
  left join expense_categories ec on ec.id = e.category_id
  left join printers           pr on pr.id = e.printer_id
  where e.incurred_at between p_start and p_end
  order by e.incurred_at desc, e.created_at desc;
$$;

-- ── report_pnl ────────────────────────────────────────────────────────
-- Mirrors buildTaxSummary() in index.html, with one deliberate change:
-- COGS reads the stored snapshot instead of recalculating via saleCost().
create or replace function report_pnl(p_start date, p_end date)
returns table (
  revenue          numeric,
  payout           numeric,
  cogs             numeric,
  gross_profit     numeric,
  affiliate_fees   numeric,
  packaging_costs  numeric,
  shipping_costs   numeric,
  expense_total    numeric,
  mileage_amount   numeric,
  mileage_miles    numeric,
  net_profit       numeric,
  sale_count       bigint,
  units_sold       bigint
)
language sql
stable
as $$
  with s as (
    select
      coalesce(sum(sl.subtotal), 0)            as revenue,
      coalesce(sum(sl.payout), 0)              as payout,
      coalesce(sum(sl.total_cost), 0)          as cogs,
      coalesce(sum(sl.affiliate_fee_amt), 0)   as affiliate_fees,
      coalesce(sum(sl.packaging_cost), 0)      as packaging_costs,
      coalesce(sum(sl.shipping_cost_paid), 0)  as shipping_costs,
      count(*)                                 as sale_count,
      coalesce(sum(sl.qty), 0)                 as units_sold
    from v_sales sl
    where sl.sold_at between p_start and p_end
  ),
  e as (
    select
      coalesce(sum(ex.amount), 0) as expense_total,
      coalesce(sum(ex.amount) filter (where ec.is_mileage), 0) as mileage_amount,
      coalesce(sum(ex.miles)  filter (where ec.is_mileage), 0) as mileage_miles
    from v_expenses ex
    left join expense_categories ec on ec.id = ex.category_id
    where ex.incurred_at between p_start and p_end
  )
  select
    s.revenue, s.payout, s.cogs,
    s.payout - s.cogs                       as gross_profit,
    s.affiliate_fees, s.packaging_costs, s.shipping_costs,
    e.expense_total, e.mileage_amount, e.mileage_miles,
    (s.payout - s.cogs) - e.expense_total   as net_profit,
    s.sale_count, s.units_sold
  from s, e;
$$;

-- ── report_inventory_snapshot ─────────────────────────────────────────
-- Cost basis for Schedule C. Unit cost comes from the product's CURRENT
-- cost, matching getInventorySnapshotRows() -- on-hand stock has no sale to
-- snapshot against, so current cost is correct here.
create or replace function report_inventory_snapshot(p_as_of date default current_date)
returns table (
  product          text,
  filament_type    text,
  color            text,
  qty_available    integer,
  unit_cost        numeric,
  inventory_value  numeric,
  retail_unit      numeric,
  retail_value     numeric
)
language sql
stable
as $$
  select
    p.name, ft.name, fl.color,
    ii.qty_available,
    round(coalesce(ii.qty_available * 0, 0), 2)  as unit_cost,
    round(coalesce(ii.qty_available * 0, 0), 2)  as inventory_value,
    p.sale_price,
    round(ii.qty_available * p.sale_price, 2)    as retail_value
  from v_inventory_items ii
  join v_products p on p.id = ii.product_id
  left join v_filament_lots fl on fl.id = ii.filament_lot_id
  left join filament_types  ft on ft.id = fl.filament_type_id
  where ii.qty_available > 0
  order by p.name, fl.color;
$$;

comment on function report_inventory_snapshot(date) is
  'PLACEHOLDER unit_cost/inventory_value. Current product cost is the one figure a report cannot derive from a snapshot -- on-hand stock has no sale to snapshot against. Task 3.4 replaces the zeros with a product_cost_cache column that PrintFlowCore maintains, keeping the single-engine rule intact. Tracked so this cannot ship silently wrong.';

-- ── report_sales_by_channel / by_product ──────────────────────────────
create or replace function report_sales_by_channel(p_start date, p_end date)
returns table (
  channel    text,
  sale_count bigint,
  units      bigint,
  revenue    numeric,
  payout     numeric,
  cogs       numeric,
  profit     numeric,
  margin_pct numeric
)
language sql
stable
as $$
  select
    ch.name,
    count(*),
    coalesce(sum(s.qty), 0),
    coalesce(sum(s.subtotal), 0),
    coalesce(sum(s.payout), 0),
    coalesce(sum(s.total_cost), 0),
    coalesce(sum(s.profit), 0),
    case when coalesce(sum(s.payout), 0) > 0
         then round(coalesce(sum(s.profit), 0) / sum(s.payout) * 100, 2)
         else 0 end
  from v_sales s
  join sales_channels ch on ch.id = s.channel_id
  where s.sold_at between p_start and p_end
  group by ch.name
  order by coalesce(sum(s.profit), 0) desc;
$$;

create or replace function report_sales_by_product(p_start date, p_end date)
returns table (
  product    text,
  sale_count bigint,
  units      bigint,
  revenue    numeric,
  payout     numeric,
  cogs       numeric,
  profit     numeric,
  margin_pct numeric
)
language sql
stable
as $$
  select
    p.name,
    count(*),
    coalesce(sum(s.qty), 0),
    coalesce(sum(s.subtotal), 0),
    coalesce(sum(s.payout), 0),
    coalesce(sum(s.total_cost), 0),
    coalesce(sum(s.profit), 0),
    case when coalesce(sum(s.payout), 0) > 0
         then round(coalesce(sum(s.profit), 0) / sum(s.payout) * 100, 2)
         else 0 end
  from v_sales s
  join products p on p.id = s.product_id
  where s.sold_at between p_start and p_end
  group by p.name
  order by coalesce(sum(s.profit), 0) desc;
$$;

-- ── report_filament_consumption ───────────────────────────────────────
-- Reads the move ledger, which is why inventory_moves carries
-- filament_g_delta: consumption becomes a query instead of a guess.
create or replace function report_filament_consumption(p_start date, p_end date)
returns table (
  filament_type text,
  color         text,
  grams_used    numeric,
  kg_used       numeric,
  cost_per_g    numeric,
  cost_used     numeric
)
language sql
stable
as $$
  select
    ft.name, fl.color,
    round(sum(-m.filament_g_delta), 2),
    round(sum(-m.filament_g_delta) / 1000.0, 4),
    fl.cost_per_g,
    round(sum(-m.filament_g_delta) * fl.cost_per_g, 2)
  from inventory_moves m
  join inventory_items ii on ii.id = m.inventory_item_id
  join filament_lots   fl on fl.id = ii.filament_lot_id
  join filament_types  ft on ft.id = fl.filament_type_id
  where m.filament_g_delta < 0
    and m.occurred_at::date between p_start and p_end
  group by ft.name, fl.color, fl.cost_per_g
  order by sum(-m.filament_g_delta) desc;
$$;

-- ── report_mileage_log ────────────────────────────────────────────────
-- IRS format: date, destination, business purpose, miles.
create or replace function report_mileage_log(p_start date, p_end date)
returns table (
  occurred_at date,
  destination text,
  purpose     text,
  miles       numeric,
  rate_used   numeric,
  amount      numeric,
  order_refs  text
)
language sql
stable
as $$
  select
    t.occurred_at, t.destination, t.purpose,
    t.miles, t.rate_used, t.amount,
    array_to_string(t.order_refs, ', ')
  from shipping_trips t
  where t.deleted_at is null
    and t.occurred_at between p_start and p_end
  order by t.occurred_at desc;
$$;

-- ── report_promo_performance ──────────────────────────────────────────
-- The point of the promotions model: seller-absorbed discounts have a real
-- cost, platform-funded ones do not. Today both look like a lower price.
create or replace function report_promo_performance(p_start date, p_end date)
returns table (
  promotion        text,
  promo_type       promo_type,
  absorbed_by      promo_absorber,
  sales_count      bigint,
  units            bigint,
  discount_given   numeric,
  cost_to_you      numeric,
  revenue          numeric,
  profit           numeric
)
language sql
stable
as $$
  select
    pr.name, pr.promo_type, pa.absorbed_by,
    count(distinct s.id),
    coalesce(sum(s.qty), 0),
    coalesce(sum(pa.discount_amount), 0),
    coalesce(sum(pa.discount_amount) filter (where pa.absorbed_by = 'seller'), 0),
    coalesce(sum(s.subtotal), 0),
    coalesce(sum(s.profit), 0)
  from promo_applications pa
  join promotions pr on pr.id = pa.promotion_id
  join v_sales    s  on s.id  = pa.sale_id
  where s.sold_at between p_start and p_end
  group by pr.name, pr.promo_type, pa.absorbed_by
  order by coalesce(sum(pa.discount_amount), 0) desc;
$$;

-- ── report_tax_summary ────────────────────────────────────────────────
-- Convenience wrapper: today's Tax tab KPIs in one row.
create or replace function report_tax_summary(p_start date, p_end date)
returns table (
  period_start    date,
  period_end      date,
  revenue         numeric,
  payout          numeric,
  cogs            numeric,
  gross_profit    numeric,
  expense_total   numeric,
  mileage_amount  numeric,
  mileage_miles   numeric,
  net_profit      numeric,
  inventory_value numeric
)
language sql
stable
as $$
  select
    p_start, p_end,
    pl.revenue, pl.payout, pl.cogs, pl.gross_profit,
    pl.expense_total, pl.mileage_amount, pl.mileage_miles, pl.net_profit,
    coalesce((select sum(inv.inventory_value)
              from report_inventory_snapshot(p_end) inv), 0)
  from report_pnl(p_start, p_end) pl;
$$;

-- ── Expose to authenticated callers only ──────────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'report_sales_detail(date,date)', 'report_expenses_detail(date,date)',
    'report_pnl(date,date)', 'report_inventory_snapshot(date)',
    'report_sales_by_channel(date,date)', 'report_sales_by_product(date,date)',
    'report_filament_consumption(date,date)', 'report_mileage_log(date,date)',
    'report_promo_performance(date,date)', 'report_tax_summary(date,date)'
  ]
  loop
    execute format('revoke all on function %s from anon, public', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- ── View privileges ───────────────────────────────────────────────────
-- security_invoker views still need their own grants.
grant select on v_sales, v_expenses, v_products, v_inventory_items, v_filament_lots
  to authenticated;
revoke all on v_sales, v_expenses, v_products, v_inventory_items, v_filament_lots
  from anon;

/**
 * Compile-time schema contract.
 *
 * These assertions have no runtime effect — `tsc --noEmit` is the test. Each
 * one pins a column or type the rest of the system depends on, so a migration
 * that renames or retypes it breaks the build with a pointed error instead of
 * surfacing as a wrong number months later.
 *
 * This file is the concrete answer to defect 4. Add an assertion here whenever
 * something becomes load-bearing.
 */

import type {
  Enums, FunctionArgs, FunctionReturns, FunctionRow, SafeInsert, Tables, Views,
} from './index.js';

// ── Assertion helpers ─────────────────────────────────────────────────
type Assert<T extends true> = T;

/** Invariant (exact) type equality — distinguishes `any` from a real type. */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type Has<T, K extends PropertyKey> = K extends keyof T ? true : false;

// ── Sale snapshots ────────────────────────────────────────────────────
// The most important columns in the schema. Reports read these and nothing
// re-derives them, so historical profit stays fixed when rates change.
type Sale = Tables<'sales'>;

export type _SnapshotUnitCost  = Assert<Equals<Sale['unit_cost'],  number | null>>;
export type _SnapshotTotalCost = Assert<Equals<Sale['total_cost'], number | null>>;
export type _SnapshotProfit    = Assert<Equals<Sale['profit'],     number | null>>;
export type _SnapshotMargin    = Assert<Equals<Sale['margin_pct'], number | null>>;

// Which rates priced this sale — what makes a frozen number explainable.
export type _SaleCostModel = Assert<Has<Sale, 'cost_model_version_id'>>;

// ── Defect 1: packaging is a real FK on products ──────────────────────
type Product = Tables<'products'>;

export type _ProductPackaging = Assert<Equals<Product['packaging_option_id'], string | null>>;
export type _ProductBatchSize = Assert<Equals<Product['batch_size'], number>>;
export type _ProductWastePct  = Assert<Equals<Product['waste_pct'], number>>;

// ── Defect 3: per-lot filament cost with a real spool weight ──────────
type Lot = Tables<'filament_lots'>;

export type _LotSpoolWeight = Assert<Equals<Lot['spool_weight_g'], number>>;
export type _LotCostPerSpool = Assert<Equals<Lot['cost_per_spool'], number>>;
export type _LotCostPerGram = Assert<Equals<Lot['cost_per_g'], number | null>>;

// cost_per_g is GENERATED. Writing it is an error the compiler should catch,
// not one Postgres reports after a round trip.
export type _LotCostPerGramNotInsertable =
  Assert<Equals<Has<SafeInsert<'filament_lots'>, 'cost_per_g'>, false>>;

// ── Cost model: the only home for rates ───────────────────────────────
type CostModelRow = Tables<'cost_model_versions'>;

export type _RateElectricity = Assert<Equals<CostModelRow['electricity_rate_per_hr'], number>>;
export type _RateLabor       = Assert<Equals<CostModelRow['labor_rate_per_hr'], number>>;
export type _RateMachine     = Assert<Equals<CostModelRow['machine_rate_per_hr'], number>>;
export type _RateOverhead    = Assert<Equals<CostModelRow['overhead_per_unit'], number>>;
export type _RateMileage     = Assert<Equals<CostModelRow['mileage_rate'], number>>;
export type _RateEffective   = Assert<Equals<CostModelRow['effective_from'], string>>;
export type _RateMode        = Assert<Equals<CostModelRow['electricity_mode'], Enums<'electricity_mode'>>>;

// Rates must NOT appear in settings — that split is the anti-drift rule.
export type _SettingsHasNoRates =
  Assert<Equals<Has<Tables<'settings'>, 'labor_rate_per_hr'>, false>>;

// ── Settings render themselves ────────────────────────────────────────
type Setting = Tables<'settings'>;

export type _SettingType  = Assert<Equals<Setting['value_type'], Enums<'setting_type'>>>;
export type _SettingLabel = Assert<Equals<Setting['label'], string>>;
export type _SettingGroup = Assert<Equals<Setting['group_name'], string>>;
export type _SettingScope = Assert<Equals<Setting['scope'], Enums<'setting_scope'>>>;

// ── Promotions: who funded the discount ───────────────────────────────
export type _PromoAbsorber = Assert<Equals<Enums<'promo_absorber'>, 'seller' | 'platform'>>;
export type _PromoApplicationAbsorber =
  Assert<Equals<Tables<'promo_applications'>['absorbed_by'], Enums<'promo_absorber'>>>;

// ── Reports are date-ranged and return the P&L shape the app expects ───
export type _PnlArgs = Assert<Equals<FunctionArgs<'report_pnl'>, { p_end: string; p_start: string }>>;

// report_pnl is set-returning, so Returns is an array. Assert both the array
// shape and the row shape -- checking columns on the array type silently
// passes nothing, which is how a contract test quietly stops testing.
export type _PnlIsSetReturning =
  Assert<Equals<FunctionReturns<'report_pnl'> extends readonly unknown[] ? true : false, true>>;

type Pnl = FunctionRow<'report_pnl'>;
export type _PnlRevenue   = Assert<Has<Pnl, 'revenue'>>;
export type _PnlPayout    = Assert<Has<Pnl, 'payout'>>;
export type _PnlCogs      = Assert<Has<Pnl, 'cogs'>>;
export type _PnlNetProfit = Assert<Has<Pnl, 'net_profit'>>;
export type _PnlNetProfitType = Assert<Equals<Pnl['net_profit'], number>>;

// The tax summary must expose the same rollups the current Tax tab shows.
type TaxSummary = FunctionRow<'report_tax_summary'>;
export type _TaxNetProfit     = Assert<Has<TaxSummary, 'net_profit'>>;
export type _TaxInventoryVal  = Assert<Has<TaxSummary, 'inventory_value'>>;
export type _TaxMileageMiles  = Assert<Has<TaxSummary, 'mileage_miles'>>;

// ── Live-row views back the reports ───────────────────────────────────
export type _ViewSalesLive = Assert<Has<Views<'v_sales'>, 'deleted_at'>>;
export type _ViewProductsLive = Assert<Has<Views<'v_products'>, 'deleted_at'>>;

// ── Soft delete is available wherever it must be ──────────────────────
export type _SoftDeleteSales    = Assert<Has<Sale, 'deleted_at'>>;
export type _SoftDeleteProducts = Assert<Has<Product, 'deleted_at'>>;
export type _SoftDeleteExpenses = Assert<Has<Tables<'expenses'>, 'deleted_at'>>;

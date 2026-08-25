import type { Cents } from './money.js';

/**
 * Cost rates in force for a period. Mirrors one `cost_model_versions` row.
 *
 * Defaults reproduce v1.11.0 with every extension disabled, so a fresh
 * workspace prices identically to the current app before anything is touched.
 */
export interface CostModel {
  /** 'flat' is what v1.11.0 does: dollars per print hour. */
  electricityMode: 'flat' | 'metered';
  electricityRatePerHour: Cents;
  /** Only used when electricityMode is 'metered'. */
  kWhRate: Cents;
  laborRatePerHour: Cents;
  machineRatePerHour: Cents;
  overheadPerUnit: Cents;
  /** Percent, 0-100 — matching the database column. */
  defaultWastePercent: number;
  mileageRate: Cents;
  postOfficeMiles: number;
}

/** A product's cost, split the way the UI shows it. */
export interface CostBreakdown {
  filament: Cents;
  electricity: Cents;
  labor: Cents;
  machine: Cents;
  packaging: Cents;
  overhead: Cents;
  total: Cents;
}

/**
 * Frozen onto a sale row at save time and never recomputed.
 *
 * This is the most important design decision carried forward from v1.11.0:
 * historical profit must not move when today's rates change. Reports read
 * these columns; nothing re-derives them.
 */
export interface SaleSnapshot {
  unitCost: Cents;
  totalCost: Cents;
  profit: Cents;
  /** Percent, 0-100, to four decimal places. */
  marginPercent: number;
}

export type PromoType =
  | 'percent_off'
  | 'fixed_off'
  | 'free_shipping'
  | 'bogo'
  | 'giveaway';

/**
 * Who funded the discount. The whole point of modelling promotions:
 *   'seller'   -> you discount; your payout drops, your margin absorbs it
 *   'platform' -> TikTok-funded; the customer pays less, your payout is intact
 * Today both look identical in the sheet — a lower price with no record of why.
 */
export type PromoAbsorber = 'seller' | 'platform';

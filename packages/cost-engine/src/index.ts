/**
 * @printflow/cost-engine — the ONE cost engine.
 *
 * Pure computation, zero I/O: no networking, no database, no clock, no locale.
 * That constraint is what makes it testable against golden files lifted from
 * the live sheet, and it is why the same module runs unchanged in the Expo app,
 * the web build, and the Stage 2 importer.
 *
 * Reports never recompute any of this — they aggregate over the snapshots this
 * module produces (see MODERNIZATION_PLAN.md §2 and §4).
 *
 * STATUS: scaffold. The formulas land in Stage 1 (tasks 1.4-1.7), written
 * against golden files generated from today's `index.html` code. Writing them
 * before the parity harness exists is how you get plausible-but-wrong numbers.
 */

export * from './money.js';
export * from './types.js';

import { fromDollars, type Cents } from './money.js';
import type { CostModel } from './types.js';

/**
 * v1.11.0's rates, with machine rate, overhead, waste, and metered electricity
 * all off. Sources: index.html SETTINGS and PrintFlow_AppsScript.js
 * DEFAULT_SETTINGS. Kept in sync with migration 005's seeded cost model —
 * a mismatch there would mean a fresh workspace prices differently from a
 * migrated one.
 *
 * NOTE mileageRate: index.html and the Apps Script both default to 0.70, while
 * README.md's settings table documents 0.725. 0.70 matches the two code paths;
 * Stage 2 imports the live sheet's real value over it. Flagged for Tony.
 */
export const COST_MODEL_V1_11_0: CostModel = {
  electricityMode: 'flat',
  electricityRatePerHour: fromDollars(0.17),
  kWhRate: fromDollars(0),
  laborRatePerHour: fromDollars(25.0),
  machineRatePerHour: fromDollars(0),
  overheadPerUnit: fromDollars(0),
  defaultWastePercent: 0,
  mileageRate: fromDollars(0.7),
  postOfficeMiles: 3.6,
};

/**
 * Flipped to true only when task 1.5 proves the engine reproduces every
 * historical product cost and sale profit to the cent. Until then, nothing
 * downstream should treat this module's output as authoritative.
 */
export const PARITY_VERIFIED = false;

/**
 * Cost per gram for a filament lot, in CENTS. Defect 3, expressed once.
 *
 * The unit is in the name deliberately. A bare `lotCostPerGram` invites the
 * reader to assume dollars, and a silent 100x unit error in the one function
 * that prices every product is precisely the class of bug this rewrite exists
 * to eliminate.
 *
 * Returns a fractional value: filament cost per gram is well under a cent, so
 * rounding here would destroy the precision the multiplication needs. Round at
 * the end of the calculation, not in the middle.
 */
export function lotCostPerGramCents(costPerSpool: Cents, spoolWeightGrams: number): number {
  if (spoolWeightGrams <= 0) {
    throw new RangeError(`Spool weight must be positive, got ${spoolWeightGrams}`);
  }
  return costPerSpool / spoolWeightGrams;
}

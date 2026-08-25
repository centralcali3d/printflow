import { describe, expect, it } from 'vitest';
import {
  addCents, ceilCents, fromDollars, subCents, timesQty, timesRate, toDollars,
} from '../src/money.js';
import { COST_MODEL_V1_11_0, PARITY_VERIFIED, lotCostPerGramCents } from '../src/index.js';

describe('money', () => {
  it('parses dollars without floating-point truncation', () => {
    // 34.99 * 100 is 3498.9999999999995 in IEEE 754. Truncating gives $34.98,
    // which is the classic way a ledger quietly loses a cent per row.
    expect(fromDollars(34.99)).toBe(3499);
    expect(fromDollars('34.99')).toBe(3499);
    expect(fromDollars(0.1)).toBe(10);
    // 1.005 * 100 is 100.49999999999999, so a naive Math.round gives $1.00.
    expect(fromDollars(1.005)).toBe(101);
    // The other direction: 34.99 * 100 is 3498.9999999999995.
    expect(fromDollars(2.675)).toBe(268);
    expect(fromDollars(-0.1)).toBe(-10);
  });

  it('round-trips through dollars', () => {
    expect(toDollars(fromDollars(12.99))).toBe(12.99);
  });

  it('adds without drift', () => {
    // 0.1 + 0.2 !== 0.3 in floating point; in cents it is exact.
    expect(addCents(fromDollars(0.1), fromDollars(0.2))).toBe(30);
  });

  it('multiplies by quantity exactly', () => {
    expect(timesQty(fromDollars(34.99), 2)).toBe(6998);
  });

  it('applies a rate and rounds half-up', () => {
    // A 10% TikTok fee on $69.98 leaves $62.982 -> $62.98
    expect(timesRate(fromDollars(69.98), 0.9)).toBe(6298);
  });

  it('ceils for recommended pricing', () => {
    expect(ceilCents(1234.01)).toBe(1235);
    expect(ceilCents(1234)).toBe(1234);
  });

  it('rejects non-integer cents rather than silently rounding', () => {
    expect(() => subCents(fromDollars(1), 0.5 as never)).toThrow(RangeError);
  });

  it('rejects a non-finite amount', () => {
    expect(() => fromDollars(Number.NaN)).toThrow(RangeError);
    expect(() => fromDollars('not a number')).toThrow(RangeError);
  });
});

describe('v1.11.0 cost model', () => {
  it('matches the rates the current app ships', () => {
    expect(COST_MODEL_V1_11_0.electricityRatePerHour).toBe(17);
    expect(COST_MODEL_V1_11_0.laborRatePerHour).toBe(2500);
    expect(COST_MODEL_V1_11_0.postOfficeMiles).toBe(3.6);
  });

  it('has every extension inert', () => {
    // If any of these drift from zero, a fresh workspace stops pricing the way
    // the current app does, and the Stage 1 parity proof becomes meaningless.
    expect(COST_MODEL_V1_11_0.machineRatePerHour).toBe(0);
    expect(COST_MODEL_V1_11_0.overheadPerUnit).toBe(0);
    expect(COST_MODEL_V1_11_0.defaultWastePercent).toBe(0);
    expect(COST_MODEL_V1_11_0.kWhRate).toBe(0);
    expect(COST_MODEL_V1_11_0.electricityMode).toBe('flat');
  });
});

describe('filament cost per gram (defect 3)', () => {
  // Values are CENTS per gram: $12.99/1000g = $0.01299/g = 1.299 cents/g.
  it('prices a 1kg spool', () => {
    expect(lotCostPerGramCents(fromDollars(12.99), 1000)).toBeCloseTo(1.299, 8);
  });

  it('prices a non-1kg spool correctly', () => {
    // The current app treats "Cost per Spool" as cost per kg, so a 750g spool
    // is mispriced by a third.
    expect(lotCostPerGramCents(fromDollars(21.0), 750)).toBeCloseTo(2.8, 8);
  });

  it('agrees with the database generated column', () => {
    // filament_lots.cost_per_g is GENERATED as cost_per_spool / spool_weight_g
    // in DOLLARS. The engine works in cents, so the two must differ by exactly
    // 100x -- verified in the schema suite as 0.012990 and 0.028000.
    expect(lotCostPerGramCents(fromDollars(12.99), 1000) / 100).toBeCloseTo(0.01299, 8);
    expect(lotCostPerGramCents(fromDollars(21.0), 750) / 100).toBeCloseTo(0.028, 8);
  });

  it('refuses a zero spool weight instead of returning Infinity', () => {
    expect(() => lotCostPerGramCents(fromDollars(21.0), 0)).toThrow(RangeError);
  });
});

describe('parity gate', () => {
  it('is not claimed until Stage 1 proves it', () => {
    expect(PARITY_VERIFIED).toBe(false);
  });
});

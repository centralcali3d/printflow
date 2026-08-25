/**
 * Money as integer cents.
 *
 * Binary floating point cannot represent 0.10, and this package decides what
 * the business believes it earned. Every monetary value inside the engine is
 * an integer number of cents; conversion happens only at the edges.
 *
 * The current app uses raw JS numbers throughout (`price * qty`,
 * `subtotal * (1 - ttPct/100)`), which is survivable at its scale but is
 * exactly the kind of thing that produces a tax total off by a few cents with
 * no traceable cause.
 */

/** An integer count of cents. Negative means a loss or a refund. */
export type Cents = number & { readonly __brand: 'Cents' };

export function cents(n: number): Cents {
  if (!Number.isFinite(n)) throw new RangeError(`Not a finite number: ${n}`);
  if (!Number.isInteger(n)) throw new RangeError(`Cents must be an integer, got ${n}`);
  return n as Cents;
}

/**
 * Parse a decimal dollar amount (34.99, "34.99") into cents, half-up.
 *
 * The `toFixed(6)` step is not decoration. Scaling by 100 reintroduces the
 * exact representation error this module exists to avoid, in both directions:
 *
 *   34.99 * 100 === 3498.9999999999995   (truncating gives $34.98)
 *   1.005 * 100 === 100.49999999999999   (rounding gives $1.00, not $1.01)
 *
 * Normalising to six decimals collapses that error before the rounding
 * decision, so half-up means half-up. Six is chosen because it is far beyond
 * any real monetary precision but well inside a double's exact integer range
 * for the magnitudes this app sees.
 */
export function fromDollars(value: number | string): Cents {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) throw new RangeError(`Not a valid dollar amount: ${value}`);
  return cents(Math.round(Number((n * 100).toFixed(6))));
}

export function toDollars(c: Cents): number {
  return c / 100;
}

export function addCents(...values: Cents[]): Cents {
  return cents(values.reduce<number>((sum, v) => sum + v, 0));
}

export function subCents(a: Cents, b: Cents): Cents {
  return cents(a - b);
}

/** Multiply by an integer quantity. */
export function timesQty(c: Cents, qty: number): Cents {
  if (!Number.isInteger(qty)) throw new RangeError(`Quantity must be an integer, got ${qty}`);
  return cents(c * qty);
}

/**
 * Multiply by a real-valued rate (a percentage, an hourly rate, grams).
 * Rounds half-up to the nearest cent — the same direction the current app's
 * `toFixed(2)` display rounding takes, so parity holds.
 */
export function timesRate(c: Cents, rate: number): Cents {
  if (!Number.isFinite(rate)) throw new RangeError(`Not a finite rate: ${rate}`);
  return cents(Math.round(c * rate));
}

/** Round a fractional cent value that arose mid-calculation. */
export function roundCents(value: number): Cents {
  if (!Number.isFinite(value)) throw new RangeError(`Not a finite value: ${value}`);
  return cents(Math.round(value));
}

/** Ceiling to the next whole cent — used by recommended-price calculations. */
export function ceilCents(value: number): Cents {
  if (!Number.isFinite(value)) throw new RangeError(`Not a finite value: ${value}`);
  return cents(Math.ceil(value));
}

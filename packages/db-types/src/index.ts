/**
 * @printflow/db-types — generated Postgres types, plus ergonomic aliases.
 *
 * `database.types.ts` is GENERATED. Do not hand-edit it; run `pnpm db:types`
 * from the repo root after any migration.
 *
 * This package is the drift test (plan task 0.11). Defect 4 in
 * MODERNIZATION_PLAN.md §1 is that column names live as string literals in two
 * files that must agree, with nothing to catch it when they stop agreeing —
 * which is the direct cause of defect 1, where `saveProduct()` wrote a
 * 'Packaging' key that `writeRow()` silently dropped because TABS.Products had
 * no such column. Every product has been costed at $1.25 ever since.
 *
 * With generated types, that same mistake is a compile error. Nothing to
 * remember, nothing to review for.
 *
 * Two layers guard it:
 *   1. Compile time — code referencing a renamed column fails typecheck.
 *   2. Freshness    — `pnpm db:types:check` fails if the committed types no
 *                     longer match the migrations. Runs in CI.
 */

export type { Database, Json } from './database.types.js';

import type { Database } from './database.types.js';

type PublicSchema = Database['public'];

/** A row as read from a table. */
export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row'];

/** The shape accepted by an insert — optional columns are those with defaults. */
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];

/** The shape accepted by an update. */
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];

/** A row from one of the `v_*` live-row views. */
export type Views<T extends keyof PublicSchema['Views']> =
  PublicSchema['Views'][T]['Row'];

/** A database enum, e.g. `Enums<'promo_absorber'>` is 'seller' | 'platform'. */
export type Enums<T extends keyof PublicSchema['Enums']> =
  PublicSchema['Enums'][T];

/** Arguments for a `report_*` function or RPC. */
export type FunctionArgs<T extends keyof PublicSchema['Functions']> =
  PublicSchema['Functions'][T]['Args'];

/** Return type of a `report_*` function or RPC. Set-returning functions give an array. */
export type FunctionReturns<T extends keyof PublicSchema['Functions']> =
  PublicSchema['Functions'][T]['Returns'];

/**
 * A single row from a set-returning function.
 *
 * Every `report_*` function returns a table, so `FunctionReturns` is an array
 * and reaching for a column on it silently fails. This unwraps to the row.
 */
export type FunctionRow<T extends keyof PublicSchema['Functions']> =
  FunctionReturns<T> extends readonly (infer R)[] ? R : FunctionReturns<T>;

/** Table names, useful for generic helpers. */
export type TableName = keyof PublicSchema['Tables'];

// ── Generated columns ─────────────────────────────────────────────────
//
// `supabase gen types` does NOT exclude GENERATED ALWAYS columns from the
// Insert and Update shapes, so plain `TablesInsert<'filament_lots'>` will let
// you assign `cost_per_g`. Postgres then rejects it at runtime (SQLSTATE
// 428C9), which the schema verification suite asserts.
//
// A runtime error for something the compiler could have caught is a wasted
// round trip, so `SafeInsert` / `SafeUpdate` omit them. Add an entry here
// whenever a migration introduces a generated column.

/** Columns Postgres computes. Never writable by a client. */
export interface GeneratedColumnMap {
  filament_lots: 'cost_per_g';
}

type GeneratedFor<T extends TableName> =
  T extends keyof GeneratedColumnMap ? GeneratedColumnMap[T] : never;

/** Insert shape with database-generated columns removed. Prefer this. */
export type SafeInsert<T extends TableName> = Omit<TablesInsert<T>, GeneratedFor<T>>;

/** Update shape with database-generated columns removed. Prefer this. */
export type SafeUpdate<T extends TableName> = Omit<TablesUpdate<T>, GeneratedFor<T>>;

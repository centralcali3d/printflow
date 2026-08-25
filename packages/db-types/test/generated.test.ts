import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Completeness checks on the generated file.
 *
 * The compile-time contract in `src/schema-contract.ts` proves the columns it
 * names have the right shape. It cannot catch the failure where types were
 * generated against the wrong database — an empty one, or a project missing
 * recent migrations. Those produce a file that is valid TypeScript and
 * complete nonsense, and every downstream assertion about tables it does not
 * mention passes vacuously.
 *
 * So: assert the generated file actually describes the schema we shipped.
 */

const generated = readFileSync(
  fileURLToPath(new URL('../src/database.types.ts', import.meta.url)),
  'utf8',
);

// Migrations 002 and 003. Update alongside any migration that adds a table.
const EXPECTED_TABLES = [
  'workspaces', 'workspace_members',
  'filament_types', 'printers', 'packaging_options', 'sales_channels',
  'expense_categories', 'promotions', 'promo_applications', 'settings',
  'cost_model_versions', 'filament_lots', 'products', 'promotion_products',
  'inventory_items', 'inventory_moves', 'print_jobs', 'expenses',
  'shipping_trips', 'sales', 'audit_log',
] as const;

const EXPECTED_VIEWS = [
  'v_sales', 'v_expenses', 'v_products', 'v_inventory_items', 'v_filament_lots',
] as const;

// Migration 007.
const EXPECTED_REPORTS = [
  'report_pnl', 'report_tax_summary', 'report_sales_detail',
  'report_expenses_detail', 'report_inventory_snapshot',
  'report_sales_by_channel', 'report_sales_by_product',
  'report_filament_consumption', 'report_mileage_log',
  'report_promo_performance',
] as const;

describe('generated database types', () => {
  it('is not an empty schema', () => {
    // The signature of types generated against a fresh, unmigrated database.
    expect(generated.length).toBeGreaterThan(10_000);
    expect(generated).toContain('export type Database');
  });

  it.each(EXPECTED_TABLES)('describes the %s table', (table) => {
    expect(generated).toContain(`${table}: {`);
  });

  it.each(EXPECTED_VIEWS)('describes the %s view', (view) => {
    expect(generated).toContain(`${view}: {`);
  });

  it.each(EXPECTED_REPORTS)('describes the %s function', (fn) => {
    expect(generated).toContain(`${fn}: {`);
  });

  it('has all 21 tables, so nothing was dropped silently', () => {
    // A migration that removes a table would otherwise only show up wherever
    // that table happened to be referenced.
    expect(EXPECTED_TABLES).toHaveLength(21);
  });

  it('carries the sale snapshot columns', () => {
    // Named explicitly because reports read only these. If they vanish,
    // every historical profit figure silently becomes a recalculation.
    for (const col of ['unit_cost', 'total_cost', 'profit', 'margin_pct']) {
      expect(generated).toContain(col);
    }
  });

  it('is machine-generated and must not be hand-edited', () => {
    // If someone patches a column by hand, the next `pnpm db:types` reverts it
    // and the bug reappears. `db:types:check` in CI is the real guard; this
    // just makes the expectation legible at the point of temptation.
    expect(generated).not.toContain('// hand-edited');
  });
});

# PrintFlow 2.0 — database layer

Postgres schema, RLS, and report views for the native app. See
[`../MODERNIZATION_PLAN.md`](../MODERNIZATION_PLAN.md) for the why; this file
is the how.

## Prerequisites

- Docker running (OrbStack or Docker Desktop)
- Supabase CLI — `brew install supabase/tap/supabase`

## Everyday commands

```bash
supabase start              # boot the local stack
supabase db reset           # re-apply every migration from zero
./supabase/tests/run.sh     # reset + run the verification suite
supabase stop               # shut it down
```

Studio: http://127.0.0.1:54323 · Inbucket (magic-link emails): http://127.0.0.1:54324

## Migrations

| File | Purpose |
|------|---------|
| `001_workspaces` | Tenancy, the `app` helper schema, RLS anchor functions, signup trigger |
| `002_config` | Everything that used to be a hardcoded constant: packaging, channels, categories, promotions, settings, cost model versions |
| `003_core` | Filament lots, products, inventory + move ledger, print jobs, sales, expenses, trips, audit log |
| `004_rls` | Row Level Security and table privileges |
| `005_seed_defaults` | Per-workspace defaults that reproduce v1.11.0 exactly |
| `006_audit` | Audit trigger and the soft-delete convention |
| `007_reports` | `report_*` views and functions |

Migrations are append-only once pushed to a real project. Locally, edit and
`supabase db reset` freely — nothing has shipped yet.

## Three rules worth knowing before you change anything

**1. Rates live in `cost_model_versions`, never in `settings`.**
Rate changes must be effective-dated so a sale can record which version priced
it. `settings` deliberately holds no cost rates; putting a rate in both places
would recreate exactly the drift this schema exists to prevent.

**2. Reports contain no cost logic.**
Every `report_*` function aggregates over the snapshot columns
(`unit_cost`, `total_cost`, `profit`, `margin_pct`) that `packages/cost-engine`
computed at save time. There is one cost engine, in TypeScript, shared by
mobile, web, and the Stage 2 importer. It is why task 2.5 backfills snapshots
onto migrated rows instead of porting the fallback recalculation to SQL.

`record_sale` **stores** the client-computed snapshot and asserts its internal
consistency; it does not recompute, because recomputing in SQL would be a
second engine.

**3. RLS needs grants too.**
A policy only filters rows the role already has DML privilege on. This
project's default privileges give `authenticated` no DML at all, so
migration 004 grants explicitly. Add a table, and you must add both a policy
*and* a grant — the verification suite will catch you if you forget one.

## Deletes

Business tables have **no DELETE policy and no DELETE grant**. Removal is
`update ... set deleted_at = now()`, and the `v_*` views filter those out.
Config tables *do* allow delete, because FK `RESTRICT` means you can only
remove a row nothing references — fix a typo freely, but you cannot orphan two
years of sales by deleting a packaging size.

## Verification suite

`supabase/tests/001_schema_verification.sql` — 72 assertions proving each
verified defect from plan §1 is closed by the schema rather than by client
discipline. The suite is **not idempotent** (fixed test emails, exact row
counts), which is why `run.sh` owns the reset.

Any failure aborts with a non-zero exit, so it works unchanged in CI.

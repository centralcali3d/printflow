# PrintFlow 2.0 — Session Handoff
*Written 2026-08-20 · Revised 2026-08-21 (stack changed, see §0) · Stage 0 database half complete*

Cold-start doc. Read §0–§4, run one command to confirm the ground is still
solid, then start at §5.

---

## 0. The stack changed on 2026-08-21

**We are no longer building native SwiftUI.** The web app was promoted from
read-only reporting to a **full peer**, which reopened Q1 and reversed it.

Why: once a browser can record a sale, it needs a live profit preview and must
write the cost snapshot — meaning a cost engine in the browser. Keeping native
would have forced either two cost engines (the exact failure this rebuild
exists to prevent) or two complete frontends maintained by one person. One
shared TypeScript codebase avoids both and restores OTA updates.

Now: **Expo (React Native + Expo Router) → iPhone, iPad, web from one
codebase.** Offline was also downgraded (Q7) — you're usually connected, so
cached reads and honest write failures replace local-first sync. That deleted
GRDB, the outbox, conflict resolution, and most of Stage 7.

**Everything from the database half of Stage 0 survived unchanged** — schema,
RLS, report views, all 72 assertions. It was always stack-independent. The
Swift scaffold was discarded (recoverable at commit `45ba4d8`); it had no
formula in it, which is why this was the cheapest possible moment to switch.

**Canonical references** — this file is *status*; those are *truth*:
- [`MODERNIZATION_PLAN.md`](MODERNIZATION_PLAN.md) — architecture, decisions, all 95 tasks
- [`supabase/README.md`](supabase/README.md) — database layer, how to run it

---

## 1. Sixty-second orientation

PrintFlow today is a single-file PWA (`index.html`, 2,111 lines) talking to
Google Apps Script over a Google Sheet. It works and it is **still the
production path** — nothing in this rebuild has touched it.

We are rebuilding it as **one Expo codebase serving iPhone, iPad, and web**,
backed by Supabase. See §0 for why this reversed from native SwiftUI on day two.

The thing to internalise: **the database is the product's spine.** Seven
migrations already close, structurally, defects that the current app can only
avoid by careful client code. The frontend is a view over that; the schema is
where correctness lives.

## 2. Where we are

Stage 0 is the foundation. Its database half is done and verified; the app half
is not started.

| Task | Status | Notes |
|------|--------|-------|
| 0.1 Supabase projects | ⚠️ **blocked on Tony** | Local dev fully working. Creating the *cloud* dev/prod projects needs his account. Nothing else is blocked by it. |
| 0.2 Repo layout | ✅ | pnpm workspace: `packages/cost-engine`, `supabase/`, `tools/migration/`. `apps/printflow` not yet created — that's 0.12. |
| 0.3 CLI + local dev | ✅ | Supabase CLI 2.115.0, migrations versioned |
| 0.4–0.10 Migrations | ✅ | 7 migrations, 1,569 lines → 21 tables, 5 views, 10 report functions, 43 RLS policies |
| 0.11 Generated types | ⬜ **next** | `pnpm db:types` script exists; needs running + committing. This *is* the drift test. |
| 0.12 Expo skeleton | ⬜ | `apps/printflow` |
| 0.13 TanStack Query + connection state | ⬜ | Much smaller than the old GRDB task |
| 0.14 Reproducible from zero | ✅ (db) | `supabase db reset` verified repeatedly. "Boots on all three targets" waits on 0.12. |
| 0.15 CI | ✅ | Retargeted to ubuntu/Node. **Never executed** — nothing pushed. |

`packages/cost-engine` builds, typechecks, and passes 15 tests. It is
**scaffold only** — integer-cents money handling plus the v1.11.0 rate
constants. There is deliberately **no formula** in it; Stage 1 writes those
against golden files.

## 3. Environment (things that will waste your time otherwise)

- Docker runtime is **OrbStack**, not Docker Desktop. `open -a Docker` fails; use `open -a OrbStack`. Check with `docker info` before any supabase command.
- Xcode 27 beta is installed and will be needed again for EAS/native builds, but not for day-to-day work. Note `xcodebuild -version` works; `--version` errors.
- **macOS is case-insensitive; CI is not.** The workspace dir is `packages/` (lowercase). A `mkdir packages` next to an existing `Packages` silently merges locally and breaks on Linux. Verify casing with `python3 -c "import os; print('packages' in os.listdir('.'))"`.
- **`psql` is not installed on the host.** Reach the database through the container:
  ```bash
  docker exec -i supabase_db_PrintFlow psql -U postgres -d postgres
  ```
- Node 26, pnpm 9.15.0, Supabase CLI 2.115.0, Postgres 17.6.
- Local containers may still be running from last night. `supabase stop` to free them, `supabase start` to bring them back.

## 4. Confirm the ground is solid

One command. It owns its own reset, so it's the whole gate:

```bash
./supabase/tests/run.sh
```

Expect **72 assertions** and `✓ schema verification passed`. If it fails, stop
and read the failure before writing anything new — that suite is the only thing
standing between us and silently wrong money.

The suite is **not idempotent** (fixed test emails, exact row counts), which is
why the runner resets rather than trusting you to have done it.

And the engine side:

```bash
pnpm install && pnpm typecheck && pnpm test
```

Expect 15 tests passing in `packages/cost-engine`.

## 5. Next up — Stage 0 tasks 0.11–0.13

### 0.11 — Generated database types

```bash
pnpm db:types    # supabase gen types typescript --local
```

Commit the output. This replaces what was going to be hand-written Swift
`Codable` models plus a custom drift test — with generated types, **a column
rename becomes a compile error for free**. That closes defect class 4, which is
the root cause of defect 1 (the packaging column that silently vanished). It is
the single highest value-per-effort task in Stage 0.

Wire it into CI so a schema change that outruns the committed types fails the
build.

### 0.12 — Expo skeleton

Create `apps/printflow`. Expo Router, session provider, Supabase client reading
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Only ever the **publishable/anon** key. It is safe in a client precisely
because RLS (migration 004) is what enforces access — the key identifies the
project, it does not grant permission. The `service_role` key bypasses RLS
entirely and must never reach a bundle.

Layout per plan §5: five tabs on phone (Home / Queue / Sell / Stock / More),
sidebar + split view on iPad and desktop — **one responsive layout now**, since
web is a peer rather than a separate reporting surface.

Exit criterion is all three targets booting: iOS simulator, iPad simulator, and
`expo start --web`.

### 0.13 — TanStack Query + connection state

Persisted cache so a cold launch on a flaky connection shows real data instead
of a spinner. Plus the connection indicator in the header.

Deliberately **not** a sync engine. Per Q7 writes require a connection and fail
honestly with retry — they never silently queue. Quietly accepting a sale that
did not save is worse than any spinner.

## 6. Traps already found — do not reintroduce

Four real bugs surfaced during Stage 0 verification. Two would have been silent
showstoppers, so they're worth knowing before you add a table:

1. **RLS needs grants too.** A policy only filters rows the role already has DML privilege on. This project's default privileges give `authenticated` *no* DML, so every policy would have filtered an empty set — the app shows zero rows, no error. **Adding a table means adding both a policy and a grant.** Migration 004 grants explicitly for exactly this reason.
2. **Never write `FOR ALL` on `workspace_members`.** `FOR ALL` includes SELECT, and a membership check that reads `workspace_members` from a policy *on* `workspace_members` recurses infinitely. Route through `app.user_workspace_ids()` / `app.user_admin_workspace_ids()` — that's what the SECURITY DEFINER is for.
3. **`workspaces` has no `workspace_id` column** — its own `id` is the scope. The audit trigger special-cases it; anything else scoping by `workspace_id` must too, or the rows become invisible to everyone including their own members.
4. **Generated columns evaluate before CHECK constraints.** `cost_per_g` uses a defensive `CASE` so a zero spool weight surfaces the check's readable message instead of a raw `division by zero`.

And one that was the *test's* fault, which is the more instructive kind:
`SET LOCAL` is a no-op under psql autocommit, so the RLS section ran as
superuser and passed vacuously. The suite now asserts
`current_user = 'authenticated'` before testing isolation. **A test that cannot
fail is worse than no test** — if you add isolation tests, prove the role
switched first.

## 7. The two invariants

Breaking either silently corrupts historical business numbers. Everything else
is negotiable; these are not.

**One cost engine, in TypeScript.** `packages/cost-engine` is the only place
cost is computed, shared by mobile, web, and the Stage 2 importer. Reports never recompute — every `report_*` function aggregates over
the snapshot columns (`unit_cost`, `total_cost`, `profit`, `margin_pct`) written
at save time. This is what lets the web reporting page be a static file.

Known exception, tracked: `report_inventory_snapshot` needs the *current* cost
of on-hand stock, which has no sale to snapshot against. It returns **placeholder
zeros** and says so in its `COMMENT`. Task 3.4 owns a `product_cost_cache`
column maintained by the engine. Do not "fix" this by computing cost in SQL —
that creates the second engine this whole design exists to prevent.

**Rates live only in `cost_model_versions`**, effective-dated, never in
`settings`. A sale records which version priced it, so "why was this March sale
priced this way" has an answer. `settings` deliberately holds no cost rates.

## 8. Needs Tony

| # | What | Blocks |
|---|------|--------|
| 1 | Create the Supabase cloud dev + prod projects | Task 0.1 only. Local dev needs nothing. |
| 2 | **Mileage rate: 0.70 or 0.725?** `index.html` and the Apps Script both default to 0.70; `README.md`'s settings table documents 0.725. Seeded 0.70 to match the code; Stage 2 imports the sheet's real value over it. Worth confirming for this tax year. | Nothing yet — correctness later |
| 3 | Confirm the 0.12 target decision (§5) | Task 0.12 |
| 4 | **Real packaging size per product** (12 products, one pass). Because of defect 1 this was never written to the sheet, so it cannot be migrated — only re-entered. | Task 2.3 |
| 5 | Q5 — accept the three intentional cost deltas | Task 1.8, once the delta report exists |

## 9. Git state

All work is on branch **`feat/printflow-2-foundation`**, branched from `8b6bcd5`:

| Commit | Contents |
|--------|----------|
| `52cd9bd` | Plan and handoff docs, README/context redirects, `.gitignore` |
| `170c556` | 7 migrations, RLS, report views, 72-assertion verification suite |
| `45ba4d8` | *(superseded)* Swift `PrintFlowCore` scaffold and macOS CI |
| `dd3172a` | Handoff git-state section |
| `a7610b3` | **Stack change to Expo.** Replaces the Swift scaffold with `packages/cost-engine`, retargets CI to Node, updates every doc |

The Swift scaffold is recoverable at `45ba4d8` if the decision is ever revisited.

Working tree is clean. **Nothing has been pushed** — no remote branch, and CI
has therefore never run.

To pick up:

```bash
git checkout feat/printflow-2-foundation
pnpm install && pnpm test      # 15 tests, cost-engine
./supabase/tests/run.sh        # 72 assertions, schema
```

Push when ready. Expect the first CI run to need a fix — it has never executed,
and it was rewritten from macOS/Swift to ubuntu/Node without being run.

## 10. What was deliberately not done

So you don't go looking for it or assume it was missed:

- **No cost formula in `packages/cost-engine`.** Stage 1 tasks 1.2–1.5 build it against golden files lifted from the live sheet. Writing it before the parity harness exists is how you end up with plausible-but-wrong numbers. The package today is money handling plus the v1.11.0 rate constants.
- **No CI run.** The workflow is written but nothing has been pushed, so it has never executed. Expect to fix something on first run.
- **`tools/migration/` holds only a `.gitkeep`** describing what goes there. Stage 2. (Git does not track empty directories, so the placeholder is what makes the layout survive a clone.) `web-reports/` is gone — the web app is now `apps/printflow`, the same codebase as mobile.
- **`index.html`, `PrintFlow_AppsScript.js`, and the `WKWebView` shell are untouched.** Production keeps working throughout.

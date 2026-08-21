# PrintFlow 2.0 — Session Handoff
*Written 2026-08-20 · Stage 0 (database half complete) → next up: Stage 0 tasks 0.11–0.13*

Cold-start doc. Read §1–§4, run one command to confirm the ground is still
solid, then start at §5.

**Canonical references** — this file is *status*; those are *truth*:
- [`MODERNIZATION_PLAN.md`](MODERNIZATION_PLAN.md) — architecture, decisions, all 95 tasks
- [`supabase/README.md`](supabase/README.md) — database layer, how to run it

---

## 1. Sixty-second orientation

PrintFlow today is a single-file PWA (`index.html`, 2,111 lines) talking to
Google Apps Script over a Google Sheet. It works and it is **still the
production path** — nothing in this rebuild has touched it.

We are rebuilding it as a **native SwiftUI app for iPhone and iPad on
Supabase**, plus a thin read-only web reporting page. That decision is made and
recorded; don't re-open it. The short version of why native won: browser access
was scoped to reporting only, which removed React Native's main advantage and
left SwiftUI's `Table`/`NavigationSplitView` as the better fit for dense data.

The accepted cost is **no OTA updates** — a real regression from today's
push-to-GitHub-Pages workflow. That is why runtime configurability (Stage 5,
Settings) is load-bearing rather than a nice-to-have: every setting that's
editable in-app is one fewer reason to ship a build.

## 2. Where we are

Stage 0 is the foundation. Its database half is done and verified; the Swift
half is not started.

| Task | Status | Notes |
|------|--------|-------|
| 0.1 Supabase projects | ⚠️ **blocked on Tony** | Local dev fully working. Creating the *cloud* dev/prod projects needs his account. Nothing else is blocked by it. |
| 0.2 Repo layout | ✅ | `Packages/PrintFlowCore`, `supabase/`, `web-reports/`, `tools/migration/`, `fixtures/legacy/` |
| 0.3 CLI + local dev | ✅ | Supabase CLI 2.115.0 via brew, migrations versioned |
| 0.4–0.10 Migrations | ✅ | 7 migrations, 1,569 lines → 21 tables, 5 views, 10 report functions, 43 RLS policies |
| 0.11 supabase-swift + Codable models + drift test | ⬜ **next** | |
| 0.12 SwiftUI skeleton | ⬜ | |
| 0.13 GRDB local mirror | ⬜ | |
| 0.14 Reproducible from zero | ✅ (db) | `supabase db reset` verified repeatedly. "Boots on both simulators" waits on 0.12. |
| 0.15 CI | ✅ | `.github/workflows/ci.yml` — written but **never executed**, nothing pushed yet |

`PrintFlowCore` builds under Swift 6 strict concurrency with 4 tests green. It
is **scaffold only** — `CostModel`, `CostBreakdown`, `SaleSnapshot` fix the
shape Stage 1 will assert against. There is no formula in it yet, deliberately.

## 3. Environment (things that will waste your time otherwise)

- Docker runtime is **OrbStack**, not Docker Desktop. `open -a Docker` fails; use `open -a OrbStack`. Check with `docker info` before any supabase command.
- `xcodebuild -version` works; `xcodebuild --version` errors. Xcode 27 beta at `/Applications/Xcode-beta.app`.
- **`psql` is not installed on the host.** Reach the database through the container:
  ```bash
  docker exec -i supabase_db_PrintFlow psql -U postgres -d postgres
  ```
- Swift 6.4, Node 26, Supabase CLI 2.115.0, Postgres 17.6.
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

## 5. Next up — Stage 0 tasks 0.11–0.13

### 0.11 — supabase-swift, Codable models, drift test

Add `supabase-swift` **v2.55.1** (latest as of 2026-08-13) to the Xcode project.

Write `Codable` structs mirroring the 21 tables. Then the part that matters: a
test that **fails when Postgres and Swift disagree**. This is what kills defect
class 4 (schema drift), which is the root cause of defect 1 — so it is worth
more than it looks. Suggested approach: query
`information_schema.columns` and assert the column set matches each struct's
`CodingKeys`. Cheap to write, catches every future rename.

Only the **publishable/anon** key ever goes in the app. See
`Native/PrintFlow/Config/Secrets.example.xcconfig` — copy to `Secrets.xcconfig`
(gitignored) and wire it up in Build Settings. The template documents the
xcconfig `//` gotcha that silently truncates URLs.

### 0.12 — SwiftUI skeleton

`TabView` on iPhone, `NavigationSplitView` on iPad, session provider, Supabase
client. Five tabs per plan §5: Home / Queue / Sell / Stock / More.

**One decision to make here, flagged rather than pre-decided:** the existing
`Native/PrintFlow` target is the `WKWebView` shell. Does the native app take
over that target, or become a second one?

Recommendation: **take over the target.** The shell's value was always as a
transitional fallback, and the real fallback is the PWA in Safari, which is
unaffected. Keeping a second target alive costs maintenance for a path nobody
will use. Tony should confirm, since it means the shell stops being installable
once he takes a new build.

### 0.13 — GRDB local mirror

Add **GRDB v7.11.1**. Mirror the Postgres schema locally; local DB is the read
source *always*, so screens work offline with no special-casing.

Full local-first mechanics are Stage 7 — 0.13 is just the schema and migration
runner. One thing to get right even in the skeleton, because retrofitting it is
painful: **quantity conflicts must replay as `inventory_moves` deltas, never
overwrite a total.** That is the reason the move ledger exists.

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

**One cost engine, in Swift.** `Packages/PrintFlowCore` is the only place cost
is computed. Reports never recompute — every `report_*` function aggregates over
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

## 9. Uncommitted — read before you start

**22 new files sit in the working tree on `main`, uncommitted** (plus 3 modified: `.gitignore`, `README.md`, `PRINTFLOW_PROJECT_CONTEXT.md`). HEAD is still
`8b6bcd5 Configure native app icon asset`.

Nothing sensitive is tracked (verified with `git check-ignore`): `*.xcconfig` is
ignored except the example, `fixtures/legacy/*.csv` is ignored because it will
hold real business data, and `.build/` is ignored.

Recommended first action — branch, don't commit Stage 0 straight to `main`:

```bash
git checkout -b feat/printflow-2-foundation && git add -A && git status
```

Then review and commit. Suggested split: migrations + tests as one commit,
`PrintFlowCore` scaffold + CI as a second.

## 10. What was deliberately not done

So you don't go looking for it or assume it was missed:

- **No cost formula in `PrintFlowCore`.** Stage 1 tasks 1.2–1.5 build it against golden files lifted from the live sheet. Writing it before the parity harness exists is how you end up with plausible-but-wrong numbers.
- **No CI run.** The workflow is written but nothing has been pushed, so it has never executed. Expect to fix something on first run.
- **`web-reports/` and `tools/migration/` hold only a `.gitkeep`** describing what goes there. Stage 4 and Stage 2 respectively. (Git does not track empty directories, so the placeholders are what make the repo layout survive a clone.)
- **`index.html`, `PrintFlow_AppsScript.js`, and the `WKWebView` shell are untouched.** Production keeps working throughout.

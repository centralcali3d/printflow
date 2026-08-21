# PrintFlow 2.0 — Modernization Plan
*Created: 2026-08-20 · Architecture decided: 2026-08-20*
*Supersedes the Phase 1 hybrid-shell direction in `NATIVE_APP_ROADMAP.md`*

Target: a polished **native SwiftUI app for iPhone and iPad**, backed by
Supabase instead of Google Sheets, fully configurable without code changes,
with a **thin read-only web reporting page** for browser access.

Constraints carried forward from the current app:
1. **Lose nothing.** Every existing feature, formula, and historical row survives.
2. **Configurable.** Rates, categories, channels, packaging, promotions, and printers are data, not code.
3. **Exportable.** CSVs, real reports, and a full backup — shared straight from the device.

### Decisions on record

| # | Decision | Choice |
|---|----------|--------|
| Q1 | Client stack | **Native SwiftUI, iPhone + iPad.** One multiplatform target. |
| Q2 | Tenancy | **Build `workspaces` now.** Cheap now, expensive to retrofit. |
| Q3 | Distribution | **Deferred to Stage 8.** Nothing in Stages 0–7 depends on it. |
| Q4 | Web app role | **Read-only reporting page.** Reports computed in Postgres. |
| Q5 | Cost deltas | Open — decided at task 1.8, once the delta report exists. |
| Q6 | Sheet after cutover | Open — decided at Stage 8. |

Mac is **not** a target, but SwiftUI multiplatform means adding one later is a
new target rather than a rewrite. Task 8.9 keeps that door open.

---

## 1. Why replace the Sheets backend (not wrap it)

`NATIVE_APP_ROADMAP.md` recommended a `WKWebView` shell first, and that shell
now exists and works. It was the right call for a one-month test build. It is
the wrong foundation for a polished app, because the problems are in the data
layer, not the presentation layer.

### Verified defects in the current stack

| # | Defect | Evidence | Consequence |
|---|--------|----------|-------------|
| 1 | Products `Packaging` never persists | `saveProduct()` writes `'Packaging'`; `TABS.Products` has no such column; `writeRow()` maps only against `TABS[tab]` | Every product silently costs Small Box ($1.25). Medium/Large selections are discarded. Product cost, margin, and pricing recommendations are all slightly wrong. |
| 2 | Sales do not decrement inventory | `saveSale()` writes the Sales row only | `Qty Available` / `Qty Sold` are hand-maintained. Velocity, days-remaining, build-to, and auto-queue all drift from reality. |
| 3 | Filament cost ignores color and spool weight | `filCostPerKg(type)` (index.html:913) does `find(f => f.Type === type)` and returns `Cost per Spool ($)` as $/kg | All colors of a type inherit the first row's price. Non-1kg spools are mispriced. Silent $12.99 fallback hides missing data. |
| 4 | No schema enforcement | Column names are string literals in two files that must agree | Defect 1 is the general case. Any rename breaks silently, with no error. |
| 5 | No transactions | Each `api()` call is an independent HTTP request | A sale that saves but fails mid-flow leaves inventory and filament inconsistent, with no rollback. |
| 6 | Backend is publicly writable | Apps Script deployed "Execute as: Me / Who has access: Anyone" | Anyone with the `/exec` URL can read and write the business ledger. No auth, no audit trail. |
| 7 | Deletes are permanent | `deleteRow()` removes the sheet row | One mis-tap destroys a tax record with no undo. |
| 8 | `refreshQueue()` duplicates jobs | No dedupe against existing pending rows | Running it twice doubles the queue. |
| 9 | Deployment is fragile | New Apps Script deployment = new URL = update on every device | Documented in the roadmap as a known pain point. |
| 10 | Filament deducts on stock-add, never on failure or waste | `deductFilament()` uses product grams exactly | No purge/support/failed-print allowance. Filament on-hand reads high. |

Items 1–5 and 7–8 are all the same root cause: **an untyped, transactionless
store with business logic scattered across the client.** Postgres with a typed
schema, foreign keys, constraints, and RPC transactions eliminates the entire
class. That is the actual argument for Supabase — not "it's more modern."

### What the current stack got right (keep it)

- The **cost model** is sound and hard-won: filament + electricity + labor + packaging, with channel-aware payout.
- **Sale-time snapshots** (`Unit Cost`, `Total Cost`, `Profit`, `Margin`) are exactly right — historical profit must not move when today's rates change. This is the single most important design decision in the app and it carries forward unchanged.
- The **prefer-snapshot-then-recalculate fallback** in reporting is the correct migration pattern.
- **Tax-first thinking** — cost-basis inventory valuation, IRS mileage logging, Schedule C awareness.
- The **visual identity** (Syne + DM Mono, dark surfaces, violet/cyan accents, semantic status colors) is genuinely good and becomes the design system.

---

## 2. Stack

**Native SwiftUI for iPhone and iPad, on Supabase, with reports computed in Postgres.**

| Layer | Choice | Why |
|-------|--------|-----|
| App | SwiftUI, one multiplatform target, iOS/iPadOS 17+ | Best possible feel on Apple devices. Reuses the existing `Native/PrintFlow` Xcode project. |
| Language | Swift 6, strict concurrency | Compile-time data-race safety on a data-heavy app. |
| Tables | SwiftUI `Table` (iPad) / `List` (iPhone) | Sortable native columns on iPad — better tables than the current web app has. |
| Charts | Swift Charts | First-party, and enough for dashboard trends. |
| Data | Supabase Postgres + `supabase-swift` | Typed schema, foreign keys, constraints, RLS, transactions. |
| Local store | **GRDB (SQLite)** mirror + outbox | Local-first reads and queued writes. Chosen over SwiftData: explicit SQL control matters when mirroring a Postgres schema, and it's far more battle-tested for sync. |
| Auth | Sign in with Apple + email magic link | Native `ASAuthorizationController`; magic link covers the web reporting page. |
| Writes | Postgres functions (RPC) | Atomic multi-table writes — see §3. |
| Reports | Postgres views + `report_*` functions | Computed once, in SQL, consumed by both the app and the web page. |
| Cost engine | `PrintFlowCore` Swift package — pure, no I/O | One implementation, unit tested against golden files. |
| Export | `ShareLink`, `.fileExporter`, PDF via `ImageRenderer` | Native share sheet → Files, AirDrop, Mail to the CPA. |
| Web reports | Static page, `supabase-js`, no framework | Reads the same SQL views over PostgREST. Deploys to GitHub Pages, keeping that path alive. |
| CI | GitHub Actions on a macOS runner | `xcodebuild test`, SwiftLint, `supabase db lint`. |

### Why this beats the Expo option here

The dense-table problem that would have pushed React Native toward card lists on
phone is simply not a problem natively — `Table` and `NavigationSplitView` on
iPad are exactly the right tools for this app. Offline is also stronger: a GRDB
local mirror with an outbox is more capable than a persisted query cache.

### What you're giving up, on the record

1. **No OTA updates.** Today you push to GitHub and it's live in two minutes. Native means a build and a reinstall — or App Review — for every change. This is the real cost of the decision, and it's the reason Stage 5 (Settings) matters so much: the more that's configurable at runtime, the less often you need to ship a build to change behavior.
2. **No full web app.** Browser access is read-only reporting. No data entry from a Chromebook or a Windows PC.
3. **Thinner ecosystem.** `supabase-swift` is official and solid, but has fewer examples than `supabase-js`.
4. **Mac needs its own pass** if you ever want it — menus, windows, `NSSavePanel`. Deferred to 8.9.

### The architectural move that makes the web page nearly free

There is exactly **one** cost engine, in Swift, and reports never reimplement it:

- **`PrintFlowCore` (Swift)** computes live previews and writes the cost/profit/margin snapshot at save time. It must be client-side — the Record Sale preview has to be instant and work offline.
- **Postgres `report_*` views** aggregate over those **stored snapshots**. Pure summation, no cost logic.
- **Stage 2 backfills snapshots onto every migrated row** (task 2.5), so no report ever needs the fallback recalculation path. That removes the engine-drift risk entirely, and it's why the web page can be a static file that just renders query results.

### Alternatives rejected

- **Expo / React Native** — full web parity and OTA updates, but a less-native feel and weaker tables on phone. Rejected once browser access was scoped to reporting only.
- **Native iOS + a full separate React web app** — two codebases and two cost engines. Never acceptable.
- **Keep the `WKWebView` shell** — leaves every defect in §1 in place. Stays available as the fallback production path during the transition.

---

## 3. Supabase schema

Multi-tenant from day one via a `workspaces` table. It costs almost nothing now
and is the difference between "my app" and "an app" later.

### Core tables

```
workspaces            id, name, created_at
workspace_members     workspace_id, user_id, role            -- RLS anchor

printers              id, ws, name, model, watts, purchase_date, purchase_cost,
                      status, notes, deleted_at
filament_types        id, ws, name, density, default_cost_per_kg, sort, active
filament_lots         id, ws, filament_type_id, color, swatch_hex,
                      spool_weight_g, cost_per_spool, on_hand_g,
                      build_to_spools, vendor, status, purchased_at, deleted_at
                      -- fixes defect 3: cost is per lot (type+color), and
                      -- spool_weight_g makes $/g exact instead of assuming 1kg

products              id, ws, name, sku, width_in, depth_in, height_in, weight_lb,
                      filament_g, filament_type_id, print_time_hr, prep_time_hr,
                      batch_size, waste_pct, packaging_option_id,
                      sale_price, default_channel_fee_pct, active, deleted_at
                      -- packaging_option_id is a real FK: defect 1 cannot recur
                      -- batch_size amortizes prep across a plate (roadmap wish)
                      -- waste_pct covers purge/supports/failures (defect 10)

inventory_items       id, ws, product_id, filament_lot_id, qty_available,
                      qty_sold, on_loan, build_to, deleted_at
                      UNIQUE (ws, product_id, filament_lot_id)
                      -- the UNIQUE constraint replaces the v1.7 merge-vs-insert
                      -- client logic with a DB guarantee

inventory_moves       id, ws, inventory_item_id, delta, reason, ref_type, ref_id,
                      filament_g_delta, occurred_at, created_by
                      -- append-only ledger. Stock level is derivable and
                      -- auditable; fixes the "where did this unit go" gap

print_jobs            id, ws, product_id, filament_lot_id, printer_id, qty,
                      est_print_time_hr, actual_print_time_hr, priority, status,
                      notes, auto_generated, source_inventory_item_id,
                      started_at, completed_at, failed_qty, deleted_at
                      -- failed_qty + actual time close the loop on real costs

sales                 id, ws, sold_at, order_ref, channel_id, product_id,
                      filament_lot_id, qty, sale_price, subtotal, payout, status,
                      affiliate_fee_pct, affiliate_fee_amt,
                      packaging_option_id, packaging_cost, shipping_cost_paid,
                      shipping_trip_id, notes,
                      unit_cost, total_cost, profit, margin_pct,   -- SNAPSHOTS
                      cost_model_version, deleted_at

expenses              id, ws, incurred_at, category_id, description, amount,
                      printer_id, miles, receipt_url, notes, deleted_at
                      -- receipt_url: photo of the receipt, straight from the
                      -- camera. The README already says to keep receipts.

shipping_trips        id, ws, occurred_at, destination, purpose, miles,
                      rate_used, amount, order_refs, expense_id
                      -- keeps the IRS mileage log as a first-class record

audit_log             id, ws, table_name, row_id, action, before, after,
                      actor, occurred_at
```

### Configuration tables — the configurability layer

Everything currently hardcoded in `index.html` becomes editable data:

```
packaging_options     id, ws, name, cost, active, sort
                      -- replaces the PACKAGING_COSTS constant

sales_channels        id, ws, name, fee_pct, fee_model, allows_affiliate,
                      counts_as_revenue, default_status, active, sort
                      -- replaces hardcoded TikTok / In-Person / Sample.
                      -- Etsy, Amazon, craft fairs, wholesale: add a row.

expense_categories    id, ws, name, schedule_c_line, is_mileage, active, sort
                      -- replaces the hardcoded category list, and maps each
                      -- category to a Schedule C line for tax reporting

promotions            id, ws, name, promo_type, value, scope, scope_ids,
                      channel_id, starts_at, ends_at, absorbed_by,
                      active, notes
                      -- promo_type: percent_off | fixed_off | free_shipping |
                      --             bogo | giveaway
                      -- absorbed_by: 'seller' (comes out of your margin) or
                      --             'platform' (TikTok-funded: customer pays
                      --             less, your payout is unchanged)
                      -- This distinction is the whole point -- today a promo
                      -- just looks like a lower sale price with no record of
                      -- why, or of who paid for it.

promo_applications    id, ws, promotion_id, sale_id, discount_amount,
                      absorbed_by, applied_at
                      -- links promos to the sales they touched, so
                      -- "what did that promotion actually cost me" is a query

settings              ws, key, value, value_type, label, description, unit,
                      group_name, min, max, sort
                      -- typed and self-describing, so the Settings screen
                      -- RENDERS ITSELF from the table. Adding a setting needs
                      -- no client change.

cost_model_versions   id, ws, effective_from, electricity_mode, labor_mode,
                      overhead_per_unit, notes
                      -- rate changes are versioned; sales record which version
                      -- priced them, so history is explainable, not just frozen
```

### Report views

Reports are SQL, not client code. Each is a view or set-returning function over
**stored snapshots** — pure aggregation, no cost logic:

```
report_pnl(start, end)                revenue, payout, COGS, expenses, net
report_tax_summary(start, end)        today's Tax tab KPIs, exactly
report_sales_detail(start, end)       sale rows with snapshot cost/profit
report_expenses_detail(start, end)    with Schedule C line mapping
report_inventory_snapshot(as_of)      cost basis and retail value
report_sales_by_channel(start, end)
report_sales_by_product(start, end)
report_filament_consumption(start, end)
report_mileage_log(start, end)        IRS format
report_price_review()                 current vs recommended, with flags
report_promo_performance(start, end)  discount given vs units moved
```

Both the iPad app and the web reporting page read these same views, so their
numbers cannot disagree.

One exception worth naming: `report_inventory_snapshot` needs the *current*
cost of on-hand stock, which has no sale to snapshot against. Rather than
reimplement the engine in SQL, task 3.4 has `PrintFlowCore` maintain a
`product_cost_cache` column. Until then that report returns placeholder zeros
and says so in its `COMMENT`, so it cannot ship silently wrong.

### Row Level Security

Every table: `USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))`.
Closes defect 6 — no more publicly writable ledger.

### Transactional RPCs

Multi-table writes become single atomic calls, closing defect 5:

- `record_sale(...)` → insert sale + snapshot cost + decrement `inventory_items` + write `inventory_moves` + optional trip link. **This is the fix for defect 2.**
- `complete_print_job(job_id, good_qty, failed_qty, actual_hr)` → increment inventory, deduct filament (including waste and failures), write moves, close job.
- `add_stock(...)` → upsert inventory (UNIQUE handles the merge), deduct filament, write moves.
- `refresh_print_queue()` → generate only the *shortfall not already queued*, closing defect 8.
- `log_shipping_trip(...)` → create trip + mileage expense atomically.

---

## 4. Cost engine — one implementation, shared

The single highest-risk part of the migration. Rules:

1. **One module** — `PrintFlowCore`, a pure Swift package with zero I/O, imported by the app and the tests. Never reimplemented. Reports aggregate over its stored snapshots in SQL rather than recomputing (§2), so there is no second implementation to drift.
2. **Golden-file tests first.** Before any UI work: export every current product and sale from the live sheet, run today's formulas *by lifting the literal existing code out of `index.html`*, snapshot the outputs, and assert `PrintFlowCore` reproduces them to the cent. Any intentional difference (the packaging fix, per-lot filament cost, spool weight) is an explicitly recorded, explained delta — not a surprise.
3. **Snapshots stay authoritative.** Reports read stored `total_cost`/`profit`/`margin` only. Task 2.5 backfills them onto every migrated row, which lets the fallback recalculation path — the fragile part of today's `saleCost()` — be deleted outright rather than ported.

### Formula, carried forward and extended

```
filament_cost  = (filament_g × (1 + waste_pct)) × lot_cost_per_g
                 lot_cost_per_g = cost_per_spool / spool_weight_g      [fix 3]

electricity    = FLAT:      print_time_hr × electricity_rate_per_hr    [today]
                 METERED:   print_time_hr × (printer_watts/1000) × kwh_rate

labor          = (prep_time_hr / batch_size) × labor_rate_per_hr       [batching]
machine        = print_time_hr × machine_rate_per_hr                   [optional, off by default]
packaging      = packaging_option.cost                                 [now real, fix 1]
overhead       = overhead_per_unit                                     [optional]

total_cost     = filament + electricity + labor + machine + packaging + overhead

discount       = percent_off   -> subtotal × promo.value/100
                 fixed_off     -> promo.value
                 free_shipping -> shipping_cost_paid
                 giveaway      -> subtotal                             [promotions]

payout_base    = promo.absorbed_by = 'seller'   ? subtotal − discount
                 promo.absorbed_by = 'platform' ? subtotal
payout         = channel.fee_model = 'percent'
                   ? payout_base × (1 − channel.fee_pct/100) − affiliate_fee_amt
                   : payout_base
profit         = payout − total_cost − shipping_cost_paid
margin_pct     = payout > 0 ? profit / payout × 100 : 0

recommended    = ceil(total_cost / (1 − fee_rate − target_margin) × 100)/100  [today]
```

Every extension is **off by default**, set to reproduce today's numbers exactly.
`waste_pct = 0`, `batch_size = 1`, `machine_rate = 0`, `overhead = 0`,
`electricity_mode = FLAT`, no promotions. Turning them on is a deliberate,
visible choice.

This also answers three items sitting open in `CODEX_HANDOFF.md`: batch prep
amortization, separating machine time from labor rate, and repricing small
long-print items.

---

## 5. Information architecture

The current app has 10 flat tabs in a horizontal scroller and opens on
**Filament** — an odd front door for a business app. There is no dashboard.

### iPhone — 5-item tab bar

| Tab | Contains |
|-----|----------|
| **Home** | KPI cards (today/week/month/YTD), alerts (low filament, below build-to, unpriced, losing money), trend chart, quick actions |
| **Queue** | Print jobs grouped Printing / Up Next / Blocked. Start, complete-with-actuals, fail, reprioritize by drag. The daily driver. |
| **Sell** | Record Sale as the primary action. Recent sales list, log shipping trip. |
| **Stock** | Segmented: Products · Inventory · Filament · Supplies |
| **More** | Reports · Pricing · Expenses · Tax · Settings · Sync |

Two things get elevated because they are the daily reality of the business:
finishing a print and recording a sale. Both should be reachable in one tap
and completable in under fifteen seconds.

### iPad / web — sidebar + split view

Persistent sidebar with all sections; list-detail split; the dense tables the
web app has today, on a screen that can hold them. Keyboard shortcuts (`⌘N`
new sale, `⌘F` search, `⌘E` export). Multi-select and bulk edit.

### Flows worth designing carefully

- **Record Sale** — channel picker drives the whole form (affiliate row appears only for channels that allow it; Sample forces $0 and shows shipping cost). Live payout, cost, and profit preview *before* saving, with a clear warning when the sale loses money. Decrements inventory automatically.
- **Complete Print Job** — good qty / failed qty / actual print time. Feeds real filament consumption and real print times back into the cost model. Currently just deletes the row.
- **Quick Add Filament** — scan or type, spool weight and cost, swatch color picker.
- **Log Shipping Trip** — one tap, prefilled from settings, IRS fields intact.
- **Onboarding** — first-run wizard: workspace name, first printer, electricity/labor/mileage rates, first filament, first product. The current app drops you at an empty Filament table with a URL box.

---

## 6. The Settings app

Settings is not one screen — it is a section with sub-screens, and it is the
feature that makes everything else configurable. Today's Settings tab has four
number inputs and a URL box. This replaces it.

### The mechanism: settings render themselves

The `settings` table stores metadata alongside each value — `label`,
`description`, `unit`, `value_type`, `group_name`, `min`, `max`, `sort`. The
Settings screen reads that table and builds the UI from it. Adding a new setting
is a database row, not a client release. Editors for the *list-shaped* config
(channels, packaging, promotions, categories, printers) are purpose-built
screens, because those need add/reorder/archive rather than a single input.

### Sections

| Section | Contents |
|---------|----------|
| **Business** | Workspace name, logo, fiscal year start, currency, timezone |
| **Cost model** | Electricity mode (flat $/hr or metered kWh), electricity rate, kWh rate, labor rate, machine rate (off by default), overhead per unit, default waste %, mileage rate, post office miles |
| **Filament** | Types (name, density, default cost/kg), per-lot cost editing, and a **bulk price update** tool |
| **Packaging** | The `packaging_options` editor — name, cost, active, sort, default for new products |
| **Sales channels** | Name, fee model (percent/flat/none), fee %, allows affiliate, counts as revenue, default status, sort |
| **Promotions** | Promo definitions — type, value, scope, date window, and who absorbs the cost |
| **Expense categories** | Name, Schedule C line, is-mileage flag, active, sort |
| **Printers** | Name, model, wattage (drives metered electricity), purchase cost and date, status |
| **Product defaults** | Default filament type, packaging, target margin, channel fee for new products |
| **Reports & exports** | Default date range, fiscal year, CSV delimiter, decimal places, whether Samples count toward revenue, default export destination |
| **Appearance** | Theme (system/light/dark), accent, number format, compact tables |
| **Data** | Backup now, restore, export everything, audit log viewer, danger zone |
| **Sync & account** | Signed-in identity, devices, sync status, cache size, sign out |

### The five things that make it good rather than adequate

1. **Impact preview before saving.** Changing the labor rate from $25 to $28
   shows *"affects 12 products · Mini Building Block goes from −$0.42 to −$1.18
   profit · 3 products drop below target margin"* **before** you commit. For a
   business this pricing-sensitive, this is the single most valuable feature in
   the whole Settings section. Today you change a rate and go hunting for what
   moved.

2. **Filament price changes, handled properly.** PLA Basic goes from $12.99 to
   $14.49. You get an explicit choice: apply to *all active lots* (restates
   current inventory value), or *future purchases only* (leaves cost basis
   alone). Either is correct depending on intent — silently picking one is not.
   Today `filCostPerKg()` matches by type and returns the first row it finds, so
   this decision is made for you, wrongly.

3. **Rate changes are effective-dated, not overwritten.** Editing the cost model
   writes a new `cost_model_versions` row rather than mutating the old one, and
   sales record which version priced them. That means *"why was this March sale
   priced this way"* has an answer. Sale snapshots already freeze the numbers;
   this explains them.

4. **Archive, never delete.** Anything referenced by history — a packaging size,
   a channel, a category, a promo — archives out of the pickers but stays intact
   on the rows that used it. A deleted packaging option must not orphan two years
   of sales.

5. **Change history and undo.** The `audit_log` powers a plain list: *"Labor rate
   $25.00 → $28.00, Aug 12"*, with a revert button. Plus search across every
   setting, and a clear split between per-device settings (theme) and
   per-workspace settings (every rate).

### Promotional costs

You asked for this specifically, and it needs its own model because a promo is
not just a lower price. The question that matters is **who paid for the
discount**:

- **Seller-absorbed** — you discount 20%. Your payout drops, your margin absorbs it. The promo has a real cost and should appear as one.
- **Platform-funded** — TikTok runs a campaign. The customer pays less, your payout is unchanged. Cost to you: zero.

Today both look identical in the sheet: a lower sale price with no record of why
or who funded it. With `promotions` + `promo_applications`, *"what did that
Valentine's promo actually cost me, and what did it sell"* becomes a report.

---

## 7. Design system

Keep the identity — it already looks good. Formalize it.

- **Tokens** from the existing palette: `#0e0f11 / #161820 / #1e2028` surfaces, `#6c63ff` `#a78bfa` `#38bdf8` accents, `#34d399 / #fbbf24 / #f87171 / #fb923c` semantics. Ship **light mode too** (a garage in daylight is a real use case).
- **Type**: Syne for display/headings, DM Mono for every number. Tabular figures so columns align. This mono-for-numerals rule is what makes the current app feel considered.
- **Native patterns**: large titles, sheet presentation with grabbers, swipe actions, context menus, pull-to-refresh, haptics on save/complete/error, SF Symbols, Dynamic Type support.
- **States that actually exist**: empty (with a "do this next" action, not just an emoji), loading skeletons, error with retry, offline banner, saving/saved. Replace every `alert()` and `confirm()` — there are dozens — with native dialogs and non-blocking toasts.
- **Money and loss**: red is never decoration. A losing product or sale is visually unmistakable.
- **Accessibility**: 4.5:1 contrast minimum, 44pt targets, VoiceOver labels on every icon button, never color as the only signal.

---

## 8. Reports and exports

Keep all four current CSV exports plus the bundle, byte-comparable. Then add:

| Report | Format | Notes |
|--------|--------|-------|
| Sales detail | CSV | existing |
| Expenses detail | CSV | existing |
| Inventory snapshot (cost basis) | CSV | existing; add as-of date |
| Tax summary rollup | CSV | existing |
| **P&L by month / quarter / year** | CSV + PDF | roadmap item |
| **Schedule C worksheet** | CSV + PDF | uses `expense_categories.schedule_c_line` |
| **Sales by channel / by product** | CSV + PDF | which products and channels actually pay |
| **Filament consumption & cost** | CSV | grams and dollars per type/color per period |
| **Mileage log** | CSV + PDF | IRS format: date, destination, purpose, miles |
| **Price review** | CSV | current vs recommended, flags |
| **Full backup** | JSON / zip | every table, restorable — the anti-lock-in guarantee |

Mechanics: small exports client-side, large and PDF via Edge Function; delivered
through the **native iOS share sheet** → Files, AirDrop, Mail to the CPA, or
straight to iCloud Drive. Scheduled monthly email export via `pg_cron` is a
natural later addition.

---

## 9. Offline and sync

The realistic use case is standing at a printer in a garage with bad wifi. The
native stack allows a genuinely local-first design rather than a cache.

- **GRDB SQLite mirror.** The local database is the app's read source, always. Every screen works offline with no special-casing, and no loading spinner on a cold launch.
- **Outbox pattern for writes.** Mutations write locally and enqueue; a background flusher calls the Supabase RPCs and reconciles. A queued sale is a real sale on your device immediately.
- **Conflict policy.** Single-user-per-workspace in practice, so last-write-wins on scalar fields is sufficient — except `inventory_items`, where quantity changes must replay as `inventory_moves` deltas rather than overwrite a total. This is exactly why the move ledger exists.
- **Visible sync state** in the header, with a pending-change count and manual retry. Today's sync dot was the right instinct; this gives it something real to report.

---

## 10. Migration — the "lose nothing" guarantee

Executed as a **verified, reversible, dual-write cutover**, not a switch flip.

1. **Freeze the contract.** Snapshot the live sheet to CSV and commit it as the immutable migration source.
2. **Parity checklist.** Enumerate every feature, formula, column, filter, KPI, and export in v1.11.0 as a checkable list. Nothing ships until every line is checked or explicitly deferred with your sign-off. *This document's §1 table is the start of it.*
3. **Golden-file cost tests.** Per §4.2 — new engine reproduces every historical number to the cent.
4. **Importer** (idempotent, re-runnable): preserves original IDs in a `legacy_id` column, maps `Type`+`Color` to `filament_lots`, resolves packaging strings to `packaging_options`, and **imports existing sale snapshots verbatim** — historical profit does not move. Rows predating the v1.11.0 snapshot columns get backfilled once, in legacy-compatible mode, and then frozen.
5. **Reconciliation report.** Machine-generated old-vs-new comparison: row counts per table, YTD revenue, payout, COGS, expenses, mileage, net profit, inventory value. Discrepancies must be zero or individually explained. **This is the actual proof that nothing was lost.**
6. **Dual-run period.** Both systems live, Sheets read-only. You work in the new app for two weeks while the sheet stays as a verifiable fallback.
7. **Cutover.** The Sheet becomes an archive, and the GitHub Pages URL switches from the current app to the web reporting page. The existing PWA and `WKWebView` shell stay deployed until the native app clears TestFlight — they are the fallback production path for the whole transition, which is the main thing offsetting the loss of OTA updates.

---

## 11. Build plan — stage by stage

Sequenced so the riskiest thing (financial correctness) is proven before any time
goes into polish. **Stages 1 and 2 are hard gates.** Every task has an ID, so
"next up is 3.8" is a complete instruction.

Stage 6 before Stage 3 would mean polishing something that might still be
financially wrong. Stage 5 (Settings) lands after Reports because the impact
preview in 5.4 needs the report views to already exist.

### Stage 0 — Foundation and scaffolding

| # | Task |
|---|------|
| 0.1 | Create Supabase projects (dev + prod); keys in a gitignored `.xcconfig`, never in source |
| 0.2 | Repo layout: `Native/PrintFlow` (app), `Packages/PrintFlowCore` (SPM), `supabase/` (migrations), `web-reports/`, `tools/` (migration scripts) |
| 0.3 | Supabase CLI local dev running (`supabase start`), migrations under version control |
| 0.4 | Migration 001 — `workspaces`, `workspace_members`, signup trigger that auto-creates a workspace |
| 0.5 | Migration 002 — config tables: `packaging_options`, `sales_channels`, `expense_categories`, `promotions`, `promo_applications`, `settings`, `cost_model_versions`, `printers`, `filament_types` |
| 0.6 | Migration 003 — core tables: `filament_lots`, `products`, `inventory_items`, `inventory_moves`, `print_jobs`, `sales`, `expenses`, `shipping_trips`, `audit_log` |
| 0.7 | Migration 004 — RLS policies on every table, plus a `current_workspace()` helper |
| 0.8 | Migration 005 — seed defaults that exactly match today's constants: packaging $1.25/$1.75/$2.00, channels TikTok 10% / In-Person / Sample, the ten expense categories, the five settings rows |
| 0.9 | Migration 006 — audit triggers and the soft-delete convention |
| 0.10 | Migration 007 — the `report_*` views from §3 |
| 0.11 | Add `supabase-swift`; write `Codable` models and a schema-drift test that fails when Postgres and Swift disagree |
| 0.12 | SwiftUI skeleton: `TabView` on iPhone, `NavigationSplitView` on iPad, session provider, Supabase client |
| 0.13 | GRDB local schema mirroring Postgres, with its own migration runner |
| 0.14 | Verify `supabase db reset` works from zero, and the app boots on both iPhone **and** iPad simulators |
| 0.15 | CI: GitHub Actions on a macOS runner — `xcodebuild test`, SwiftLint, `supabase db lint` |

**Gate:** schema reproducible from scratch; app boots on both simulators.

### Stage 1 — Cost engine and parity proof  🔒 *hard gate*

| # | Task |
|---|------|
| 1.1 | Export all 8 live sheet tabs to CSV; commit under `fixtures/legacy/` as the immutable source of truth |
| 1.2 | Extract today's formulas verbatim out of `index.html` into a throwaway Node script — reusing the literal existing code is more faithful than reimplementing it |
| 1.3 | Run that script across every product and sale; commit the output as golden JSON |
| 1.4 | Implement `PrintFlowCore` — `productCost`, `saleCost`, `saleSnapshot`, `payout`, `recommendedPrice`; all extensions off by default |
| 1.5 | Parity test: `PrintFlowCore` in legacy-compatible mode reproduces the golden files **to the cent** |
| 1.6 | Enable the three fixes behind flags; generate a delta report — which products and sales change, by how much, and why |
| 1.7 | Unit tests for every extension: waste %, batch size, metered electricity, machine rate, overhead, promotions, `absorbed_by` |
| 1.8 | **Review the delta report together and sign off** — this closes decision Q5 |

**Gate:** every historical number reproduced to the cent; all deltas documented and approved.

### Stage 2 — Migration and reconciliation  🔒 *hard gate*

| # | Task |
|---|------|
| 2.1 | Importer script (Node, throwaway) — reads fixtures, maps to schema, preserves original IDs in `legacy_id`, idempotent and re-runnable |
| 2.2 | Filament mapping: Type + Color → `filament_types` + `filament_lots`; infer `spool_weight_g` (default 1000, flag each for review) |
| 2.3 | Packaging mapping: strings → `packaging_options` FKs. **Needs your input** — since defect 1 means the real box per product was never stored, you'll confirm each one |
| 2.4 | Sales import: existing snapshots copied **verbatim**; channel strings → `sales_channels` FKs |
| 2.5 | **Backfill snapshots** onto every migrated row that lacks them, using `PrintFlowCore` in legacy-compatible mode — so reports only ever read snapshots and the fallback recalculation path can be deleted |
| 2.6 | Derive `inventory_moves` history from sales and inventory so the ledger isn't born empty |
| 2.7 | Reconciliation report: row counts per table, plus YTD revenue, payout, COGS, expenses, mileage, net profit, inventory value — old vs new, with per-row diffs |
| 2.8 | Run it; resolve every discrepancy to zero-or-explained |
| 2.9 | Dry-run against the prod project; write down the rollback procedure |

**Gate:** zero unexplained discrepancies on any total. This is the "lose nothing" proof.

### Stage 3 — Core CRUD (feature parity)

| # | Task |
|---|------|
| 3.1 | Auth: Sign in with Apple + email magic link, Keychain session, first-run onboarding wizard |
| 3.2 | Repository layer: GRDB local reads, Supabase sync, outbox scaffolding |
| 3.3 | Filament: list, add/edit lot, archive, swatch picker, low-stock indicator |
| 3.4 | Products: list, add/edit, live cost breakdown preview, packaging FK, batch size, waste %. Also maintains a `product_cost_cache` column via `PrintFlowCore` on every product/rate change — inventory valuation is the one figure no report can derive from a sale snapshot, because on-hand stock has no sale to snapshot against. This keeps the single-engine rule intact instead of reimplementing cost in SQL. `report_inventory_snapshot` returns placeholder zeros until this lands. |
| 3.5 | Supplies: list, add/edit, archive — straight parity, the simplest screen |
| 3.6 | SQL RPCs implemented and tested: `add_stock`, `record_sale`, `complete_print_job`, `refresh_print_queue`, `log_shipping_trip` |
| 3.7 | Inventory: list, add stock via RPC, edit, build-to, velocity and days-remaining, the five value KPIs |
| 3.8 | Sales: filterable list, Record Sale sheet (channel-driven form, live payout/cost/profit preview, loss warning, promo picker), edit, soft delete — **decrements inventory** |
| 3.9 | Queue: grouped list, start / complete-with-actuals / fail, drag to reprioritize, deduped refresh-from-inventory |
| 3.10 | Expenses: list, add/edit, category picker, receipt photo capture → Supabase Storage |
| 3.11 | Shipping trip logger, IRS fields intact |
| 3.12 | Pricing screen: recommended price, loss / below-target / unpriced flags, one-tap apply |
| 3.13 | Tax screen reading `report_tax_summary`, matching today's KPIs exactly |
| 3.14 | **Parity checklist walkthrough** — every v1.11.0 feature ticked or explicitly deferred |

**Gate:** the parity checklist is complete.

### Stage 4 — Reports, exports, and the web page

| # | Task |
|---|------|
| 4.1 | Finalize the `report_*` views and add SQL tests asserting they match the golden totals |
| 4.2 | CSV writer in Swift, matching today's escaping behavior exactly |
| 4.3 | Port the four existing exports; **diff old vs new byte-for-byte** on identical data |
| 4.4 | `ShareLink` and `.fileExporter` integration for every export |
| 4.5 | PDF rendering via `ImageRenderer` for P&L, Schedule C, and the mileage log |
| 4.6 | New reports: P&L by period, Schedule C worksheet, sales by channel, sales by product, filament consumption, mileage log, price review, promo performance |
| 4.7 | Full JSON backup and restore |
| 4.8 | Report picker with date-range presets: today, MTD, QTD, YTD, last year, custom |
| 4.9 | **Web reporting page** — static HTML + `supabase-js`, magic-link auth, reads the same views, CSV download |
| 4.10 | Deploy the web page to GitHub Pages, replacing the current app at that URL |

**Gate:** existing exports diff clean; the web page and the app agree on every number.

### Stage 5 — The Settings app

| # | Task |
|---|------|
| 5.1 | Settings shell: grouped sections, search across every setting |
| 5.2 | Self-rendering control renderer driven by `settings.value_type` and metadata |
| 5.3 | Cost model editor with effective-dating → writes `cost_model_versions` |
| 5.4 | **Impact preview** — before saving a rate change, show which products and sales move and by how much |
| 5.5 | Filament settings: types editor, plus the bulk price update tool (all active lots vs future purchases only) |
| 5.6 | Packaging editor: add, rename, archive, set default |
| 5.7 | Sales channel editor: fee model, fee %, affiliate allowed, counts as revenue |
| 5.8 | Promotions editor: type, value, scope, date window, `absorbed_by` |
| 5.9 | Expense category editor with Schedule C line mapping |
| 5.10 | Printer editor including wattage for metered electricity |
| 5.11 | Report/export defaults, appearance, and the per-device vs per-workspace split |
| 5.12 | Data section: backup, restore, audit log viewer, danger zone |
| 5.13 | Settings change history with undo, powered by `audit_log` |
| 5.14 | **Acceptance test:** add a new sales channel, packaging size, promotion, and expense category with **zero code changes** |

**Gate:** 5.14 passes. Every setting added here is one fewer reason to ship a build.

### Stage 6 — Design pass

| # | Task |
|---|------|
| 6.1 | Theme file from the PrintFlow palette — light and dark, shared by the app and the web page |
| 6.2 | Type scale: Syne + DM Mono, `monospacedDigit()` everywhere digits align |
| 6.3 | Component library: KPI card, data row, chip, sheet, toast, empty state, redacted placeholder, alert banner |
| 6.4 | Home dashboard: KPI grid, alert list, Swift Charts trend, quick actions |
| 6.5 | iPad: `NavigationSplitView`, sortable `Table`, keyboard shortcuts, multi-select |
| 6.6 | Replace every `alert()`/`confirm()` equivalent with native dialogs and non-blocking toasts |
| 6.7 | Haptics, swipe actions, context menus, `.refreshable`, large titles |
| 6.8 | Empty / loading / error / offline states on every screen |
| 6.9 | App icon set and launch screen from the CC3D mark |
| 6.10 | Accessibility audit: contrast, Dynamic Type, VoiceOver labels, 44pt targets |

### Stage 7 — Offline and hardening

| # | Task |
|---|------|
| 7.1 | GRDB local-first reads verified with the network fully off |
| 7.2 | Outbox write queue with retry, plus `inventory_moves` delta replay for quantity conflicts |
| 7.3 | Sync status UI: pending-change count, manual retry, last-synced timestamp |
| 7.4 | Error reporting and structured logging on Edge Functions |
| 7.5 | Airplane-mode test pass across every flow |
| 7.6 | Performance pass: lazy loading on long lists, query batching, Postgres index review |

### Stage 8 — Ship

| # | Task |
|---|------|
| 8.1 | Apple Developer account, bundle ID, Sign in with Apple capability, provisioning |
| 8.2 | Release pipeline and version/build numbering |
| 8.3 | Privacy policy, App Privacy questionnaire, support URL |
| 8.4 | TestFlight build; a full week of real business use on iPhone and iPad |
| 8.5 | **Decide App Store vs TestFlight-only** — this closes deferred decision Q3 |
| 8.6 | App Store listing: iPhone and iPad screenshots, description, keywords |
| 8.7 | Submit for review — keep the old PWA live until approved |
| 8.8 | **Decide the Sheet's fate** — archive or one-way export. This closes Q6 |
| 8.9 | Post-launch: monitoring, scheduled backups via `pg_cron`. Optionally add a Mac target — same codebase, new target |

---

## 12. Also worth doing while we're here

Open items from the existing docs that this rewrite makes easy:

- **Prep times need real measurement** (`CODEX_HANDOFF.md`). The new Complete-Print-Job flow captures actual times, so the app can *tell you* the real number instead of asking you to guess it.
- **Heartbeat is unpriced ($0)** and **Mini Building Block loses money.** The Pricing screen should surface both as blocking alerts on Home, not as a row in a table you have to visit.
- **Batch printing efficiency** — `products.batch_size` handles it.
- **Machine time vs labor rate** — separate configurable rates, off by default.
- **Receipt photos** on expenses, via camera → Supabase Storage.
- **Barcode/QR labels** for filament spools (the roadmap floated this; the camera makes it cheap).
- **TikTok API integration** — deferred. Nothing in this plan blocks it; `sales_channels` is the seam.

---

## 13. Open decisions

Q1, Q2, and Q4 are decided and recorded at the top of this document. Two remain,
and both are deliberately deferred to the point where there's real information
to decide with:

| # | Question | Decided at |
|---|----------|-----------|
| Q5 | Accept the three intentional cost deltas? Fixing packaging, per-lot filament cost, and spool weight changes some historical *recalculated* numbers. Stored snapshots stay frozen. | **Task 1.8**, once the delta report exists and you can see exactly what moves |
| Q3 | App Store, or TestFlight only? | **Task 8.5**, after a week of real use |
| Q6 | Archive the Sheet, or keep a one-way export into it? | **Task 8.8**, at cutover |

One input needed earlier than any of these: **task 2.3** needs you to confirm the
real packaging size per product. Because of defect 1 that data was never actually
stored, so it can't be migrated — only re-entered.

### Next action

Stage 0, task 0.1. Nothing in Stage 0 depends on any open decision.

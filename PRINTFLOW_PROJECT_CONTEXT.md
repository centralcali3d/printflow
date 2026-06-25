# PrintFlow — Project Context & Continuity Document
*Last updated: 2026-06-25*

---

## What PrintFlow Is

A single-file web app for managing a 3D printing business. Built for one user running a small 3D print operation selling on TikTok and in-person (VUSD school events). The app tracks filament, supplies, products, inventory, print queue, sales, and expenses — all synced to a Google Sheet via Apps Script.

**Live app:** https://centralcali3d.github.io/printflow/
**GitHub repo:** https://github.com/centralcali3d/printflow
**Current version:** v1.10.0

---

## File Structure

| File | Description |
|------|-------------|
| `index.html` | Entire front-end (self-contained, no build step) |
| `PrintFlow_AppsScript.js` | Google Apps Script backend — deployed as Web App |
| `manifest.json` | PWA install metadata |
| `sw.js` | Service worker for app shell caching |
| `assets/icon-*.png` | PWA and iOS home screen icons |
| `README.md` | User-facing documentation |
| `PRINTFLOW_PROJECT_CONTEXT.md` | This file |

---

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS, single file, no framework
- **Fonts:** Syne (display) + DM Mono (numbers) via Google Fonts
- **Backend:** Google Apps Script Web App
- **Database:** Google Sheets (PrintFlow DB)
- **Hosting:** GitHub Pages (main branch, root)
- **Sheet ID:** `14QXzXNVTDpCrmgaEutLsTFu-FIKR9PrLNw44XeN1mLs`

---

## Google Sheet Tabs & Column Headers

### Filament
`ID | Type | Color | On Hand (kg) | Cost per Spool ($) | Build To (spools) | Vendor | Status | Swatch Hex`

### Supplies
`ID | Item Name | Category | Qty | Unit Cost ($) | Extended ($) | Printer | Status | Order Date`

### Products
`ID | Product Name | Width (in) | Depth (in) | Height (in) | Weight (lb) | Filament (g) | Filament Type | Print Time (hr) | Prep Time (hr) | Sale Price ($) | TikTok Fee (%)`

**Important:** `Filament (g)` stores grams of filament used per print (NOT kg, NOT dollars). `Print Time (hr)` is machine time (used for electricity). `Prep Time (hr)` is hands-on labor time (used for labor cost).

### Inventory
`ID | Product Name | Filament Type | Color | Qty Available | Qty Sold | On Loan | Build To`

### Sales
`ID | Date | Order / Ref # | Channel | Product Name | Filament Type | Color | Qty | Sale Price ($) | Subtotal ($) | Payout ($) | Status | Affiliate Fee (%) | Affiliate Fee ($) | Packaging | Packaging Cost ($) | Shipping Trip | Notes`

### Queue
`ID | Product Name | Filament Type | Color | Qty | Est. Print Time (hr) | Priority | Status | Notes | Date Added | Auto Generated`

### Expenses
`ID | Date | Category | Description | Amount ($) | Printer | Miles | Notes`

### Tax Summary
Frontend-only dashboard. No sheet tab is required. It rolls up Sales, Expenses, Products, Inventory, and Settings data, then exports CSV files for tax review.

### Settings
`Setting | Value | Description`

---

## Settings & Their Current Values

| Setting | Value | Notes |
|---------|-------|-------|
| electricity_rate_per_hr | 0.17 | H2C draws ~0.37 kW × $0.46/kWh = $0.17/hr |
| tiktok_default_fee_pct | 10 | TikTok platform fee |
| labor_rate_per_hr | 25.00 | User's hourly rate for prep time |
| mileage_rate | 0.70 | IRS 2026 rate |
| post_office_miles | 3.6 | Round trip to USPS |

**Note:** Electricity rate was corrected from the old default $0.46 (which was $/kWh, not $/hr). The H2C printer uses ~0.37 kW so actual cost per print hour is $0.17. The frontend defaults, Apps Script seed value, and spreadsheet setting now align on $0.17/hr.

---

## Cost Formula (Per Product)

```
Filament Cost  = (Filament (g) / 1000) × Cost per Spool (from Filament tab, assumes 1kg spool)
Electricity    = Print Time (hr) × electricity_rate_per_hr ($0.17)
Labor          = Prep Time (hr) × labor_rate_per_hr ($25.00)
Packaging      = Box cost (Small $1.25 / Medium $1.75 / Large $2.00 / Other custom)
Total Cost     = Filament + Electricity + Labor + Packaging
```

### Per Sale
```
Subtotal           = Sale Price × Qty
Payout (TikTok)    = Subtotal × (1 − TikTok Fee%)
Payout (In-Person) = Subtotal
Affiliate Fee ($)  = Subtotal × Affiliate Fee (%)
Profit             = Payout − (Total Cost × Qty) − Affiliate Fee ($)
```

---

## Packaging Options & Costs

| Option | Cost |
|--------|------|
| Small Box | $1.25 |
| Medium Box | $1.75 |
| Large Box | $2.00 |
| Other | Custom entry per sale |

Components: Box $1.01 + Bubble wrap $0.20 + Label $0.04 = $1.25 base

---

## Product Catalog & Filament (g) Values

| Product | ID | Filament (g) | Sale Price |
|---------|----|-------------|------------|
| iPhone Stand | prod_iphone | 85 | $11.99 |
| Watch Band Holder | prod_watch | 170 | $17.99 |
| Little Building Block (Square Drawer) | prod_lbb_sq | 175 | $10.99 (TikTok) / $12.99 |
| Little Building Block (Rect 1 Drawer) | prod_lbb_r1 | 315 | $11.99 |
| Little Building Block (Rect 2 Drawers) | prod_lbb_r2 | 315 | $11.99 |
| Makeup Holder | prod_makeup | 250 | $10.99 |
| Jewelry Box with Lid | prod_jewel | 175 | $9.99 |
| Mini Building Block (Square Drawer) | prod_mbb_sq | 90 | $5.99 |
| Mini Building Block (Rect 1 Drawer) | prod_mbb_r1 | 150 | $7.99 |
| Love Spinning Heart | prod_heart2 | 60 | $6.99 |
| Heartbeat | prod_heart1 | 100 | $0 (not priced yet) |
| 3-Pack Mini Building Block (Square) | prod_3pack | 270 | $15.99 |

---

## Printers

| Printer | Notes |
|---------|-------|
| H2C | Dominant printer. ~0.37 kW draw |
| P1S | Secondary |
| P2S | Secondary |

---

## Sales Channels

- **TikTok** — platform fee deducted from payout. Affiliate/creator fees possible on top.
- **In-Person** — VUSD school events (Monica, Lisa are customer names seen in records)
- **Sample** — $0 sale price, tracks shipping cost paid and COGS for profit reduction

---

## Mileage / Post Office

- 3.6 miles round trip to USPS for TikTok order shipping
- "Log Post Office Trip" button on Sales tab creates IRS-compliant mileage expense entry
- IRS log includes: date, destination (USPS Post Office), purpose (Shipping customer orders), miles, cost

---

## Expenses Tab Categories

Hardware, Hotends, Bed Plates, Consumables, Marketing, Video/Editing, Software/Licensing, Mileage, Shipping, Other

---

## Inventory Value (Tax)

The Inventory tab shows KPI cards including:
- **Inventory Value** = Qty Available × Total Cost per unit (cost basis for taxes)
- Used for Schedule C Ending Inventory at year end
- Unsellable prints should be written off via Expenses tab → category "Other"

---

## Apps Script API Actions

| Action | Description |
|--------|-------------|
| ping | Health check |
| init | Creates all tabs with headers (safe to re-run) |
| seed | Seeds Products with default data (skips existing) |
| read | Returns all rows from a tab |
| write | Appends a new row |
| update | Updates existing row by ID |
| delete | Deletes row by ID |
| getSettings | Returns all settings as key/value |
| updateSetting | Updates single setting by key |
| logTrip | Creates IRS mileage entry in Expenses |

---

## Deployment Process

1. Edit `index.html` and/or `PrintFlow_AppsScript.js` locally
2. Push to GitHub (main branch, root) → GitHub Pages auto-deploys `index.html`
3. If Apps Script changed: Extensions → Apps Script → paste new code → Deploy → New deployment → Web app. Do not edit an existing deployment; existing deployment URLs are pinned to old code versions.
4. Paste the new Apps Script Web App URL into PrintFlow Settings on every device.
5. If new sheet tabs or columns added: run `?action=init` against the new deployment URL in the browser.

**Important:** Always hard refresh (Cmd+Shift+R) after GitHub Pages updates. GitHub Pages can take 2-3 minutes to reflect new pushes.

---

## Codex Resume Notes

Current local workspace:
- `C:\Users\thaberman\Documents\CC3D-PrintFlow`

Current Git state at handoff:
- Branch: `main`
- Remote: `origin https://github.com/centralcali3d/printflow.git`
- Latest pushed commit: `5df80e3 Add PWA install support`
- Previous handoff commit: `917346a Document Codex handoff`

What was verified in the Codex takeover:
- The GitHub `main` branch already contained the v1.5-v1.7 inventory fixes, including duplicate-row prevention, Save button double-click protection, `deductFilament()`, and filament auto-deduction.
- The PWA pass added install metadata, service worker shell caching, and generated icons.
- Static validation passed for `manifest.json`, `sw.js`, and the inline JavaScript in `index.html`.
- Local HTTP checks returned `200` for `/`, `/manifest.json`, `/sw.js`, and `/assets/icon-192.png`.

PWA cache behavior:
- `sw.js` caches only same-origin static app shell files and icons.
- Apps Script API requests are cross-origin and are intentionally not cached.
- If the live app appears stale after a push, hard refresh or remove/re-add the Home Screen app so iOS picks up the latest manifest/service worker.

Recommended next starting point:
1. Use the Pricing tab to set actual prices for Mini Building Blocks and the unpriced Heartbeat product.
2. Start the Apple app track as a hybrid SwiftUI + `WKWebView` shell around the existing app, keeping the PWA as production until parity is proven.
3. Add richer tax reporting if needed, such as monthly/quarterly breakdowns or Schedule C category mapping.

Latest local update on 2026-06-25:
- Added the Pricing tab in `index.html`.
- Added channel-aware target price recommendations, loss checks, unpriced flags, and one-click sale price updates.
- This was a frontend-only change; Apps Script tabs/headers/actions were not changed, so no new Apps Script deployment is required.

---

## Known Issues & Things To Do

### In Progress / Pending
- [ ] **Prep times need updating** — user needs to time actual workflow and enter realistic prep times per product. Currently shows values that may be old filament kg data shifted into the wrong column. Realistic estimate is ~15-20 min (0.25-0.33 hr) per item.
- [ ] **Heartbeat product** — not priced yet ($0), needs pricing
- [ ] **Mini Building Block pricing** — currently losing money even at corrected costs. Needs repricing or prep time reduction via batching
- [x] **v1.5-v1.7 fixes verified on GitHub main** — duplicate inventory row prevention, Save button double-click protection, and filament auto-deduction are already present in `origin/main:index.html`
- [x] **PWA conversion** — added manifest, service worker, icon set, and mobile install polish for iPhone/iPad/Mac
- [x] **Tax Summary and CSV exports** — date-range rollups for sales, COGS, fees, mileage, expenses, inventory value, and net profit
- [x] **Pricing review tools** — target-margin recommendations and flags for unpriced/losing/below-target products

### Completed This Session
- [x] Imported Claude handoff package into Codex working repo
- [x] Updated default electricity rate to $0.17/hr in frontend and Apps Script seed settings
- [x] Corrected Apps Script deployment rule: use a new deployment when backend code changes
- [x] Fixed `Filament (kg)` → `Filament (g)` — stores actual grams, formula converts to kg
- [x] Added Labor cost (Prep Time × $25/hr)
- [x] Added Packaging cost with tiered options
- [x] Added Affiliate/creator fee checkbox on sales
- [x] Added Sample channel
- [x] Added Expenses tab (full CRUD)
- [x] Added Post Office Trip logger (IRS-compliant)
- [x] Added Inventory Value KPIs (cost basis, retail value, potential profit, active SKUs)
- [x] Added tax tip note on Inventory tab
- [x] Updated default electricity rate to $0.17/hr in code
- [x] Updated README with v1.3 and v1.4 changelogs
- [x] Added PWA manifest, service worker, and install icons
- [x] Added Tax Summary tab and CSV exports
- [x] Added Pricing tab with target margin recommendations

### Future Ideas Discussed
- Native app path: current first step is complete as an installable PWA; evaluate wrapping or rebuilding once workflows stabilize
- Native app direction chosen for next phase: hybrid SwiftUI + `WKWebView` shell first, full native rewrite later only if usage proves it is worth the extra maintenance
- Add richer tax dashboard views if needed: monthly/quarterly breakdowns or Schedule C category mapping
- Batch printing efficiency tracking (amortize prep time across multiple units)
- Consider separating "machine time" rate from labor rate more explicitly
- Possible repricing strategy for small items with long print times

### Native App Track

- Goal: deliver a real Apple-platform app for iPhone, iPad, and Mac while preserving the current GitHub Pages workflow during build-out
- Recommended first implementation: SwiftUI shell hosting the existing PrintFlow UI in `WKWebView`
- Reason: fastest path to a testable app without duplicating business logic in the next month
- Keep production path unchanged until the app reaches feature parity on CRUD flows and sync stability
- New docs added for this track:
  - `NATIVE_APP_ROADMAP.md`
  - `API_CONTRACT.md`

---

## Tax Notes (Discussed With User)

- App is good for running the business but final tax filing should involve a CPA
- California in-person sales may require sales tax (TikTok handles it for their platform)
- Home office / dedicated print space may be deductible
- Printers over $2,500 may need depreciation vs. Section 179 expensing — consult CPA
- IRS mileage log requirements: date, destination, business purpose, miles — all auto-filled by trip logger
- Schedule C uses: Beginning Inventory + Goods Produced − Ending Inventory = COGS
- Small businesses may qualify for cash method accounting (deduct materials when purchased)

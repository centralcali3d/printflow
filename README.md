# PrintFlow — 3D Print Business Manager

A single-file web app for managing a 3D printing business. Tracks filament inventory, supplies, products, print queue, sales, and expenses — all synced to a Google Sheet via Apps Script.

**Live app:** https://centralcali3d.github.io/printflow/

**Current version:** v1.11.0

---

## Features

- **Filament** — Track every spool by type, color, cost, and quantity on hand.
- **Supplies** — Manage hardware, hotends, bed plates, consumables, and printers.
- **Products** — Full cost breakdown: filament, electricity, labor (prep time), and packaging. Profit and margin shown for TikTok and in-person.
- **Pricing** — Target-margin recommendations, loss checks, and quick sale-price updates.
- **Inventory** — Stock levels with build-to targets, velocity, and days-remaining estimates.
- **Print Queue** — Auto-generated from inventory needs or manually added.
- **Sales** — TikTok, In-Person, and Sample channels. Affiliate/creator fees, packaging costs, and shipping trip tracking per order.
- **Expenses** — Log hardware, marketing, software, mileage, and other overhead. IRS-compliant post office trip logger built in.
- **Tax Summary** — Date-range rollups for sales, COGS, expenses, mileage, net profit, inventory value, and CSV exports.
- **Settings** — Electricity rate, labor rate, mileage rate, and post office miles — all synced to the spreadsheet.

---

## Profit Calculation

```
Filament Cost  = (Filament (g) / 1000) × Cost per Spool
Electricity    = Print Time (hr) × Electricity Rate ($/hr)
Labor          = Prep Time (hr) × Labor Rate ($/hr)
Packaging      = Box cost (Small $1.25 / Medium $1.75 / Large $2.00 / Custom)
Total Cost     = Filament + Electricity + Labor + Packaging

Payout (TikTok)     = Subtotal × (1 − TikTok Fee%) − Affiliate Fee ($)
Payout (In-Person)  = Sale Price × Qty
Profit              = Payout − Total Cost
```

---

## Products Sheet — Column Reference

| Column | Description |
|--------|-------------|
| Filament (g) | Grams of filament used per print (from slicer) |
| Print Time (hr) | Machine print time — used for electricity |
| Prep Time (hr) | Your hands-on time — used for labor cost |
| Packaging | Default box size for this product |

### Filament (g) values by product

| Product | Grams |
|---------|-------|
| iPhone Stand | 85 |
| Watch Band Holder | 170 |
| Little Building Block (Square Drawer) | 175 |
| Little Building Block (Rect 1 Drawer) | 315 |
| Little Building Block (Rect 2 Drawers) | 315 |
| Makeup Holder | 250 |
| Jewelry Box with Lid | 175 |
| Mini Building Block (Square Drawer) | 90 |
| Mini Building Block (Rect 1 Drawer) | 150 |
| Love Spinning Heart | 60 |
| Heartbeat | 100 |
| 3-Pack Mini Building Block (Square) | 270 |

---

## Sales Sheet — New Columns

| Column | Description |
|--------|-------------|
| Affiliate Fee (%) | TikTok creator/affiliate fee percentage |
| Affiliate Fee ($) | Calculated dollar amount |
| Packaging | Box type used for this order |
| Packaging Cost ($) | Cost of packaging |
| Shipping Trip | "Yes" if this order was included in a post office trip log |
| Notes | Free text |
| Unit Cost ($) | Cost snapshot per unit at the time the sale is saved |
| Total Cost ($) | Total cost snapshot for this sale |
| Profit ($) | Profit/loss snapshot using the sale's actual payout |
| Margin (%) | Profit margin snapshot at the time the sale is saved |

---

## Expenses Tab

Columns: `ID | Date | Category | Description | Amount ($) | Printer | Miles | Notes`

Categories: Hardware, Hotends, Bed Plates, Consumables, Marketing, Video/Editing, Software/Licensing, Mileage, Shipping, Other

### Post Office Trip Logger

The 🚗 **Log Post Office Trip** button on the Sales tab creates an IRS-compliant mileage entry in the Expenses tab automatically. It records: date, destination (USPS Post Office), business purpose (Shipping customer orders), round-trip miles, and cost at the IRS rate.

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| electricity_rate_per_hr | 0.17 | Cost per print hour ($/hr) |
| tiktok_default_fee_pct | 10 | TikTok platform fee (%) |
| labor_rate_per_hr | 25.00 | Your hourly prep rate ($/hr) |
| mileage_rate | 0.725 | IRS mileage rate ($/mi) — update each tax year |
| post_office_miles | 3.6 | Round-trip miles to post office |

---

## Setup

### 1 — Google Sheet
Create a new Google Sheet named **PrintFlow DB**. Note the Sheet ID from the URL.

### 2 — Apps Script
1. Go to **Extensions → Apps Script**
2. Delete existing code, paste `PrintFlow_AppsScript.js`
3. Update `SHEET_ID` at the top if needed
4. Click **Save**

### 3 — Deploy as Web App
1. **Deploy → New deployment → Web app**
2. Execute as: **Me** | Who has access: **Anyone**
3. Deploy → Authorize → Allow → Copy the URL

### 4 — Initialize Sheets
Call the init action once to create all tabs with correct headers:
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=init
```

### 5 — Connect the App
1. Open the PrintFlow web app
2. Click 🔗 → paste your Apps Script URL → Connect

---

## Files

| File | Description |
|------|-------------|
| `index.html` | Entire front-end (self-contained) |
| `PrintFlow_AppsScript.js` | Google Apps Script backend |
| `README.md` | This file |
| `PRINTFLOW_PROJECT_CONTEXT.md` | Project continuity notes for future AI/dev sessions |
| `CODEX_HANDOFF.md` | Original Claude-to-Codex handoff notes |

---

## Tax Notes

- The Tax Summary tab exports CSV files for sales detail, expenses detail, current inventory snapshot, and a summary rollup.
- The Expenses tab and post office trip logger provide documentation for Schedule C deductions.
- Keep digital copies of receipts for all expense entries.
- Update `mileage_rate` in Settings at the start of each tax year.
- California in-person sales may be subject to sales tax — consult a CPA.
- Consider a CPA or QuickBooks Self-Employed for final tax filing.

---

## Mobile / Home Screen

PrintFlow is installable as a PWA on supported browsers.

1. Open in **Safari** on iPhone/iPad → Share → Add to Home Screen
2. Name it **PrintFlow** → Add
3. On desktop Chrome/Edge, use the browser install button when offered

The service worker caches only the app shell and icons. Apps Script data requests stay live and are not cached.

---

## Changelog

### v1.11.0 — 2026-06-25
- Added sale-level cost, profit, and margin snapshots so historical profit/loss stays tied to the sale price and costs at save time
- Updated Sales and Tax reporting to prefer stored sale snapshots, with fallback calculations for older sales
- Updated Apps Script Sales headers; deploy a new Apps Script version and run `?action=init` to append the new columns

### v1.10.0 — 2026-06-25
- Added a Pricing tab with channel-aware target price recommendations
- Added loss, below-target, and unpriced product flags for quick repricing review
- Added one-click recommended price updates through the existing Products API

### v1.9.0 — 2026-06-25
- Added a Tax Summary tab with date-range revenue, payout, COGS, expenses, mileage, net profit, and current inventory value
- Added CSV exports for tax summary, sales detail with calculated COGS/profit, expenses detail, and inventory snapshot
- Kept tax/export calculations client-side, so no Apps Script deployment change is required

### v1.8.0 — 2026-06-16
- Added PWA manifest, app icons, and install metadata for iPhone/iPad/Mac/desktop browsers
- Added a service worker that caches the static app shell while leaving Apps Script data requests uncached
- Registered the service worker from the existing single-file frontend boot path

### v1.7.1 — 2026-06-16
- Imported Claude-to-Codex handoff docs into the GitHub project
- Added Apps Script source file to the repo for backend continuity
- Aligned default electricity rate to `$0.17/hr` in frontend, Apps Script seed settings, and docs
- Documented Codex continuity expectations and native/PWA roadmap

### v1.7 — 2026-05-30
- **Fixed: duplicate inventory rows** — Adding stock for an existing product/type/color combo now merges qty into the existing row instead of creating a new row
- **Fixed: Save button spam** — Save button disables immediately on click and shows "Saving…" to prevent double-submits
- **Fixed: filament deduction extracted** to a reusable helper so it works correctly in both the new-row and merge-into-existing paths

### v1.6 — 2026-05-30
- **Auto filament deduction** — Adding new stock automatically subtracts filament usage from the Filament tab (`Filament (g) × Qty / 1000` kg). Warns if the result would go negative (and lets you proceed). Warns if no matching filament record is found for the type/color combination. Edit existing stock does not trigger deduction.

### v1.5 — 2026-05-30
- **Inventory color dropdown** — Add Stock modal now uses a dropdown for Color (populated from filament inventory by type), matching the behavior of the Record Sale modal

### v1.4 — 2026-05-30
- **Inventory Value KPIs** — Inventory tab now shows Units in Stock, Inventory Value (cost basis for taxes), Retail Value, Potential Profit, and Active SKUs
- Added tax tip note explaining how to use Inventory Value on Schedule C at year end
- Updated default electricity rate handling for cost calculations

### v1.3 — 2026-05-29
- Added **Expenses tab** — log hardware, marketing, software, mileage, and other overhead
- Added **Post Office Trip Logger** — one-click IRS-compliant mileage entry for shipping runs
- Added **Labor cost** — Prep Time (hr) × Labor Rate ($/hr) in product cost calculation
- Added **Packaging cost** — Small Box ($1.25), Medium Box ($1.75), Large Box ($2.00), or custom per sale
- Added **Affiliate/creator fee** — checkbox on Record Sale modal, pulls percentage and calculates dollar amount
- Added **Sample channel** — sales at $0 with shipping cost and COGS tracked for profit reduction
- Added **Labor Rate, Mileage Rate, Post Office Miles** to Settings (synced to spreadsheet)
- Updated Products table to show Fil.$, Elec., Labor, Pkg, and Total Cost as separate columns
- Updated Settings page with new rate controls

### v1.2 — 2026-05-29
- Fixed filament cost: `Filament (kg)` → `Filament (g)`, stores actual grams
- Cost formula: `(grams / 1000) × cost_per_kg`
- All products updated with correct gram weights from slicer data

### v1.1 — 2026-05-23
- Added Settings tab with electricity rate synced to spreadsheet
- Electricity rate loads from sheet on startup

### v1.0 — 2026-05-15
- Initial release

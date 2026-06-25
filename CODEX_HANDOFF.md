# PrintFlow — Codex Handoff Document
*Prepared: 2026-06-16 · Handed off from Claude (Anthropic)*

---

## Quick Summary

PrintFlow is a **single-file web app** (`index.html`) for managing a 3D printing business. It tracks filament inventory, supplies, products, inventory, print queue, sales, and expenses — all synced to a Google Sheet via a Google Apps Script Web App backend.

The owner (Tony) runs a small 3D printing business selling on TikTok Shop and in-person at VUSD school events. He uses three Bambu Lab printers (H2C, P1S, P2S) and primarily PLA Basic / PLA Basic Matte filaments. The app is for personal use only — no multi-user or distribution goals.

---

## Architecture

```
┌─────────────────────┐     GET/POST      ┌──────────────────────┐
│   index.html         │ ◄──────────────► │  Google Apps Script   │
│   (GitHub Pages)     │   JSON over HTTPS │  Web App (backend)   │
│                      │                   │                      │
│  Vanilla HTML/CSS/JS │                   │  PrintFlow_           │
│  No framework        │                   │  AppsScript.js       │
│  No build step       │                   │                      │
└─────────────────────┘                   └──────────┬───────────┘
                                                     │
                                                     ▼
                                          ┌──────────────────────┐
                                          │  Google Sheets        │
                                          │  "PrintFlow DB"       │
                                          │  Sheet ID: 14QXzXNV…  │
                                          └──────────────────────┘
```

- **Frontend:** Single `index.html`, self-contained, hosted on GitHub Pages
- **Backend:** Google Apps Script Web App (`PrintFlow_AppsScript.js`)
- **Database:** Google Sheets (Sheet ID: `14QXzXNVTDpCrmgaEutLsTFu-FIKR9PrLNw44XeN1mLs`)
- **Repo:** https://github.com/centralcali3d/printflow (main branch, root)
- **Live app:** https://centralcali3d.github.io/printflow/
- **Apps Script file ID:** `178G1EB6WocHCfgXoV_7tSm8EBcjRt20F`
- **Fonts:** Syne (display) + DM Mono (numbers) via Google Fonts

---

## Files in Repo

| File | Description |
|------|-------------|
| `index.html` | Entire frontend — HTML, CSS, JS all in one file (~1580 lines) |
| `PrintFlow_AppsScript.js` | Google Apps Script backend (v1.3) |
| `README.md` | User-facing docs with setup instructions and changelog |
| `PRINTFLOW_PROJECT_CONTEXT.md` | Detailed project context for AI assistants |
| `CODEX_HANDOFF.md` | This file |

---

## Current State

### What's deployed and working (v1.4 on GitHub Pages)
- Filament inventory tracking (type, color, cost, swatch colors, vendor, reorder status)
- Supplies management (hardware, hotends, bed plates, consumables)
- Products catalog with full cost breakdown (filament, electricity, labor, packaging)
- Inventory with stock levels, velocity, days-remaining, build-to targets
- Inventory Value KPIs (cost basis for taxes, retail value, potential profit)
- Print Queue (auto-generated from inventory needs + manual jobs)
- Sales recording (TikTok, In-Person, Sample channels) with profit calculation
- Affiliate/creator fee tracking on TikTok sales
- Packaging cost tracking (Small $1.25, Medium $1.75, Large $2.00, Custom)
- Expenses tab (full CRUD) with category filtering
- Post Office Trip Logger (IRS-compliant mileage expense auto-generation)
- Settings synced to spreadsheet (electricity rate, labor rate, mileage rate, PO miles)

### v1.5 → v1.7 GitHub Status
The original handoff believed these changes were not pushed. During Codex takeover on 2026-06-16, `origin/main:index.html` was checked and these fixes were already present in GitHub:

- **v1.7 fixes:**
  - Fixed duplicate inventory rows when adding stock
  - Fixed Save button spam (double-click protection)
  - Refactored `deductFilament()` helper that handles both new-row and merge-into-existing paths
  - Auto-deducts filament usage from the Filament tab when adding stock (with confirmation dialogs for edge cases)

- **PWA conversion (discussed, not implemented):**
  - `manifest.json`, service worker, cache strategy, icon meta tags
  - Goal: make it feel more native on Tony's Apple devices (iPhone, iPad, MacBook Pro M1 Max)
  - Tony was going to provide an icon image — may not have done so yet

---

## ⚠️ Critical Knowledge — Read This First

### Apps Script Deployment Rule
**When code changes affect tabs, actions, or sheet structure, you MUST create a NEW deployment** (Deploy → New deployment) — NOT edit an existing one. New deployments get a new URL. Old deployments are frozen to their version. After creating a new deployment:
1. The new URL must be updated in PrintFlow Settings → Reconnect on ALL devices
2. Run `?action=init` on the new URL to ensure tabs exist with correct headers

This was just debugged today — Tony's work computer was pointing to a stale deployment that didn't have the Expenses tab.

### Apps Script CORS Gotcha
POST requests are unreliable due to Google's redirect behavior (browser drops POST body on 302 redirect). The workaround in the current code:
- Uses `redirect: 'follow'` 
- Sets `Content-Type: text/plain;charset=utf-8` to avoid CORS preflight
- The `api()` function sends action/tab as URL query params AND the full payload as POST body
- GET requests with JSON-stringified URL params are preferred for all operations (potential future refactor)

### Google Drive is Read-Only
The Google Drive connector (if connected) is read-only. All writes to the Google Sheet MUST go through the Apps Script Web App.

### File Reading
The most reliable way to read the current codebase is from files uploaded directly to the conversation or fetched from GitHub raw:
```
https://raw.githubusercontent.com/centralcali3d/printflow/main/index.html
https://raw.githubusercontent.com/centralcali3d/printflow/main/PrintFlow_AppsScript.js
```

---

## Google Sheet Tabs & Headers

### Filament
`ID | Type | Color | On Hand (kg) | Cost per Spool ($) | Build To (spools) | Vendor | Status | Swatch Hex`

### Supplies
`ID | Item Name | Category | Qty | Unit Cost ($) | Extended ($) | Printer | Status | Order Date`

### Products
`ID | Product Name | Width (in) | Depth (in) | Height (in) | Weight (lb) | Filament (g) | Filament Type | Print Time (hr) | Prep Time (hr) | Sale Price ($) | TikTok Fee (%)`

> **Important:** `Filament (g)` = grams per print (NOT kg, NOT dollars). `Print Time (hr)` = machine time (electricity). `Prep Time (hr)` = hands-on labor (labor cost).

### Inventory
`ID | Product Name | Filament Type | Color | Qty Available | Qty Sold | On Loan | Build To`

### Sales
`ID | Date | Order / Ref # | Channel | Product Name | Filament Type | Color | Qty | Sale Price ($) | Subtotal ($) | Payout ($) | Status | Affiliate Fee (%) | Affiliate Fee ($) | Packaging | Packaging Cost ($) | Shipping Trip | Notes | Unit Cost ($) | Total Cost ($) | Profit ($) | Margin (%)`

### Queue
`ID | Product Name | Filament Type | Color | Qty | Est. Print Time (hr) | Priority | Status | Notes | Date Added | Auto Generated`

### Expenses
`ID | Date | Category | Description | Amount ($) | Printer | Miles | Notes`

### Settings
`Setting | Value | Description`

---

## Cost Formulas

### Per Product
```
Filament Cost  = (Filament (g) / 1000) × Cost per Spool  [assumes 1kg spool]
Electricity    = Print Time (hr) × electricity_rate_per_hr
Labor          = Prep Time (hr) × labor_rate_per_hr
Packaging      = Small $1.25 / Medium $1.75 / Large $2.00 / Custom
Total Cost     = Filament + Electricity + Labor + Packaging
```

### Per Sale
```
Subtotal           = Sale Price × Qty
Payout (TikTok)    = Subtotal × (1 − TikTok Fee%)
Payout (In-Person) = Subtotal  (no platform fee)
Payout (Sample)    = $0
Affiliate Fee ($)  = Subtotal × Affiliate Fee (%)
Profit             = Payout − (Total Cost × Qty) − Affiliate Fee ($)
```

---

## Settings (current values in spreadsheet)

| Setting | Value | Description |
|---------|-------|-------------|
| electricity_rate_per_hr | 0.17 | H2C: ~0.37 kW × $0.46/kWh |
| tiktok_default_fee_pct | 10 | TikTok platform fee % |
| labor_rate_per_hr | 25.00 | Prep time hourly rate |
| mileage_rate | 0.70 | IRS 2026 standard rate |
| post_office_miles | 3.6 | Round trip to USPS |

**Update 2026-06-16:** The default in `index.html` and `PrintFlow_AppsScript.js` has been aligned to `0.17` so fresh installs and local fallback settings match the spreadsheet.

---

## Apps Script API

| Action | Method | Description |
|--------|--------|-------------|
| `ping` | GET | Health check, returns `{ ok: true, ts }` |
| `init` | GET | Creates all tabs with headers (idempotent) |
| `seed` | GET | Seeds Products with defaults (skips if data exists) |
| `read` | GET/POST | `?action=read&tab=TabName` → `{ rows: [...] }` |
| `write` | POST | Appends row to tab. Body: `{ action, tab, row }` |
| `update` | POST | Updates row by ID. Body: `{ action, tab, row }` (row must have `ID`) |
| `delete` | POST | Deletes row by ID. Body: `{ action, tab, id }` |
| `getSettings` | GET | Returns all settings as key/value object |
| `updateSetting` | POST | Updates one setting. Body: `{ action, key, value }` |
| `logTrip` | POST | Creates mileage expense. Body: `{ action, date, orderCount, orderRefs }` |

The frontend `api()` function sends action+tab as query params and the full payload as POST body (to work around CORS redirect issues).

---

## Known Issues & Pending Work

### Bugs to Fix
- [x] **v1.5–v1.7 changes are present on GitHub main** — duplicate inventory row prevention, Save button spam protection, `deductFilament()` helper, and filament auto-deduction were verified in `origin/main:index.html`
- [x] **Electricity rate default mismatch** — code now defaults to `$0.17`, matching the sheet value

### Features Pending
- [ ] **PWA conversion** — add `manifest.json`, service worker, cache strategy, icon meta tags to make it feel native on iPhone/iPad/Mac Safari. Tony was going to provide an icon.
- [ ] **Prep times need updating** — current values may be inaccurate; Tony needs to time actual workflow (~15-20 min / 0.25-0.33 hr per item is realistic)
- [ ] **Heartbeat product** — not priced yet ($0)
- [ ] **Mini Building Block pricing** — losing money at current price; needs repricing or prep time reduction via batching

### Future Ideas
- TikTok API integration (future phase)
- Batch printing efficiency tracking (amortize prep time across multiple units)
- Separating "machine time" rate from labor rate more explicitly
- Repricing strategy for small items with long print times

---

## Development Workflow

1. Edit `index.html` locally (it's the entire frontend)
2. Push to GitHub `main` branch → GitHub Pages auto-deploys (2-3 min delay)
3. Hard refresh browser: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Win)
4. If Apps Script code changed:
   - Open spreadsheet → Extensions → Apps Script → paste new code → Save
   - **Deploy → New deployment** (NOT edit existing)
   - Update URL in PrintFlow Settings on all devices
5. If new tabs/columns added: run `?action=init` on the new URL
6. **Always update `README.md` and `PRINTFLOW_PROJECT_CONTEXT.md`** alongside code changes

---

## File Update Discipline

When making changes:
1. Update `index.html` with the feature/fix
2. Update `README.md` changelog
3. Update `PRINTFLOW_PROJECT_CONTEXT.md` version number and completed items
4. If Apps Script changed, update `PrintFlow_AppsScript.js` version/changelog header
5. Commit and push all changed files together

---

## Tony's Setup

- **Devices:** MacBook Pro M1 Max, iPhone, iPad
- **Printers:** Bambu Lab H2C (primary), P1S, P2S
- **Filament:** Primarily PLA Basic and PLA Basic Matte, large color inventory
- **Sales channels:** TikTok Shop, in-person at VUSD school events
- **Testing style:** Uses the app live, reports bugs from real usage, iterates in-session
- **Session pattern:** Feature-dense — multiple bugs or features per conversation with incremental versioning

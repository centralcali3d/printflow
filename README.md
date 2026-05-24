# PrintFlow — 3D Print Business Manager

A single-file web app for managing a 3D printing business. Tracks filament inventory, supplies, products, print queue, and sales — all synced to a Google Sheet via Apps Script so data is accessible from any device.

**Live app:** https://centralcali3d.github.io/printflow/

---

## Features

- **Filament** — Track every spool by type, color, cost, and quantity on hand. Color swatches, reorder status, and per-gram cost calculated automatically.
- **Supplies** — Manage hardware, hotends, bed plates, consumables, and printers with cost tracking.
- **Products** — Product catalog with automatic cost calculation (filament + electricity). Shows profit and margin for both TikTok and in-person sales.
- **Inventory** — Stock levels with build-to targets, velocity tracking (sold/day), and days-remaining estimates.
- **Print Queue** — Auto-generated from inventory needs or manually added. Priority sorting (High / Medium / Low).
- **Sales** — Record TikTok and in-person orders. Automatic payout calculation after TikTok fees. Profit calculated per sale using actual product cost.
- **Settings** — Configurable electricity rate ($/hr) synced to the spreadsheet. Also editable directly in the Google Sheet.

---

## How It Works

The app is a self-contained HTML file with no build step or dependencies beyond Google Fonts. All data lives in a **Google Sheet (PrintFlow DB)**, and a **Google Apps Script Web App** serves as the backend API — handling reads, writes, updates, and deletes for every tab.

```
Browser (index.html)
      ↕ fetch (POST/GET)
Google Apps Script Web App
      ↕ SpreadsheetApp
Google Sheet (PrintFlow DB)
```

On load, the app calls `getSettings` to read the electricity rate before rendering any cost data. All other tabs load in parallel.

---

## Setup

### 1 — Google Sheet

Create a new Google Sheet and name it **PrintFlow DB**. Note the Sheet ID from the URL (the long string between `/d/` and `/edit`).

### 2 — Apps Script

1. In the spreadsheet, go to **Extensions → Apps Script**
2. Delete any existing code
3. Paste the contents of `PrintFlow_AppsScript.js`
4. Update `SHEET_ID` at the top if it doesn't match yours
5. Click **Save**

### 3 — Deploy as Web App

1. Click **Deploy → New deployment**
2. Click the gear icon → select **Web app**
3. Set **Execute as** → Me
4. Set **Who has access** → Anyone
5. Click **Deploy → Authorize → Allow**
6. Copy the Web App URL

### 4 — Connect the App

1. Open the PrintFlow web app
2. Click the 🔗 button in the top right
3. Paste your Apps Script Web App URL
4. Click **Connect**

The app will initialize all sheet tabs automatically on first connect. To seed your existing data, call:

```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=seed
```

### 5 — Initialize Settings Tab

To create the Settings tab in your spreadsheet (required for the electricity rate feature):

```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=init
```

Response should be:
```json
{"ok":true,"created":["Settings"],"message":"Sheets initialized"}
```

---

## Electricity Rate

The electricity cost per hour of printing is stored in the **Settings** tab of the spreadsheet under the key `electricity_rate_per_hr`. The default is `$0.12/hr`.

You can update it two ways:
- **In the app** → Settings tab → Electricity Rate → Save Settings
- **In the spreadsheet** → Settings tab → edit the Value column in the `electricity_rate_per_hr` row

The app reads this value fresh on every load, so changes take effect immediately on the next page refresh.

---

## Profit Calculation

For each sale:

```
Filament Cost  = Filament (kg) × Cost per Spool (from Filament tab)
Electricity    = Print Time (hr) × Electricity Rate ($/hr)
Total Cost     = Filament Cost + Electricity
Payout         = Sale Price × (1 − TikTok Fee%)   [TikTok]
               = Sale Price × Qty                  [In-Person]
Profit         = Payout − Total Cost
```

Note: Supplies (hotends, bed plates, etc.) are not currently factored into per-sale cost — only filament and electricity.

---

## Files

| File | Description |
|------|-------------|
| `index.html` | The entire front-end application (self-contained) |
| `PrintFlow_AppsScript.js` | Google Apps Script backend — paste into Extensions → Apps Script |
| `README.md` | This file |

---

## Apps Script API Reference

All requests go to your Web App URL via GET or POST.

| Action | Description |
|--------|-------------|
| `ping` | Health check — returns `{ok:true, ts:...}` |
| `init` | Creates all sheet tabs with headers if they don't exist |
| `seed` | Populates tabs with initial data (skips tabs that already have data) |
| `read` | Returns all rows from a tab (`?tab=Filament`) |
| `write` | Appends a new row to a tab |
| `update` | Updates an existing row by ID |
| `delete` | Deletes a row by ID |
| `getSettings` | Returns all key/value pairs from the Settings tab |
| `updateSetting` | Updates a single setting by key |

---

## Sheet Tabs

| Tab | Description |
|-----|-------------|
| Filament | Spool inventory by type and color |
| Supplies | Hardware, consumables, hotends, bed plates |
| Products | Product catalog with filament usage and pricing |
| Inventory | Stock levels, sold counts, build-to targets |
| Sales | Order history for TikTok and in-person sales |
| Queue | Print job queue (auto and manual) |
| Settings | App configuration (electricity rate, TikTok fee default) |

---

## Mobile / Home Screen

The app works on iOS and Android. To add to your iPhone home screen:

1. Open the app in **Safari**
2. Tap **Share → Add to Home Screen**
3. Name it **PrintFlow** → tap **Add**

It will open full-screen without the browser UI, like a native app.

---

## Changelog

### v1.1 — 2026-05-23
- Added **Settings tab** to the Google Sheet with `electricity_rate_per_hr` and `tiktok_default_fee_pct`
- Added **Settings page** in the app (new nav tab) — electricity rate editable in-app and synced to sheet
- Electricity rate now loads from the sheet on startup instead of being hardcoded at $0.12/hr
- Cost preview in the product modal now shows the active electricity rate
- Added `getSettings` and `updateSetting` actions to the Apps Script backend
- Apps Script `init` now creates and styles the Settings tab automatically
- Added reconnect option in the Settings page

### v1.0 — 2026-05-15
- Initial release
- Full CRUD for Filament, Supplies, Products, Inventory, Sales, and Queue tabs
- Google Sheets sync via Apps Script Web App
- TikTok and In-Person sale channels with automatic payout calculation
- Inventory velocity tracking (sold/day) and days-remaining estimates
- Print queue with auto-generation from inventory needs and manual job entry
- Color swatch support for filament
- Mobile-optimized layout with iOS home screen support
- GitHub Pages hosting

---

## Notes

- The Apps Script URL is stored in your browser's `localStorage`. Each device needs to be connected once.
- If you redeploy the Apps Script as a **new deployment**, you'll get a new URL — update it in the app's Settings page.
- To keep the same URL across script updates, use **Deploy → Manage deployments → Edit → New version**.
- The `seed` action skips any tab that already has data rows, so it's safe to call again without duplicating records.

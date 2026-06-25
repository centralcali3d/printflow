// =====================================================================
// PrintFlow — Google Apps Script Backend
// Version: 1.4  |  Date: 2026-06-25
// ---------------------------------------------------------------------
// SETUP INSTRUCTIONS:
//   1. In your PrintFlow DB spreadsheet, go to:
//      Extensions → Apps Script
//   2. Delete any existing code in the editor
//   3. Paste this entire file into the editor
//   4. Click Save (floppy disk icon)
//   5. Click "Deploy" → "New deployment"
//   6. Click the gear icon next to "Type" → select "Web app"
//   7. Set "Execute as" → Me
//   8. Set "Who has access" → Anyone
//   9. Click Deploy → Authorize → Allow
//  10. Copy the Web App URL — paste it into the PrintFlow app
// =====================================================================
// CHANGELOG
// 2026-05-15  v1.0  Initial release — full CRUD for all tabs,
//                   sheet initialization, CORS support
// 2026-05-23  v1.1  Added Settings tab with electricity rate,
//                   getSettings and updateSettings actions
// 2026-05-29  v1.2  Fixed filament cost: 'Filament (kg)' renamed to
//                   'Filament (g)', stores actual grams per print
// 2026-05-29  v1.3  Added Expenses tab, updated Products/Sales headers
//                   for prep time, packaging, affiliate fees, samples,
//                   mileage logging. Added logTrip action.
// 2026-06-25  v1.4  Added Sales cost/profit snapshot columns and
//                   idempotent missing-header append during init.
// =====================================================================

const SHEET_ID = '14QXzXNVTDpCrmgaEutLsTFu-FIKR9PrLNw44XeN1mLs';

// Tab names and their column definitions (human-readable)
const TABS = {
  Filament: [
    'ID', 'Type', 'Color', 'On Hand (kg)', 'Cost per Spool ($)',
    'Build To (spools)', 'Vendor', 'Status', 'Swatch Hex'
  ],
  Supplies: [
    'ID', 'Item Name', 'Category', 'Qty', 'Unit Cost ($)',
    'Extended ($)', 'Printer', 'Status', 'Order Date'
  ],
  Products: [
    'ID', 'Product Name', 'Width (in)', 'Depth (in)', 'Height (in)',
    'Weight (lb)', 'Filament (g)', 'Filament Type', 'Print Time (hr)',
    'Prep Time (hr)', 'Sale Price ($)', 'TikTok Fee (%)'
  ],
  Inventory: [
    'ID', 'Product Name', 'Filament Type', 'Color',
    'Qty Available', 'Qty Sold', 'On Loan', 'Build To'
  ],
  Sales: [
    'ID', 'Date', 'Order / Ref #', 'Channel', 'Product Name',
    'Filament Type', 'Color', 'Qty', 'Sale Price ($)',
    'Subtotal ($)', 'Payout ($)', 'Status',
    'Affiliate Fee (%)', 'Affiliate Fee ($)',
    'Packaging', 'Packaging Cost ($)',
    'Shipping Trip', 'Notes',
    'Unit Cost ($)', 'Total Cost ($)', 'Profit ($)', 'Margin (%)'
  ],
  Queue: [
    'ID', 'Product Name', 'Filament Type', 'Color', 'Qty',
    'Est. Print Time (hr)', 'Priority', 'Status', 'Notes',
    'Date Added', 'Auto Generated'
  ],
  Expenses: [
    'ID', 'Date', 'Category', 'Description', 'Amount ($)',
    'Printer', 'Miles', 'Notes'
  ]
};

// Settings tab column definitions
const SETTINGS_HEADERS = ['Setting', 'Value', 'Description'];

// Default settings — used when initializing the Settings tab
const DEFAULT_SETTINGS = [
  ['electricity_rate_per_hr', '0.17',  'Electricity cost per hour of printing ($/hr).'],
  ['tiktok_default_fee_pct',  '10',    'Default TikTok platform fee percentage (%).'],
  ['labor_rate_per_hr',       '25.00', 'Your hourly labor rate for prep time ($/hr).'],
  ['mileage_rate',            '0.70',  'IRS mileage reimbursement rate ($/mile). Update each tax year.'],
  ['post_office_miles',       '3.6',   'Round-trip miles to the post office for shipping runs.'],
];

// ── Entry Points ──────────────────────────────────────────────────────
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const params = e.parameter || {};
    const body   = e.postData ? JSON.parse(e.postData.contents || '{}') : {};
    const action = params.action || body.action;
    const tab    = params.tab    || body.tab;

    let result;

    switch (action) {
      case 'init':           result = initSheets();                              break;
      case 'read':           result = readTab(tab);                              break;
      case 'write':          result = writeRow(tab, body.row);                  break;
      case 'update':         result = updateRow(tab, body.row);                 break;
      case 'delete':         result = deleteRow(tab, body.id);                  break;
      case 'seed':           result = seedData();                               break;
      case 'getSettings':    result = getSettings();                            break;
      case 'updateSetting':  result = updateSetting(body.key, body.value);      break;
      case 'logTrip':        result = logPostOfficeTrip(body);                  break;
      case 'ping':           result = { ok: true, ts: new Date().toISOString() }; break;
      default:               result = { error: 'Unknown action: ' + action };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.toString(), stack: err.stack });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Sheet Initialization ──────────────────────────────────────────────
function initSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const created = [];

  Object.entries(TABS).forEach(([tabName, headers]) => {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      created.push(tabName);
    }
    if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() === '') {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#1e2028');
      headerRange.setFontColor('#a78bfa');
      headerRange.setFontWeight('bold');
      headerRange.setFontSize(10);
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
    } else {
      appendMissingHeaders(sheet, headers);
    }
  });

  // Initialize Settings tab
  initSettingsTab(ss, created);

  // Remove default "Sheet1" if empty
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() <= 1) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }

  return { ok: true, created, message: 'Sheets initialized' };
}

function appendMissingHeaders(sheet, expectedHeaders) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].filter(String);
  const missing = expectedHeaders.filter(h => existing.indexOf(h) === -1);
  if (!missing.length) return;

  const startCol = existing.length + 1;
  sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
  const headerRange = sheet.getRange(1, startCol, 1, missing.length);
  headerRange.setBackground('#1e2028');
  headerRange.setFontColor('#a78bfa');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(10);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(startCol, missing.length);
}

function initSettingsTab(ss, created) {
  let sheet = ss.getSheetByName('Settings');
  if (!sheet) {
    sheet = ss.insertSheet('Settings');
    created.push('Settings');
  }

  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() === '') {
    // Write headers
    sheet.getRange(1, 1, 1, SETTINGS_HEADERS.length).setValues([SETTINGS_HEADERS]);
    const headerRange = sheet.getRange(1, 1, 1, SETTINGS_HEADERS.length);
    headerRange.setBackground('#1e2028');
    headerRange.setFontColor('#a78bfa');
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(10);
    sheet.setFrozenRows(1);

    // Write default settings
    sheet.getRange(2, 1, DEFAULT_SETTINGS.length, 3).setValues(DEFAULT_SETTINGS);

    // Style the Value column (B) to make it visually distinct / editable
    const valueRange = sheet.getRange(2, 2, DEFAULT_SETTINGS.length, 1);
    valueRange.setBackground('#262830');
    valueRange.setFontColor('#34d399');
    valueRange.setFontWeight('bold');

    // Style the Description column (C) in muted text
    const descRange = sheet.getRange(2, 3, DEFAULT_SETTINGS.length, 1);
    descRange.setFontColor('#9ca3b8');
    descRange.setFontStyle('italic');

    sheet.autoResizeColumns(1, 3);
    sheet.setColumnWidth(3, 400);
  }
}

// ── Settings ──────────────────────────────────────────────────────────
function getSettings() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Settings');

  if (!sheet || sheet.getLastRow() < 2) {
    const defaults = {};
    DEFAULT_SETTINGS.forEach(([key, val]) => { defaults[key] = val; });
    return { ok: true, settings: defaults, source: 'defaults' };
  }

  const rows     = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  const settings = {};
  rows.forEach(([key, value]) => {
    if (key) settings[key] = value.toString();
  });

  return { ok: true, settings, source: 'sheet' };
}

function updateSetting(key, value) {
  if (!key) return { error: 'Missing key' };

  const ss    = SpreadsheetApp.openById(SHEET_ID);
  let   sheet = ss.getSheetByName('Settings');

  if (!sheet) {
    initSettingsTab(ss, []);
    sheet = ss.getSheetByName('Settings');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { error: 'Settings tab is empty' };

  const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 2, 2).setValue(value);
      return { ok: true, key, value };
    }
  }

  // Key not found — append it
  const newRow = lastRow + 1;
  sheet.getRange(newRow, 1, 1, 2).setValues([[key, value]]);
  return { ok: true, key, value, created: true };
}

// ── Post Office Trip Logger ───────────────────────────────────────────
function logPostOfficeTrip(body) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const settings = getSettings().settings;

  const miles     = parseFloat(settings.post_office_miles) || 3.6;
  const rate      = parseFloat(settings.mileage_rate)      || 0.70;
  const cost      = (miles * rate).toFixed(2);
  const date      = body.date || new Date().toISOString().slice(0, 10);
  const orderRefs = body.orderRefs || '';
  const orderCount= body.orderCount || 1;

  const row = {
    'ID':          'exp_trip_' + Date.now(),
    'Date':        date,
    'Category':    'Mileage',
    'Description': 'Post office shipping run — ' + orderCount + ' order(s). Orders: ' + orderRefs + '. Destination: USPS Post Office. Purpose: Shipping customer orders.',
    'Amount ($)':  cost,
    'Printer':     '',
    'Miles':       miles,
    'Notes':       'IRS mileage log — ' + miles + ' mi round trip @ $' + rate + '/mi',
  };

  return writeRow('Expenses', row);
}

// ── Read ──────────────────────────────────────────────────────────────
function readTab(tabName) {
  if (!TABS[tabName]) return { error: 'Unknown tab: ' + tabName };

  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) return { rows: [] };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { rows: [] };

  const headers = TABS[tabName];
  const data    = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

  const rows = data
    .filter(row => row[0] !== '')
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });

  return { rows };
}

// ── Write ─────────────────────────────────────────────────────────────
function writeRow(tabName, row) {
  if (!TABS[tabName]) return { error: 'Unknown tab: ' + tabName };
  if (!row)           return { error: 'Missing row data' };

  const ss      = SpreadsheetApp.openById(SHEET_ID);
  const sheet   = ss.getSheetByName(tabName);
  if (!sheet) return { error: 'Sheet not found: ' + tabName };

  const headers = TABS[tabName];
  const values  = headers.map(h => row[h] !== undefined ? row[h] : '');
  sheet.appendRow(values);

  return { ok: true };
}

// ── Update ────────────────────────────────────────────────────────────
function updateRow(tabName, row) {
  if (!TABS[tabName]) return { error: 'Unknown tab: ' + tabName };
  if (!row || !row.ID) return { error: 'Missing row or ID' };

  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) return { error: 'Sheet not found: ' + tabName };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { error: 'No rows to update' };

  const ids     = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  const rowIdx  = ids.indexOf(row.ID);
  if (rowIdx === -1) return { error: 'Row not found: ' + row.ID };

  const headers = TABS[tabName];
  const values  = headers.map(h => row[h] !== undefined ? row[h] : '');
  sheet.getRange(rowIdx + 2, 1, 1, headers.length).setValues([values]);

  return { ok: true };
}

// ── Delete ────────────────────────────────────────────────────────────
function deleteRow(tabName, id) {
  if (!TABS[tabName]) return { error: 'Unknown tab: ' + tabName };
  if (!id)            return { error: 'Missing ID' };

  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) return { error: 'Sheet not found: ' + tabName };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { error: 'No rows to delete' };

  const ids    = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  const rowIdx = ids.indexOf(id);
  if (rowIdx === -1) return { error: 'Row not found: ' + id };

  sheet.deleteRow(rowIdx + 2);
  return { ok: true };
}

// ── Seed Data ─────────────────────────────────────────────────────────
function seedData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const results = {};

  // NOTE: Filament (g) column now stores grams (not kg or dollars)
  const productData = [
    ['prod_iphone', 'iPhone Stand',9,12,3,0.5,85,'PLA Basic',0.32,0.15,11.99,10],
    ['prod_watch',  'Watch Band Holder',9,9,3,0.62,170,'PLA Basic',0.35,0.2,17.99,10],
    ['prod_lbb_sq', 'Little Building Block (Square Drawer)',4,4,3,0.65,175,'PLA Basic',0.425,0.2,12.99,10],
    ['prod_lbb_r1', 'Little Building Block (Rect 1 Drawer)',8,4,3,0.9,315,'PLA Basic',0.75,0.25,12.99,10],
    ['prod_lbb_r2', 'Little Building Block (Rect 2 Drawers)',8,4,3,0.9,315,'PLA Basic',0.75,0.25,12.99,10],
    ['prod_makeup', 'Makeup Holder',5.25,5.25,4.75,0.9,250,'PLA Basic',0.82,0.25,10.99,10],
    ['prod_jewel',  'Jewelry Box with Lid',5,5,1.5,0.9,175,'PLA Basic',0.45,0.2,9.99,10],
    ['prod_mbb_sq', 'Mini Building Block (Square Drawer)',3,3,2.25,0.5,90,'PLA Basic',0.22,0.15,5.99,10],
    ['prod_mbb_r1', 'Mini Building Block (Rect 1 Drawer)',0,0,0,0.8,150,'PLA Basic',0.334,0.2,7.99,10],
    ['prod_heart2', 'Love Spinning Heart',9,9,2,0,60,'PLA Basic',0.11,0.1,6.99,10],
    ['prod_heart1', 'Heartbeat',8.75,8.75,1.5,0,100,'PLA Basic',0,0.1,0,10],
    ['prod_3pack',  '3-Pack Mini Building Block (Square)',3,3,2.25,0.5,270,'PLA Basic',0.66,0.25,15.99,10],
  ];

  const datasets = {
    Products: productData,
  };

  Object.entries(datasets).forEach(([tabName, data]) => {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) { results[tabName] = 'sheet not found'; return; }
    if (sheet.getLastRow() > 1) { results[tabName] = 'skipped (data exists)'; return; }
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
    results[tabName] = data.length + ' rows added';
  });

  return { ok: true, seeded: results };
}

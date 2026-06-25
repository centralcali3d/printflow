# PrintFlow Backend API Contract
*Created: 2026-06-25*

This document captures the backend contract used by the current PrintFlow frontend so a native Apple app can reuse it without guessing at request shapes.

## Backend Topology

- Frontend client: `index.html`
- Backend endpoint: Google Apps Script Web App
- Database: Google Sheets

## Base Rules

- The frontend stores the Apps Script URL per device.
- `GET` is preferred where practical because Google Apps Script redirect behavior can be awkward for browser `POST`.
- The current frontend may send action metadata in query params and payload data in the body.
- Responses are JSON.

## Actions

### `ping`

Purpose:
- health check

Request:
- `GET ?action=ping`

Expected response:
```json
{ "ok": true, "ts": 1712345678901 }
```

### `init`

Purpose:
- create required tabs and headers if they do not exist

Request:
- `GET ?action=init`

Expected response shape:
```json
{ "ok": true, "created": ["Filament", "Supplies"], "message": "Sheets initialized" }
```

### `seed`

Purpose:
- seed default product data

Request:
- `GET ?action=seed`

### `read`

Purpose:
- read rows from a tab

Request:
- `GET ?action=read&tab=Filament`

Expected response:
```json
{ "ok": true, "rows": [] }
```

### `write`

Purpose:
- append a row to a tab

Request:
- `POST ?action=write&tab=Sales`

Body:
```json
{
  "action": "write",
  "tab": "Sales",
  "row": {}
}
```

Expected response:
```json
{ "ok": true }
```

### `update`

Purpose:
- update an existing row by `ID`

Request:
- `POST ?action=update&tab=Inventory`

Body:
```json
{
  "action": "update",
  "tab": "Inventory",
  "row": {
    "ID": "inv_123"
  }
}
```

### `delete`

Purpose:
- delete an existing row by `ID`

Request:
- `POST ?action=delete&tab=Queue`

Body:
```json
{
  "action": "delete",
  "tab": "Queue",
  "id": "queue_123"
}
```

### `getSettings`

Purpose:
- read settings as key/value pairs

Request:
- `GET ?action=getSettings`

Expected response:
```json
{
  "ok": true,
  "settings": {
    "electricity_rate_per_hr": 0.17
  }
}
```

### `updateSetting`

Purpose:
- update one setting entry

Request:
- `POST ?action=updateSetting`

Body:
```json
{
  "action": "updateSetting",
  "key": "labor_rate_per_hr",
  "value": 25
}
```

### `logTrip`

Purpose:
- create a mileage expense row for shipping trips

Request:
- `POST ?action=logTrip`

Body:
```json
{
  "action": "logTrip",
  "date": "2026-06-25",
  "orderCount": 2,
  "orderRefs": ["TT-1001", "TT-1002"]
}
```

## Required Tabs

- `Filament`
- `Supplies`
- `Products`
- `Inventory`
- `Sales`
- `Queue`
- `Expenses`
- `Settings`

## Data Model Notes

- All business rows are keyed by `ID`.
- The frontend expects named columns and object-like row mapping.
- `Filament (g)` is grams per print, not kilograms.
- `Print Time (hr)` is machine time.
- `Prep Time (hr)` is labor time.

## Native App Implications

The Apple app should:
- treat the Apps Script URL as editable environment configuration
- run `ping` before a full sync
- handle backend deployment URL changes cleanly
- surface user-friendly errors when the endpoint is stale or unreachable

## Recommended Next Contract Improvements

Before or during native app work, add:

1. `action=version`
   Return frontend/backend compatibility metadata.

2. Stable error envelope
   Example:
   ```json
   { "ok": false, "error": "Missing tab", "code": "TAB_NOT_FOUND" }
   ```

3. Normalized success envelope
   Ensure all actions always return `{ ok: boolean, ... }`.

4. Optional sync metadata
   Return server timestamp and backend version so the native app can show clearer sync state.

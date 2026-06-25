# PrintFlow Native App Roadmap
*Created: 2026-06-25*

## Goal

Turn PrintFlow into a real Apple-platform app for:
- iPhone
- iPad
- Mac

without interrupting the current GitHub Pages + Apps Script + Google Sheets workflow.

## Current Baseline

Today PrintFlow is:
- a single-file PWA frontend in `index.html`
- backed by `PrintFlow_AppsScript.js`
- using Google Sheets as the system of record
- already installable on Apple devices as a PWA

That means the safest path is not a full rewrite first. The safest path is:
1. keep the PWA working exactly as the production path
2. stabilize the backend contract
3. build an Apple app in parallel
4. switch test users to the app only after feature parity is proven

## Recommended App Strategy

### Phase 1: Hybrid Apple app

Build a SwiftUI app that hosts the existing PrintFlow web UI in a `WKWebView`, while adding native app shell features around it.

Why this is the right first move:
- fastest way to get to a real `.app` / iPhone / iPad test build
- keeps one business workflow instead of maintaining two frontends immediately
- preserves the existing Google Sheets backend
- reduces risk during the next month
- lets us add native features incrementally later

### What stays the same in Phase 1

- Google Sheets remains the database
- Apps Script remains the backend
- GitHub Pages remains the production web path
- the current PWA remains available for day-to-day use

### What becomes native in Phase 1

- app packaging for iPhone, iPad, and Mac
- saved backend connection handling
- native launch, app icon, splash/loading shell
- optional offline/error screens
- optional share/export hooks later

## Why not rewrite everything in SwiftUI first

A full native rewrite is possible, but it is the wrong first milestone for a one-month testing target because:
- the current frontend already contains the business logic
- the backend contract is informal and embedded in `index.html`
- reproducing every workflow natively would take longer and create more regression risk

The more disciplined route is:
- ship a hybrid app for testing
- extract shared backend rules
- then replace screens with native SwiftUI one by one if the hybrid shell proves worth keeping

## Delivery Plan

### Phase 0: Prep and contract hardening

Target:
- make the current web app easier to wrap safely

Work:
- document the backend API contract
- identify frontend logic that should be isolated from DOM code
- define app configuration strategy for Apps Script URL and environment state
- add a versioned native-app track to continuity docs

### Phase 1: Testable Apple shell

Target:
- internal test build in roughly one month

Work:
- create Xcode project for iOS + iPadOS + macOS via Mac Catalyst or a shared SwiftUI target set
- load the current PrintFlow web app inside `WKWebView`
- inject a small native bridge only if needed
- store and edit the Apps Script URL from native settings
- add app icons, launch assets, and app metadata
- verify login-free operation and live Google Sheets sync

Success criteria:
- app launches on iPhone, iPad, and Mac
- all existing CRUD flows still work
- current PWA remains unchanged and usable

Current progress:
- Created `Native/PrintFlow/PrintFlow.xcodeproj`
- Added a SwiftUI shell that loads the live PrintFlow PWA in `WKWebView`
- Added loading/error overlay states
- Verified compile with `xcodebuild` against `iphonesimulator26.5`
- Verified interactive launch on iPhone 17 Pro Simulator
- Added native settings for viewing/updating the Apps Script `/exec` URL
- Injects the saved Apps Script URL on launch/reload so the hosted app can sync immediately

### Phase 2: Native enhancements

Target:
- make the app feel better than a wrapper

Work:
- native network status and retry UX
- file export/share support
- optional barcode/label/photo workflows if needed later
- stronger caching and sync state visibility

### Phase 3: Selective native rewrite

Target:
- move high-value workflows off the embedded web UI only where it pays off

Good native-first candidates:
- dashboard and KPIs
- queue management
- quick sale entry
- settings and sync health

Keep web-based longer if needed:
- dense admin tables
- low-frequency setup flows

## Required Backend Improvements Before App Build

These are the weak points that matter most for a native app:

1. API contract is implicit.
   The request/response shapes live inside the frontend code and should be documented explicitly.

2. Apps Script deployment handling is fragile.
   New deployments create new URLs, so the app needs a clear way to update or switch backend endpoints.

3. Error handling should be normalized.
   The app will need stable success/error payloads instead of loose response assumptions.

4. Version compatibility is not explicit.
   The frontend and backend should expose a lightweight version check so the app can warn on mismatch.

## Proposed Near-Term Build Sequence

1. Freeze and document the existing API contract.
2. Refactor the current frontend slightly so connection/bootstrap logic is cleaner.
3. Create a Git-backed native app workspace on a Mac.
4. Build the SwiftUI shell around the existing hosted app.
5. Test against the same live Google Sheet.
6. Only after parity is proven, decide whether to keep hybrid or replace screens natively.

## Repo Guidance

This workspace currently contains the web app files but does not appear to be an active git checkout. Before native development starts in earnest, work from the live GitHub repo so the web and app tracks stay versioned together or in a deliberate multi-repo structure.

Recommended structure:
- keep the current web app repo as the source of truth
- add a native app folder in that repo, or create a second repo only if release processes need separation

## Immediate Next Work

The next practical tasks are:
- add native share/export hooks for CSV files
- test the shell on iPad and Mac targets
- add native sync-health/status checks around the hosted app

## Decision

Recommended direction:
- keep PrintFlow live as a PWA for production use
- start a hybrid SwiftUI + `WKWebView` Apple app now
- defer a full native rewrite until real test usage shows where native UI actually matters

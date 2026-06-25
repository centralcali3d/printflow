# PrintFlow Native

SwiftUI shell for the existing PrintFlow web app.

## Phase 1 Scope

- Loads `https://centralcali3d.github.io/printflow/` in `WKWebView`
- Prefills the current Apps Script `/exec` URL into web storage on first launch
- Keeps the current PWA and Apps Script backend as the production source of truth
- Adds a native app container that can later grow settings, sharing, and offline/error handling

## Build

Open `PrintFlow.xcodeproj` in Xcode and run the `PrintFlow` scheme on an iPhone or iPad simulator.

Command-line compile check:

```bash
xcodebuild \
  -project Native/PrintFlow/PrintFlow.xcodeproj \
  -target PrintFlow \
  -configuration Debug \
  -sdk iphonesimulator26.5 \
  SYMROOT=Native/PrintFlow/.build/PrintFlow \
  OBJROOT=Native/PrintFlow/.build/PrintFlow/obj \
  CODE_SIGNING_ALLOWED=NO \
  build
```

## Current Setup Note

The project compiles against the iOS Simulator SDK and has been verified launching on iPhone 17 Pro Simulator with live PrintFlow data synced through Apps Script.

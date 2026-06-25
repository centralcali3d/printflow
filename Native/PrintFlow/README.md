# PrintFlow Native

SwiftUI shell for the existing PrintFlow web app.

## Phase 1 Scope

- Loads `https://centralcali3d.github.io/printflow/` in `WKWebView`
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

The project compiles against the iOS Simulator SDK. To run it interactively, install an iOS simulator runtime/device in Xcode, then select a simulator and run the `PrintFlow` scheme.

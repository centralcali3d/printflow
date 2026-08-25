# Working on apps/printflow

Expo moves fast and this app is on **SDK 57** (React Native 0.86, React 19.2).
Check the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before
writing navigation or config code — several APIs moved recently.

## Gotchas already paid for

These cost real time during task 0.12. Don't rediscover them.

**`TabList` and `TabSlot` must be DIRECT children of `Tabs`.** `Tabs` discovers
the navigator's screens by inspecting its children, so wrapping them in a `View`
to get a row layout fails at runtime with *"Couldn't find any screens for the
navigator"*. Put the flex direction on `Tabs` itself.

**`asChild` uses `cloneElement`, whose props override the child's.** An inline
`<View style={...}>` inside `<TabList asChild>` is silently discarded — the
sidebar renders full-width in a row and nothing errors. The surface must be a
component that spreads props first and applies `style` last. See
`SidebarSurface` in `src/components/nav/sidebar-nav.tsx`.

**`ThemeProvider` is exported from `expo-router`**, not `@react-navigation/native`.

**pnpm needs `node-linker=hoisted`** (set in the repo-root `.npmrc`). Metro does
not follow pnpm's symlinks reliably.

## Structure

- `src/app/` — routes. Five destinations, defined once in `src/components/nav/nav-items.ts`.
- Native gets `NativeTabs` (a real `UITabBar`); web gets headless `expo-router/ui`. Both read the same nav items, so a route cannot exist in one navigator and not the other.
- Screens ≥900px wide use the shared sidebar on both platforms.

## Rules that outrank convenience

- Cost logic lives in `@printflow/cost-engine`. Never compute cost in a screen.
- Money is integer cents, never a JS float.
- Only the publishable/anon Supabase key belongs in this app. RLS enforces access.

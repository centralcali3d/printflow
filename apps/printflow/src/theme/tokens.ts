/**
 * PrintFlow design tokens.
 *
 * Lifted from the v1.11.0 `index.html` :root block. The current app's visual
 * identity is genuinely good and the plan (§6) keeps it rather than replacing
 * it — this file is the start of that, so the skeleton looks like PrintFlow
 * instead of the Expo starter.
 *
 * The full system (light mode, type scale, components) is task 6.1.
 */

export const Palette = {
  bg: '#0e0f11',
  surface: '#161820',
  surface2: '#1e2028',
  surface3: '#262830',
  border: '#2e3040',
  border2: '#3a3d52',

  accent: '#6c63ff',
  accent2: '#a78bfa',
  accent3: '#38bdf8',

  green: '#34d399',
  yellow: '#fbbf24',
  red: '#f87171',
  orange: '#fb923c',

  text: '#e8eaf0',
  text2: '#9ca3b8',
  text3: '#5a607a',
} as const;

export const Spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
} as const;

/**
 * Width at which the layout switches from a tab bar to a sidebar.
 * 900 keeps a portrait iPad (834pt) on tabs and gives landscape iPad
 * (1194pt) and desktop the sidebar.
 */
export const LARGE_SCREEN_BREAKPOINT = 900;

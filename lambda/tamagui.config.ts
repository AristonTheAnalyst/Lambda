import { createAnimations } from '@tamagui/animations-reanimated'
import { config as defaultConfig } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'

// ─── Animations (Reanimated) ──────────────────────────────────────────────────

const animations = createAnimations({
  fast:   { type: 'spring', damping: 20, mass: 1.2, stiffness: 250 },
  medium: { type: 'spring', damping: 10, mass: 0.9, stiffness: 100 },
  slow:   { type: 'spring', damping: 20, mass: 1.5, stiffness: 60 },
})

// ─── Lambda Dark Theme ────────────────────────────────────────────────────────
// Mirrors constants/Theme.ts — single source of truth kept there, mapped here

const lambdaDark = {
  // Standard Tamagui semantic tokens (used by built-in components)
  background:             '#262626',
  backgroundHover:        '#363636',
  backgroundPress:        '#363636',
  backgroundFocus:        '#2e2e2e',
  backgroundStrong:       '#1e1e1e',
  backgroundTransparent:  'transparent',

  color:                  '#ad9073',
  colorHover:             '#c0a485',
  colorPress:             '#c0a485',
  colorFocus:             '#ad9073',
  colorTransparent:       'transparent',

  borderColor:            '#383838',
  borderColorHover:       '#bb7423',
  borderColorFocus:       '#bb7423',
  borderColorPress:       '#bb7423',

  placeholderColor:       '#7a6555',
  outlineColor:           '#bb7423',

  shadowColor:            '#000',
  shadowColorHover:       '#000',
  shadowColorPress:       '#000',
  shadowColorFocus:       '#000',

  // ── Lambda semantic extras ────────────────────────────────────────────────
  surface:      '#2e2e2e',
  surfaceHigh:  '#363636',
  muted:        '#7a6555',
  accent:       '#bb7423',
  accentBg:     '#3a2810',
  accentText:   '#ffffff',
  danger:       '#c0392b',
  dangerBg:     '#3a1a1a',
  dangerBorder: '#7a2020',
}

// ─── Config ───────────────────────────────────────────────────────────────────

const tamaguiConfig = createTamagui({
  ...defaultConfig,
  animations,
  themes: {
    dark:  lambdaDark,
    light: lambdaDark, // Dark-only app; both modes use the same palette
  },
})

export type Conf = typeof tamaguiConfig

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

export default tamaguiConfig

import { THEME_PRESETS } from './themes';

const light = THEME_PRESETS.light.colors;
const dark = THEME_PRESETS.dark.colors;

/** Legacy shape for template components; driven by preset tables, not a mutable singleton. */
export default {
  light: {
    text: light.primary,
    background: light.bg,
    tint: light.accent,
    tabIconDefault: light.muted,
    tabIconSelected: light.accent,
  },
  dark: {
    text: dark.primary,
    background: dark.bg,
    tint: dark.accent,
    tabIconDefault: dark.muted,
    tabIconSelected: dark.accent,
  },
};

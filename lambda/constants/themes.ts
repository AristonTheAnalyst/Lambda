export type ThemeColors = {
  bg:           string;
  surface:      string;
  surfaceHigh:  string;
  border:       string;
  primary:      string;
  muted:        string;
  accent:       string;
  accentBg:     string;
  accentText:   string;
  danger:       string;
  dangerBg:     string;
  dangerBorder: string;
};

export type ThemeName = 'dark' | 'light' | 'monoDark' | 'monoLight';

/** Status bar + React Navigation: treat these as dark chrome (light icons). */
export function isDarkAppearance(name: ThemeName): boolean {
  return name === 'dark' || name === 'monoDark';
}

export const THEME_PRESETS: Record<ThemeName, { label: string; colors: ThemeColors }> = {
  dark: {
    label: 'Dark',
    colors: {
      bg:           '#262626',
      surface:      '#2e2e2e',
      surfaceHigh:  '#363636',
      border:       '#383838',
      primary:      '#ddcab7',
      muted:        '#9e8470',
      accent:       '#eb912b',
      accentBg:     '#3a2810',
      accentText:   '#fff',
      danger:       '#c0392b',
      dangerBg:     '#3a1a1a',
      dangerBorder: '#7a2020',
    },
  },
  light: {
    label: 'Light',
    colors: {
      // Bright canvas → slightly dimmer cards/nav (correct light-mode hierarchy).
      bg:           '#fafafa',
      surface:      '#f0f0f0',
      surfaceHigh:  '#e6e6e6',
      border:       '#d6d6d6',
      primary:      '#141414',
      muted:        '#5c5c5c',
      accent:       '#c76a10',
      accentBg:     '#fff4e6',
      accentText:   '#fff',
      danger:       '#b33229',
      dangerBg:     '#fde8e8',
      dangerBorder: '#d48888',
    },
  },
  monoDark: {
    label: 'Mono Dark',
    colors: {
      bg:           '#141414',
      surface:      '#1f1f1f',
      surfaceHigh:  '#2a2a2a',
      border:       '#404040',
      primary:      '#e6e6e6',
      muted:        '#8c8c8c',
      accent:       '#d4d4d4',
      accentBg:     '#333333',
      accentText:   '#0f0f0f',
      danger:       '#b35858',
      dangerBg:     '#2d1f1f',
      dangerBorder: '#6b4545',
    },
  },
  monoLight: {
    label: 'Mono Light',
    colors: {
      bg:           '#fafafa',
      surface:      '#efefef',
      surfaceHigh:  '#e4e4e4',
      border:       '#cfcfcf',
      primary:      '#141414',
      muted:        '#5a5a5a',
      accent:       '#2a2a2a',
      accentBg:     '#e6e6e6',
      accentText:   '#fafafa',
      danger:       '#9a3d3d',
      dangerBg:     '#f3e4e4',
      dangerBorder: '#c49a9a',
    },
  },
};

export const THEME_ORDER: ThemeName[] = ['dark', 'light', 'monoDark', 'monoLight'];

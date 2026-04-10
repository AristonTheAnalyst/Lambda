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

export type ThemeName = 'dark' | 'light';

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
      bg:           '#f2f2f2',
      surface:      '#ffffff',
      surfaceHigh:  '#e8e8e8',
      border:       '#dcdcdc',
      primary:      '#1a1a1a',
      muted:        '#6b6b6b',
      accent:       '#eb912b',
      accentBg:     '#fef3e2',
      accentText:   '#fff',
      danger:       '#c0392b',
      dangerBg:     '#fde8e8',
      dangerBorder: '#e8a0a0',
    },
  },
};

export const THEME_ORDER: ThemeName[] = ['dark', 'light'];

// Mutable singleton — mutated in-place by ThemeContext when the user switches themes.
// All components import this object by reference, so they pick up new values on re-render.
const T = {
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

  fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, xxl: 24 },
  space:    { xs: 4,  sm: 8,  md: 12, lg: 16, xl: 24, xxl: 32 },
  radius:   { sm: 4,  md: 8,  lg: 12 },
};

export default T;

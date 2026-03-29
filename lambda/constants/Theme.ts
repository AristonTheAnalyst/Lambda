const Theme = {
  bg: '#262626',        // main background
  surface: '#2e2e2e',   // cards, inputs, modals (slightly elevated)
  surfaceHigh: '#363636', // selected rows, hover states
  border: '#383838',    // dividers, input borders
  primary: '#ddbb98',   // body text, labels, icons
  muted: '#9e8470',     // placeholder text, secondary labels
  accent: '#cb7513',    // buttons, active states, tints
  accentBg: '#3a2810',  // accent-tinted row highlight
  accentText: '#fff',   // text on accent-coloured buttons
  danger: '#c0392b',    // errors, destructive actions
  dangerBg: '#3a1a1a',  // danger-tinted backgrounds
  dangerBorder: '#7a2020',

  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },

  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  radius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
} as const;

export default Theme;

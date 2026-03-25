const Theme = {
  bg: '#262626',        // main background
  surface: '#2e2e2e',   // cards, inputs, modals (slightly elevated)
  surfaceHigh: '#363636', // selected rows, hover states
  border: '#383838',    // dividers, input borders
  primary: '#ad9073',   // body text, labels, icons
  muted: '#7a6555',     // placeholder text, secondary labels
  accent: '#bb7423',    // buttons, active states, tints
  accentBg: '#3a2810',  // accent-tinted row highlight
  accentText: '#fff',   // text on accent-coloured buttons
  danger: '#c0392b',    // errors, destructive actions
  dangerBg: '#3a1a1a',  // danger-tinted backgrounds
  dangerBorder: '#7a2020',
} as const;

export default Theme;

/**
 * Static layout tokens (not tied to light/dark). Semantic colors live in
 * `constants/themes.ts` and are exposed at runtime via `useAppTheme().colors`.
 */
export const themeLayout = {
  fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, xxl: 24 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 4, md: 8, lg: 12 },
} as const;

export default themeLayout;

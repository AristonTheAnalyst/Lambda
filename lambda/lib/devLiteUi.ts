/**
 * Dev-only lighter UI: fewer Reanimated springs / Tamagui motion for smoother Metro dev.
 *
 * Enable: set `EXPO_PUBLIC_DEV_LITE_UI=1` before `npx expo start` (PowerShell:
 * `$env:EXPO_PUBLIC_DEV_LITE_UI='1'; npx expo start`). Omit or set to `0` for full animations.
 *
 * Preview/production bundles never set this; `__DEV__` is false there.
 */
export const DEV_LITE_UI = __DEV__ === true && process.env.EXPO_PUBLIC_DEV_LITE_UI === '1';

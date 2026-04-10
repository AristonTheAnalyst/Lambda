import { useEffect } from 'react';
import { Platform, StatusBar as RNStatusBar } from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { setBackgroundColorAsync } from 'expo-system-ui';
import type { ThemeName } from '@/constants/themes';

/**
 * Syncs system status bar with Lambda’s in-app theme (not device useColorScheme).
 *
 * - **expo-status-bar** is the primary API (`setStatusBarStyle` + `<StatusBar />`).
 * - **iOS:** bar is transparent; only icon/text style changes (`light` vs `dark`).
 *   Paint the top safe-area band with `backgroundColor` in the root layout.
 * - **Android:** bar `backgroundColor` via RN helpers.
 * - **RN `setBarStyle`:** extra nudge so RCT updates icon contrast under expo-router / dev client.
 */
export function useStatusBarForAppTheme(themeName: ThemeName, backgroundColor: string) {
  const isDark = themeName === 'dark';

  useEffect(() => {
    const expoStyle = isDark ? 'light' : 'dark';
    setStatusBarStyle(expoStyle);

    const rnStyle = isDark ? 'light-content' : 'dark-content';
    RNStatusBar.setBarStyle(rnStyle, true);
    requestAnimationFrame(() => RNStatusBar.setBarStyle(rnStyle, true));

    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor(backgroundColor);
    }

    setBackgroundColorAsync(backgroundColor).catch(() => {});
  }, [themeName, isDark, backgroundColor]);
}

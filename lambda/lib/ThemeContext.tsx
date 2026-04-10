import { useSyncExternalStore, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themeLayout } from '@/constants/Theme';
import { THEME_PRESETS, THEME_ORDER, type ThemeName, type ThemeColors } from '@/constants/themes';

const STORAGE_KEY = 'lambda_theme';

// ── Tiny pub/sub store ────────────────────────────────────────────────────────
// Single source of truth is THEME_PRESETS + current name. Subscribers re-render
// on change; use useAppTheme().colors — no mutable global color singleton.

let _current: ThemeName = 'dark';
const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach((l) => l());
}
function _subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}
function _snapshot() {
  return _current;
}

export function setTheme(name: ThemeName) {
  _current = name;
  AsyncStorage.setItem(STORAGE_KEY, name);
  _notify();
}

export type { ThemeName, ThemeColors };

/** Subscribe to theme changes; returns stable preset colors + layout tokens. */
export function useAppTheme() {
  const themeName = useSyncExternalStore(_subscribe, _snapshot);
  const colors = THEME_PRESETS[themeName].colors;
  return {
    themeName,
    colors,
    setTheme,
    fontSize: themeLayout.fontSize,
    space: themeLayout.space,
    radius: themeLayout.radius,
  };
}

/** @deprecated Prefer `useAppTheme` — same behavior. */
export const useTheme = useAppTheme;

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && saved in THEME_PRESETS) setTheme(saved as ThemeName);
    });
  }, []);

  return <>{children}</>;
}

export { THEME_PRESETS, THEME_ORDER };

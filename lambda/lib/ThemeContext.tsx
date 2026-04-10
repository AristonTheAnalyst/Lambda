import { useSyncExternalStore, useEffect, ReactNode } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import T from '@/constants/Theme';
import { THEME_PRESETS, THEME_ORDER, type ThemeName } from '@/constants/themes';

const STORAGE_KEY = 'lambda_theme';

// ── Tiny pub/sub store ────────────────────────────────────────────────────────
// Mutates T in-place and notifies all subscribers so they re-render.
// No React tree remount — navigation state is fully preserved.

let _current: ThemeName = 'dark';
const _listeners = new Set<() => void>();

function _notify() { _listeners.forEach((l) => l()); }
function _subscribe(cb: () => void) { _listeners.add(cb); return () => _listeners.delete(cb); }
function _snapshot() { return _current; }

export function setTheme(name: ThemeName) {
  _current = name;
  Object.assign(T, THEME_PRESETS[name].colors);
  AsyncStorage.setItem(STORAGE_KEY, name);
  _notify();
}

/** Subscribe to theme changes. Any component calling this hook re-renders on theme switch. */
export function useTheme() {
  const themeName = useSyncExternalStore(_subscribe, _snapshot);
  return { themeName, setTheme };
}

// ── Provider — just loads persisted theme on mount ────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && saved in THEME_PRESETS) setTheme(saved as ThemeName);
    });
  }, []);

  return <>{children}</>;
}

export { THEME_PRESETS, THEME_ORDER };

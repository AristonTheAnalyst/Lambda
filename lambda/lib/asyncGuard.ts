import { useCallback, useRef } from 'react';

/**
 * Per-component async guard — prevents concurrent execution of guarded handlers
 * within the same component. Call once per component; returns a stable guard function.
 *
 * Use on API calls, form submissions, and auth actions.
 * Do NOT use on navigation or other instant UI interactions.
 */
export function useAsyncGuard() {
  const busy = useRef(false);
  return useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (busy.current) return undefined;
    busy.current = true;
    try { return await fn(); } finally { busy.current = false; }
  }, []);
}

/**
 * Module-level navigation guard — blocks duplicate navigation calls for 500ms
 * (the duration of a screen transition). Use this to wrap router.push/replace
 * calls so that rapid taps don't trigger multiple navigations.
 */
let _navBusy = false;
export function navGuard(fn: () => void): void {
  if (_navBusy) return;
  _navBusy = true;
  fn();
  setTimeout(() => { _navBusy = false; }, 500);
}

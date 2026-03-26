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

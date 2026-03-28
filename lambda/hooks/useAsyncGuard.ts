import { useCallback, useRef } from 'react';

/**
 * Per-component async guard.
 * Prevents concurrent execution of the same async handler within a component.
 *
 * Use for: API calls, form submissions, auth actions, create/update/delete mutations.
 * Do NOT use for: navigation, UI state toggles, or anything synchronous.
 *
 * @example
 * const guard = useAsyncGuard();
 * function handleSave() { return guard(async () => { await supabase... }); }
 */
export function useAsyncGuard() {
  const busy = useRef(false);
  return useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (busy.current) return undefined;
    busy.current = true;
    try { return await fn(); } finally { busy.current = false; }
  }, []);
}

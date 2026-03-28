import { useCallback, useRef } from 'react';

/**
 * UI guard for modal and sheet open buttons.
 * Prevents re-triggering for `duration` ms after the first press to avoid
 * rapid double-taps opening overlapping modals or competing sheet animations.
 *
 * Default duration matches a typical sheet slide-up animation (400ms).
 *
 * Use for: buttons that open modals, sheets, or drawers with animations.
 * Do NOT use for: async API calls (use useAsyncGuard) or navigation (use navGuard).
 *
 * @example
 * const openModal = useUIGuard();
 * <Button onPress={() => openModal(() => setVisible(true))} />
 */
export function useUIGuard(duration = 200) {
  const busy = useRef(false);
  return useCallback((fn: () => void): void => {
    if (busy.current) return;
    busy.current = true;
    fn();
    setTimeout(() => { busy.current = false; }, duration);
  }, [duration]);
}

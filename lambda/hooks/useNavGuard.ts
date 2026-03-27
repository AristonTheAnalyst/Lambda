/**
 * Module-level navigation guard.
 * Blocks duplicate router.push / router.replace calls for `duration` ms after
 * the first call — covers the full screen transition animation (~500ms).
 *
 * Module-level (not per-component) because navigation is global app state:
 * a screen transition triggered from one component should block triggers from
 * any other component until the transition completes.
 *
 * Use for: router.push, router.replace on any user-initiated navigation.
 * Do NOT use for: router.back (back navigation is idempotent and instant).
 *
 * @example
 * import { navGuard } from '@/hooks/useNavGuard';
 * onPress={() => navGuard(() => router.push('/some/route'))}
 */
let _navBusy = false;

export function navGuard(fn: () => void, duration = 500): void {
  if (_navBusy) return;
  _navBusy = true;
  fn();
  setTimeout(() => { _navBusy = false; }, duration);
}

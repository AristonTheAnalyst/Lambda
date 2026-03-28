export function useUIGuard() {
  return (fn: () => void) => fn();
}

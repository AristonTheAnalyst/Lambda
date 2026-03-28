import { useCallback } from 'react';

export function useAsyncGuard() {
  return useCallback(<T>(fn: () => Promise<T>): Promise<T> => fn(), []);
}

let busy = false;

/**
 * Global async guard — prevents concurrent execution of any guarded handler.
 * If a guarded function is already running, subsequent calls are silently ignored.
 */
export async function withGuard<T>(fn: () => Promise<T>): Promise<T | undefined> {
  if (busy) return undefined;
  busy = true;
  try {
    return await fn();
  } finally {
    busy = false;
  }
}

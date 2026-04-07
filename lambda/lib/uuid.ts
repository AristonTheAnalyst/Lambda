/**
 * Pure-JS UUID v4 — works in Expo Go, Hermes, and dev builds.
 * Not cryptographically secure, but sufficient for local entity IDs.
 */
export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

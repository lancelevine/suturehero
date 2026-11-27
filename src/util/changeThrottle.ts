/**
 * Decides when to resend a status: at once when its key changes, otherwise at most once per
 * `repeatMs` (moved out of src/tracking.ts, 2026-11-27, for the embedded tracking status message).
 */
export function changeThrottle(repeatMs: number) {
  let lastKey: string | null = null;
  let lastAt = -Infinity;
  return (key: string, now: number) => {
    if (key === lastKey && now - lastAt <= repeatMs) return false;
    lastKey = key;
    lastAt = now;
    return true;
  };
}

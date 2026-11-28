/**
 * Personal bests for the timed challenges (roadmap "Timed challenges", 2026-11-28): the fastest
 * time each challenge was completed in this browser (suturehero.personalBests.v1).
 */
export const BEST_STORAGE_KEY = 'suturehero.personalBests.v1';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadBests(storage: StorageLike | null): Record<string, number> {
  try {
    const saved = JSON.parse(storage?.getItem(BEST_STORAGE_KEY) ?? '{}');
    return saved && typeof saved === 'object' ? (saved as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** Record a completion; returns true when it is a new best. */
export function recordBest(storage: StorageLike | null, challenge: string, seconds: number) {
  const bests = loadBests(storage);
  if (bests[challenge] !== undefined && bests[challenge] <= seconds) return false;
  bests[challenge] = seconds;
  try {
    storage?.setItem(BEST_STORAGE_KEY, JSON.stringify(bests));
  } catch {
    // Blocked storage: the best lasts until reload.
  }
  return true;
}

/**
 * 5-minute warm-up drill and daily log (roadmap, 2026-11-27): one entry per finished warm-up,
 * kept in browser storage, with a streak of consecutive days. Practice log only.
 */
export const WARMUP_SECONDS = 5 * 60;
export const WARMUP_STORAGE_KEY = 'suturehero.warmupLog.v1';
/** Entries kept (about three months of daily warm-ups). */
export const WARMUP_LOG_LIMIT = 100;

export interface WarmupEntry {
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
  passes: number;
  meanBiteMm: number | null;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Local calendar day of `date` as YYYY-MM-DD. */
export function localDay(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function loadWarmups(storage: StorageLike | null): WarmupEntry[] {
  try {
    const saved = JSON.parse(storage?.getItem(WARMUP_STORAGE_KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter((e) => e && typeof e.day === 'string' && Number.isFinite(e.passes)) : [];
  } catch {
    return [];
  }
}

export function saveWarmup(storage: StorageLike | null, entry: WarmupEntry) {
  const log = [...loadWarmups(storage), entry].slice(-WARMUP_LOG_LIMIT);
  try {
    storage?.setItem(WARMUP_STORAGE_KEY, JSON.stringify(log));
  } catch {
    // Blocked storage: the warm-up still ran; it is just not logged.
  }
  return log;
}

/** Consecutive days with a warm-up, ending today (or yesterday, so the streak survives until today's warm-up). */
export function warmupStreak(log: readonly WarmupEntry[], today: Date) {
  const days = new Set(log.map((e) => e.day));
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDay(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** One line for the Sandbox panel. */
export function describeWarmups(log: readonly WarmupEntry[], today: Date) {
  const doneToday = log.some((e) => e.day === localDay(today));
  const streak = warmupStreak(log, today);
  const last = log.at(-1);
  const lastText = last ? ` · last: ${last.passes} pass${last.passes === 1 ? '' : 'es'}${last.meanBiteMm === null ? '' : `, mean bite ${last.meanBiteMm.toFixed(1)} mm`}` : '';
  return `Warm-up ${doneToday ? 'done today' : 'not done today'} · ${streak}-day streak${lastText}`;
}

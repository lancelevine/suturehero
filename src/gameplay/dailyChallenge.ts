import { BODY_SITES } from '../environments/bodySites';

/** Daily challenge (roadmap). Everyone gets the same wound on the same day: the body site and the
 * stitch count come from the date (UTC), so no server is needed. Best times are kept per browser
 * only; a shared leaderboard would need a server. */
export const DAILY_STORAGE_KEY = 'suturehero.dailyChallenge.v1';
export const MIN_STITCHES = 3;
export const MAX_STITCHES = 6;

export interface DailyChallenge { day: string; siteId: string; siteLabel: string; stitches: number }

/** Small deterministic hash of the day string (FNV-1a). */
function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}

export function utcDay(date: Date) { return date.toISOString().slice(0, 10); }

export function dailyChallenge(day: string): DailyChallenge {
  const h = hash(day);
  const site = BODY_SITES[h % BODY_SITES.length];
  const stitches = MIN_STITCHES + (Math.floor(h / BODY_SITES.length) % (MAX_STITCHES - MIN_STITCHES + 1));
  return { day, siteId: site.id, siteLabel: site.label, stitches };
}

export function challengeUrl(challenge: DailyChallenge, base: string) {
  const url = new URL(base);
  url.searchParams.set('site', challenge.siteId);
  url.searchParams.set('exercise', 'daily');
  url.searchParams.set('day', challenge.day);
  return url.toString();
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
export function loadBest(storage: Storage | null, day: string): number | null {
  try {
    const all = JSON.parse(storage?.getItem(DAILY_STORAGE_KEY) ?? '{}') as Record<string, number>;
    return typeof all[day] === 'number' ? all[day] : null;
  } catch { return null; }
}
export function saveBest(storage: Storage | null, day: string, seconds: number) {
  try {
    const all = JSON.parse(storage?.getItem(DAILY_STORAGE_KEY) ?? '{}') as Record<string, number>;
    if (typeof all[day] === 'number' && all[day] <= seconds) return false;
    all[day] = seconds;
    storage?.setItem(DAILY_STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch { return false; }
}

export function describeDaily(challenge: DailyChallenge, tied: number, best: number | null, finishedSeconds: number | null) {
  const head = `Daily challenge ${challenge.day} · ${challenge.siteLabel} · tie ${challenge.stitches} stitches (${Math.min(tied, challenge.stitches)}/${challenge.stitches})`;
  const done = finishedSeconds !== null ? ` · done in ${finishedSeconds.toFixed(0)} s` : '';
  return head + done + (best !== null ? ` · your best today ${best.toFixed(0)} s` : '');
}

/** Instrument tie speed drill (roadmap). Times each knot from the start of tying until it is
 * locked and seated, and keeps the best time per browser. Square and flat come from the knot review. */
export const KNOT_TIMES_KEY = 'suturehero.knotTimes.v1';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

export class KnotTimer {
  startedAt: number | null = null;
  lastSeconds: number | null = null;
  private wasActive = false;
  /** Call every frame with the session clock; returns the time on the frame a knot is finished. */
  update(now: number, active: boolean, finished: boolean): number | null {
    if (active && !this.wasActive) { this.startedAt = now; this.lastSeconds = null; }
    this.wasActive = active;
    if (active && finished && this.startedAt !== null && this.lastSeconds === null) {
      this.lastSeconds = now - this.startedAt;
      return this.lastSeconds;
    }
    return null;
  }
}

export function loadBestKnot(storage: Storage | null): number | null {
  try { const v = Number(storage?.getItem(KNOT_TIMES_KEY)); return Number.isFinite(v) && v > 0 ? v : null; } catch { return null; }
}
export function saveBestKnot(storage: Storage | null, seconds: number) {
  try {
    const best = loadBestKnot(storage);
    if (best !== null && best <= seconds) return false;
    storage?.setItem(KNOT_TIMES_KEY, String(seconds));
    return true;
  } catch { return false; }
}

export function describeKnotTime(timer: KnotTimer, now: number, best: number | null, square: boolean, flat: boolean) {
  if (timer.startedAt === null) return '';
  if (timer.lastSeconds === null) return `Knot timer ${(now - timer.startedAt).toFixed(0)} s`;
  const quality = [square ? 'square' : 'not square', flat ? 'lies flat' : 'not seated flat'].join(', ');
  return `Knot tied in ${timer.lastSeconds.toFixed(1)} s (${quality})${best !== null ? ` · best ${best.toFixed(1)} s` : ''}`;
}

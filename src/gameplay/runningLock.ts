/** Locked running (blanket) stitch (roadmap: "Running locked stitch"). After each running bite
 * the needle is passed through the loop of thread left at the previous exit before the next bite,
 * which locks that stitch. The thread model has no loop topology yet, so the lock is detected
 * geometrically: with the needle out of the tissue and the thread still through the newest pass, the needle tip drops through a small zone just above the newest exit (where the loop
 * lies). Approximate; the thread is not drawn passing through the loop. */

/** Horizontal radius of the lock zone around the newest exit (scene units, about 4 mm). */
export const LOCK_RADIUS = 0.15;
/** The tip must come down from at least this high above the exit (scene units) ... */
export const LOCK_ENTER_HEIGHT = 0.12;
/** ... to below this height above it (it passes under the loop lying on the skin). */
export const LOCK_EXIT_HEIGHT = 0.04;

type Point = { x: number; y: number; z: number };

export class RunningLockTracker {
  /** Pass orders (FreePassRecord.order) of passes whose stitch was locked. */
  readonly locked = new Set<number>();
  private armedFor: number | null = null;

  /**
   * Call every frame. `newest` is the most recent completed pass (order and exit), `threaded`
   * the number of passes the running thread goes through, `tip` the needle tip, `inTissue`
   * whether a pass is in progress.
   */
  update(newest: { order: number; exit: Point } | null, threaded: number, tip: Point, inTissue: boolean) {
    if (!newest || threaded < 1 || inTissue || this.locked.has(newest.order)) {
      this.armedFor = null;
      return false;
    }
    const near = Math.hypot(tip.x - newest.exit.x, tip.z - newest.exit.z) <= LOCK_RADIUS;
    const height = tip.y - newest.exit.y;
    if (!near) {
      this.armedFor = null;
      return false;
    }
    if (height >= LOCK_ENTER_HEIGHT) this.armedFor = newest.order;
    else if (height <= LOCK_EXIT_HEIGHT && this.armedFor === newest.order) {
      this.locked.add(newest.order);
      this.armedFor = null;
      return true;
    }
    return false;
  }

  /** Forget locks on passes that no longer exist (undo). */
  keepOnly(orders: Iterable<number>) {
    const keep = new Set(orders);
    for (const order of [...this.locked]) if (!keep.has(order)) this.locked.delete(order);
  }

  reset() { this.locked.clear(); this.armedFor = null; }
}

/** Loop slack at or below this (mm) when locked counts as a strangling (too tight) lock. */
export const STRANGLE_SLACK_MM = 0.2;
/** Locks whose loop slack differs from the median by more than this (mm) are uneven. */
export const UNEVEN_LOCK_MM = 1;

/**
 * Summary line for a running line. `loops` are the gaps between consecutive running passes
 * (oldest first): whether the stitch at its start was locked, and the loop's current slack (mm).
 */
export function describeLocks(loops: ReadonlyArray<{ locked: boolean; slackMm: number }>) {
  if (!loops.length) return '';
  const locked = loops.filter((l) => l.locked);
  if (!locked.length) return `Running stitch: 0/${loops.length} stitches locked (pass the needle through the last loop before each bite for a locked running stitch)`;
  const slacks = locked.map((l) => l.slackMm).sort((a, b) => a - b);
  const median = slacks[Math.floor(slacks.length / 2)];
  const strangling = locked.filter((l) => l.slackMm <= STRANGLE_SLACK_MM).length;
  const uneven = locked.filter((l) => Math.abs(l.slackMm - median) > UNEVEN_LOCK_MM).length;
  const notes = [`Locked running: ${locked.length}/${loops.length} stitches locked`];
  if (locked.length < loops.length) notes.push(`${loops.length - locked.length} not locked`);
  notes.push(uneven ? `${uneven} lock${uneven === 1 ? '' : 's'} uneven in tension` : 'even lock tension');
  if (strangling) notes.push(`${strangling} lock${strangling === 1 ? '' : 's'} pulled tight enough to strangle the edge · keep a little give`);
  return notes.join(' · ');
}

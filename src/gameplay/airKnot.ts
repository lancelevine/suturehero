/**
 * Air knot detection (roadmap, 2026-11-27): a first throw that is not snugged down onto the tissue
 * before the next throw leaves a loose loop under the knot. Watches the active knot engine through
 * the shared `KnotEngine` interface (throw count and seated throws), so every engine is covered.
 * Sliding knots are excluded: their first throws are meant to slide down later.
 */
export const AIR_KNOT_WARNING = 'Air knot: the first throw was not snugged onto the tissue before the next · seat each throw down';

export class AirKnotWatcher {
  /** Air knots seen in this knot (resets with the knot). */
  flagged = false;
  private throws = 0;

  update(throwCount: number, seatedThrows: number, sliding: boolean) {
    if (throwCount < this.throws) this.reset();
    if (throwCount >= 2 && this.throws < 2 && seatedThrows === 0 && !sliding) this.flagged = true;
    this.throws = throwCount;
  }

  reset() {
    this.flagged = false;
    this.throws = 0;
  }
}

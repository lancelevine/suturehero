/**
 * Needle pickup and transfer (roadmap, 2026-11-27): from the needle grasp's holder each frame,
 * time how long it takes from the forceps picking the needle up to the driver holding it, and
 * count drops (let go outside the tissue with nothing else holding it) and re-grabs.
 * Times are seconds; approximate practice measures.
 */
export type Holder = 'forceps' | 'needle-driver' | null;

export class NeedleHandlingCheck {
  drops = 0;
  regrabs = 0;
  /** Seconds from each forceps pickup to the driver holding the needle. */
  readonly loads: number[] = [];
  private last: Holder = null;
  private pickedUpAt: number | null = null;
  private dropped = false;

  update(holder: Holder, needleInTissue: boolean, seconds: number) {
    if (holder === this.last) return;
    if (this.last !== null && holder === null && !needleInTissue) {
      this.drops++;
      this.dropped = true;
    }
    if (holder !== null && this.last === null && this.dropped) {
      this.regrabs++;
      this.dropped = false;
    }
    if (holder === 'forceps' && this.pickedUpAt === null) this.pickedUpAt = seconds;
    if (holder === 'needle-driver' && this.pickedUpAt !== null) {
      this.loads.push(seconds - this.pickedUpAt);
      this.pickedUpAt = null;
    }
    this.last = holder;
  }

  reset() {
    this.drops = 0;
    this.regrabs = 0;
    this.loads.length = 0;
    this.last = null;
    this.pickedUpAt = null;
    this.dropped = false;
  }
}

/** "Rotate, don't push" (roadmap). While the needle is in tissue, time spent following the
 * needle's curve (rotating the wrist) versus forcing it off the curve (pushing straight), which
 * widens the puncture. Uses the free pass's forcing warning, so it is approximate. */
export class RotationScore {
  inTissueSeconds = 0;
  pushingSeconds = 0;
  update(inTissue: boolean, forcing: boolean, dt: number) {
    if (!inTissue || dt <= 0) return;
    this.inTissueSeconds += dt;
    if (forcing) this.pushingSeconds += dt;
  }
  /** Share of in-tissue time spent rotating along the curve (null before any time in tissue). */
  get rotatingShare(): number | null {
    return this.inTissueSeconds > 0 ? 1 - this.pushingSeconds / this.inTissueSeconds : null;
  }
  reset() { this.inTissueSeconds = 0; this.pushingSeconds = 0; }
}

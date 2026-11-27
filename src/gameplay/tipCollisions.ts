/**
 * Instrument tip collisions (roadmap, 2026-11-27): counts the needle-driver and forceps tips
 * bumping into each other. A contact starts when the tips come within CONTACT_MM and ends once
 * they are RELEASE_MM apart, so one bump counts once. Contacts while the needle is being handed
 * between the instruments are deliberate and not counted. Approximate scene millimetres.
 */
export const CONTACT_MM = 3;
export const RELEASE_MM = 5;

export class TipCollisionCounter {
  count = 0;
  private touching = false;

  /** `tipDistanceMm` between the two tips this frame; `handoff` when the needle is between them. */
  update(tipDistanceMm: number, handoff: boolean) {
    if (this.touching) {
      if (tipDistanceMm > RELEASE_MM) this.touching = false;
      return;
    }
    if (tipDistanceMm < CONTACT_MM) {
      this.touching = true;
      if (!handoff) this.count++;
    }
  }

  reset() {
    this.count = 0;
    this.touching = false;
  }
}

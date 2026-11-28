/** Sterile field score (roadmap). Counts each time an instrument tip touches down outside the
 * sterile field: the table beyond the practice pad. The instruments cannot go below their floor
 * height, so a tip at that floor outside the pad's footprint is resting on the table. Approximate. */

/** Practice pad footprint (scene units): two halves 2.62 wide centred at ±1.36, 3.35 deep. */
export const FIELD_HALF_X = 2.67;
export const FIELD_HALF_Z = 1.675;
/** A tip within this height of its floor counts as touching the table (scene units). */
export const TOUCH_HEIGHT = 0.03;

export class SterileFieldCheck {
  touches = 0;
  private down = new Map<string, boolean>();

  update(id: string, tip: { x: number; y: number; z: number }, floor: number) {
    const outside = Math.abs(tip.x) > FIELD_HALF_X || Math.abs(tip.z) > FIELD_HALF_Z;
    const touching = outside && tip.y <= floor + TOUCH_HEIGHT;
    if (touching && !this.down.get(id)) this.touches++;
    this.down.set(id, touching);
  }

  reset() { this.touches = 0; this.down.clear(); }
}

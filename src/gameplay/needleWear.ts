/** Needle dulling (roadmap: "Needle dulling"). Each pass through skin wears the point a little,
 * a cutting point faster than a taper. A dull needle needs more force to pass, so it tolerates
 * less forcing off its curve before the bite tears out. Practice model; the rates are not measured. */
export type NeedleTip = 'cutting' | 'taper';

/** Extra force per pass (fraction), by point type. */
export const WEAR_PER_PASS: Record<NeedleTip, number> = { cutting: 0.04, taper: 0.025 };
/** Suggest a fresh needle once the extra force reaches this fraction. */
export const FRESH_NEEDLE_AT = 0.3;
/** Extra force is capped here (a very dull needle). */
export const MAX_EXTRA_FORCE = 0.6;

export class NeedleWear {
  passes = 0;
  constructor(public tip: NeedleTip = 'cutting') {}
  addPass() { this.passes++; }
  fresh() { this.passes = 0; }
  /** Extra force needed compared with a new needle (0 = new). */
  get extraForce() { return Math.min(MAX_EXTRA_FORCE, this.passes * WEAR_PER_PASS[this.tip]); }
  /** Multiplier on the tear limits: a dull needle tears out with less forcing. */
  get tearFactor() { return 1 / (1 + this.extraForce); }
  get dull() { return this.extraForce >= FRESH_NEEDLE_AT; }
  describe() {
    if (!this.passes) return '';
    const percent = Math.round(this.extraForce * 100);
    return this.dull ? `Needle dull · needs ~${percent}% more force · use Fresh needle` : `Needle wear: ${this.passes} pass${this.passes === 1 ? '' : 'es'} · ~${percent}% more force`;
  }
}

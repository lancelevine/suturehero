/** Complication event: a broken needle (roadmap: "Complication events mid-closure"). Holding the
 * needle forced off its curve for long enough during one pass snaps it. Only with Complications on.
 * Practice model; the time limit is illustrative. */
export const BREAK_FORCING_SECONDS = 2;
/** Forcing counts toward a break above this share of the skin's tear limits (below a tear, above normal handling). */
export const BREAK_FORCING_SHARE = 0.85;

export function breakingForce(forcing: { degrees: number; units: number }, limits: { degrees: number; units: number }) {
  return forcing.degrees > limits.degrees * BREAK_FORCING_SHARE || forcing.units > limits.units * BREAK_FORCING_SHARE;
}
export const BREAK_MESSAGE = 'Needle broke from sustained forcing · press Reset needle for a new one, and follow the curve next time';

export class NeedleBreakCheck {
  forcingSeconds = 0;
  breaks = 0;
  /** Call every frame; returns true on the frame the needle breaks. */
  update(inTissue: boolean, forcing: boolean, dt: number) {
    if (!inTissue) { this.forcingSeconds = 0; return false; }
    this.forcingSeconds = forcing ? this.forcingSeconds + dt : Math.max(0, this.forcingSeconds - dt);
    if (this.forcingSeconds < BREAK_FORCING_SECONDS) return false;
    this.forcingSeconds = 0;
    this.breaks++;
    return true;
  }
  reset() { this.forcingSeconds = 0; this.breaks = 0; }
}

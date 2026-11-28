import { classifyVesselGrasp, type VesselShape } from './vesselGrasp';

/** Stray needle touches (roadmap). Counts each time the needle tip touches the vessel wall (or
 * enters the lumen) while no bite is in progress: scratched intima is a clot risk. Uses the same
 * radial test as the vessel grasp check; approximate, from the tip point only. */
/** A contact counts only if no bite starts within this time (s): the start of a real bite touches the wall first. */
export const CONFIRM_SECONDS = 0.5;

export class StrayTouchCheck {
  touches = 0;
  readonly points: Array<{ x: number; y: number; z: number }> = [];
  private touching = false;
  private pending: { at: { x: number; y: number; z: number }; age: number } | null = null;

  update(tip: { x: number; y: number; z: number }, biting: boolean, vessel: VesselShape, dt = 1 / 60) {
    if (biting) { this.pending = null; this.touching = false; return; }
    const kind = classifyVesselGrasp(tip, vessel);
    const onVessel = (kind === 'full-wall' || kind === 'counterpressure') && Math.abs(tip.x) <= (vessel.length ?? Infinity) / 2;
    if (onVessel && !this.touching) this.pending = { at: { ...tip }, age: 0 };
    this.touching = onVessel;
    if (!this.pending) return;
    this.pending.age += dt;
    if (this.pending.age >= CONFIRM_SECONDS) {
      this.touches++;
      this.points.push(this.pending.at);
      this.pending = null;
    }
  }

  reset() { this.touches = 0; this.points.length = 0; this.touching = false; this.pending = null; }
}

export function describeStrayTouches(check: StrayTouchCheck) {
  return check.touches ? `${check.touches} stray needle touch${check.touches === 1 ? '' : 'es'} on the vessel wall outside a bite (scratched intima risks clot)` : '';
}

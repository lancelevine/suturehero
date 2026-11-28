/** Classifies a forceps grab on the microsurgery vessel by where the closed jaw sits
 * relative to the wall: adventitia (outside the outer surface), counterpressure
 * (inside the lumen) or a full-wall pinch (within the wall), which crushes the intima.
 * Approximate: uses the jaw point only, not the jaw width. */
export type VesselGraspKind = 'adventitia' | 'counterpressure' | 'full-wall' | 'miss';

export interface VesselShape { centerY: number; innerRadius: number; outerRadius: number; length?: number }

/** Jaw points further than this outside the outer wall (scene units) are not on the vessel. */
export const ADVENTITIA_REACH = 0.08;
/** Forceps count as closed below this openness (same as the skin grasp). */
export const CLOSED_OPENNESS = 0.2;

export function classifyVesselGrasp(jaw: { y: number; z: number }, vessel: VesselShape): VesselGraspKind {
  const radial = Math.hypot(jaw.y - vessel.centerY, jaw.z);
  if (radial < vessel.innerRadius) return 'counterpressure';
  if (radial <= vessel.outerRadius) return 'full-wall';
  if (radial <= vessel.outerRadius + ADVENTITIA_REACH) return 'adventitia';
  return 'miss';
}

export class VesselGraspCheck {
  grabs = 0;
  pinches = 0;
  last: VesselGraspKind | null = null;
  private wasClosed = false;
  /** Call every frame; counts a grab when the forceps close on the vessel. */
  update(jaw: { y: number; z: number }, openness: number, vessel: VesselShape): VesselGraspKind | null {
    const closed = openness <= CLOSED_OPENNESS;
    const justClosed = closed && !this.wasClosed;
    this.wasClosed = closed;
    if (!justClosed) return null;
    const kind = classifyVesselGrasp(jaw, vessel);
    if (kind === 'miss') return null;
    this.grabs++;
    if (kind === 'full-wall') this.pinches++;
    this.last = kind;
    return kind;
  }
  reset() { this.grabs = 0; this.pinches = 0; this.last = null; this.wasClosed = false; }
}

export function describeVesselGrasp(check: VesselGraspCheck): string {
  if (!check.grabs) return '';
  const head = check.last === 'full-wall' ? 'Last grab pinched the full wall (crushes the intima) · hold adventitia or give counterpressure inside the lumen' : 'Grasp: ' + (check.last === 'adventitia' ? 'adventitia' : 'lumen counterpressure') + ' · good';
  return `${head} · ${check.pinches}/${check.grabs} grabs pinched the wall`;
}

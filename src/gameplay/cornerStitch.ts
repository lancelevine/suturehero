import { tractPoint, type FreeTract } from '../tissue/FreeNeedlePass';

/** Corner stitch (roadmap). A V-shaped flap on the right side has its tip at the wound edge; the
 * half-buried horizontal mattress enters and exits the skin on the far (left) side only and passes
 * through the flap tip within the dermis, so the tip sits flush without being strangled.
 * Approximate: graded from the needle's path; the flap is marked on the pad, not cut. */

/** Flap tip (scene units): at the right wound edge, mid-wound. */
export const FLAP_TIP = { x: 0.06, z: 0 };
/** The V opens away from the wound: its arms reach this far out (x) and apart (z). */
export const FLAP_LENGTH = 0.9;
export const FLAP_HALF_WIDTH = 0.45;
/** The path must pass within this distance of the tip (scene units, about 1.5 mm). */
export const TIP_REACH = 0.06;

type Point = { x: number; y: number; z: number };

/** Whether a surface point lies on the flap (inside the V). */
export function onFlap(p: { x: number; z: number }) {
  const along = p.x - FLAP_TIP.x;
  return along >= 0 && along <= FLAP_LENGTH && Math.abs(p.z - FLAP_TIP.z) <= (along / FLAP_LENGTH) * FLAP_HALF_WIDTH;
}

export interface CornerGrade { throughTip: boolean; tipDepth: number | null; flapPunctured: boolean; farSideOnly: boolean }

export function gradeCornerPass(tract: FreeTract, entry: Point, exit: Point, surfaceY: number, dermis: { top: number; bottom: number }, samples = 64): CornerGrade {
  const end = tract.exitAngle ?? 0;
  let best = Infinity, tipDepth: number | null = null;
  for (let i = 0; i <= samples; i++) {
    const p = tractPoint(tract, (end * i) / samples);
    const d = Math.hypot(p.x - FLAP_TIP.x, p.z - FLAP_TIP.z);
    if (d < best) { best = d; tipDepth = p.y; }
  }
  const inDermis = tipDepth !== null && tipDepth <= dermis.top && tipDepth >= dermis.bottom;
  return {
    throughTip: best <= TIP_REACH && inDermis,
    tipDepth: tipDepth === null ? null : surfaceY - tipDepth,
    flapPunctured: onFlap(entry) || onFlap(exit),
    farSideOnly: entry.x < 0 && exit.x < 0,
  };
}

export function describeCornerPass(grade: CornerGrade) {
  if (grade.throughTip && grade.farSideOnly && !grade.flapPunctured) return 'Corner stitch: through the flap tip in the dermis, skin entered on the far side only · good (the tip sits flush)';
  const fixes: string[] = [];
  if (!grade.farSideOnly) fixes.push('enter and exit the skin on the far (left) side only');
  if (grade.flapPunctured) fixes.push('do not puncture the flap skin');
  if (!grade.throughTip) fixes.push('pass horizontally through the flap tip at dermal depth');
  return `Corner stitch: ${fixes.join(' · ')}`;
}

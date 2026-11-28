import { tractPoint, type FreeTract } from '../tissue/FreeNeedlePass';

/** Edges of different thickness (roadmap). In this exercise the left wound edge is thinner: its
 * skin surface sits THIN_SIDE_DROP lower than the right. Taking the bite deeper on the thin side by
 * about the same amount lifts it level when tied; the predicted step-off is the drop minus that extra
 * depth. Approximate: bite depth per side from the needle's path, no tissue simulation of the lift. */

/** How much lower the thin (left, x < 0) side's surface is (scene units, about 1 mm). */
export const THIN_SIDE_DROP = 0.04;
/** Path samples along a pass. */
const SAMPLES = 48;

/** Deepest point of the pass below `surfaceY(x)` on each side of the wound (scene units). */
export function sideDepths(tract: FreeTract, surfaceY: (x: number) => number) {
  const end = tract.exitAngle ?? 0;
  let left = 0, right = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const p = tractPoint(tract, (end * i) / SAMPLES);
    const depth = surfaceY(p.x) - p.y;
    if (p.x < 0) left = Math.max(left, depth); else right = Math.max(right, depth);
  }
  return { thin: left, thick: right };
}

/** Predicted step-off after tying (scene units, positive = thin side still low). */
export function predictedStepOff(depths: { thin: number; thick: number }, drop = THIN_SIDE_DROP) {
  return drop - (depths.thin - depths.thick);
}

export function describeThicknessPass(depths: { thin: number; thick: number }, mmPerUnit: number, levelMm = 0.5) {
  const extraMm = (depths.thin - depths.thick) * mmPerUnit;
  const stepMm = predictedStepOff(depths) * mmPerUnit;
  const advice = Math.abs(stepMm) <= levelMm ? 'edges should sit level' : stepMm > 0 ? `bite about ${stepMm.toFixed(1)} mm deeper on the thin (left) side` : `${(-stepMm).toFixed(1)} mm too deep on the thin side · it will ride high`;
  return `Thin left edge: bite ${extraMm >= 0 ? extraMm.toFixed(1) + ' mm deeper' : (-extraMm).toFixed(1) + ' mm shallower'} on the thin side · predicted step-off ${Math.abs(stepMm).toFixed(1)} mm · ${advice}`;
}

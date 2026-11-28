import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';

/**
 * Plan vs actual (roadmap, 2026-11-28): stitch spots marked along the wound before closing,
 * matched to where the stitches actually went (each completed pass's middle along the wound).
 * A stitch within PLAN_TOLERANCE_MM of a planned spot hits it; each spot is used once.
 */
export const PLAN_TOLERANCE_MM = 1;

export function comparePlan(plannedZ: readonly number[], actualZ: readonly number[]) {
  const unused = [...plannedZ];
  const offsetsMm = actualZ.map((z) => {
    if (!unused.length) return null;
    let best = 0;
    for (let i = 1; i < unused.length; i++) if (Math.abs(unused[i] - z) < Math.abs(unused[best] - z)) best = i;
    const off = Math.abs(unused[best] - z) * SCENE_MM_PER_UNIT;
    unused.splice(best, 1);
    return off;
  });
  return { offsetsMm, unused: unused.length };
}

export function describePlan(plannedZ: readonly number[], actualZ: readonly number[]) {
  if (!plannedZ.length) return '';
  const { offsetsMm, unused } = comparePlan(plannedZ, actualZ);
  const matched = offsetsMm.filter((o): o is number => o !== null);
  const hits = matched.filter((o) => o <= PLAN_TOLERANCE_MM).length;
  const misses = matched.filter((o) => o > PLAN_TOLERANCE_MM).map((o) => `${o.toFixed(1)} mm`);
  const extra = offsetsMm.length - matched.length;
  const parts = [`Plan: ${plannedZ.length} spot${plannedZ.length === 1 ? '' : 's'} · ${hits} hit within ${PLAN_TOLERANCE_MM} mm`];
  if (misses.length) parts.push(`off by ${misses.join(', ')}`);
  if (unused) parts.push(`${unused} not used`);
  if (extra) parts.push(`${extra} unplanned`);
  return parts.join(' · ');
}

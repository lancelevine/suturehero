import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';

/**
 * Step-off check (roadmap, 2026-11-27): the height difference between the two wound edges at each
 * tied stitch, from the retained stitch's edge mismatch (uneven bite depth or width lifts one edge).
 * Approximate millimetres from the practice model.
 */

/** Edges more than this far apart in height count as a step-off (mm). */
export const STEP_OFF_MM = 0.5;

export function describeStepOffs(sites: ReadonlyArray<{ mismatch?: number }>) {
  if (!sites.length) return 'Step-off: tie a stitch to compare the edge heights.';
  const steps = sites.map((site, index) => ({ stitch: index + 1, mm: Math.abs(site.mismatch ?? 0) * SCENE_MM_PER_UNIT }));
  const off = steps.filter((s) => s.mm > STEP_OFF_MM);
  const head = `Step-off: ${steps.length - off.length}/${steps.length} level within ${STEP_OFF_MM} mm`;
  return off.length ? `${head} · ${off.slice(0, 3).map((s) => `stitch ${s.stitch} ${s.mm.toFixed(1)} mm`).join(', ')}` : head;
}

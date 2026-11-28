import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';

/**
 * Endurance mode (roadmap, 2026-11-28): a long run of stitches, showing how precision drifts from
 * the first passes to the last (entry/exit symmetry, mm). Speed and tremor are in Skill Analysis.
 */
export const ENDURANCE_GOAL = 20;
/** Passes averaged at each end of the run. */
const WINDOW = 5;

export function describeEndurance(passes: ReadonlyArray<{ entryEdge: number; exitEdge: number | null }>) {
  const symmetry = passes.filter((p) => p.exitEdge !== null).map((p) => Math.abs(p.entryEdge - p.exitEdge!) * SCENE_MM_PER_UNIT);
  const head = `Endurance: ${symmetry.length}/${ENDURANCE_GOAL} passes`;
  if (symmetry.length < WINDOW * 2) return `${head} · precision drift shows after ${WINDOW * 2}`;
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const first = mean(symmetry.slice(0, WINDOW));
  const last = mean(symmetry.slice(-WINDOW));
  const change = last - first;
  const trend = Math.abs(change) < 0.2 ? 'steady' : change > 0 ? 'getting worse' : 'improving';
  return `${head} · symmetry ${first.toFixed(1)} → ${last.toFixed(1)} mm (${trend})`;
}

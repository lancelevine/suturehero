import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';

/**
 * Thread budget (roadmap, 2026-11-28): a running closure has one fixed length of suture (the
 * practice strand). Each pass uses its arc through the tissue plus the loose span back to the
 * previous pass (the thread model adds 5% slack there). Warns when too little is left to tie.
 * Approximate millimetres; the strand is the sim's, not an 18-inch pack yet.
 */
export const STRAND_UNITS = 3.8;
/** Loose spans get this much extra thread in the thread model (src/suture/FreeThreadGuide.ts). */
const LOOSE_SLACK = 1.05;
/** Warn when less than this share of the strand is left for tying. */
export const LOW_THREAD_SHARE = 0.25;

type Point = { x: number; y: number; z: number };
export interface BudgetPass {
  entry: Point;
  exit: Point | null;
  tract: { start: { length(): number }; exitAngle: number | null };
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Thread used by each completed pass (mm): its arc plus the loose span to the previous pass. */
export function threadUse(passes: readonly BudgetPass[]) {
  const done = passes.filter((p) => p.exit && p.tract.exitAngle !== null);
  return done.map((pass, i) => {
    const arc = pass.tract.start.length() * pass.tract.exitAngle!;
    const loose = i > 0 ? distance(pass.exit!, done[i - 1].entry) * LOOSE_SLACK : 0;
    return (arc + loose) * SCENE_MM_PER_UNIT;
  });
}

export function describeThreadBudget(passes: readonly BudgetPass[], strandUnits = STRAND_UNITS) {
  const use = threadUse(passes);
  if (!use.length) return '';
  const totalMm = strandUnits * SCENE_MM_PER_UNIT;
  const usedMm = use.reduce((a, b) => a + b, 0);
  const left = Math.max(0, totalMm - usedMm);
  const low = left < LOW_THREAD_SHARE * totalMm;
  return `Thread: ${usedMm.toFixed(0)} of ${totalMm.toFixed(0)} mm used · ${left.toFixed(0)} mm left${low ? ' · running short: leave enough to tie' : ''}`;
}

import type { SkillReport } from './skillAnalysis';

/** OSATS-style rubric (roadmap: "Exam mode scored like OSATS"). Maps the app's measured numbers
 * onto four of the standard OSATS global rating items, each 1–5. This is an approximate,
 * automated stand-in for a trained rater, not a validated OSATS score. */
export interface RubricItem { item: string; score: number | null; basis: string }

/** Linear 1–5 score: `best` and better gives 5, `worst` and worse gives 1. */
export function scale(value: number, worst: number, best: number) {
  const t = (value - worst) / (best - worst);
  return Math.round(1 + 4 * Math.min(1, Math.max(0, t)));
}

export function osatsRubric(report: SkillReport, tears: number): RubricItem[] {
  const hold = report.jawsControl;
  const respect = hold === null ? null : Math.max(1, scale(hold, 0.5, 0.95) - Math.min(2, tears));
  const idleShare = report.idleSeconds !== undefined && report.seconds > 0 ? report.idleSeconds / report.seconds : null;
  const motion = report.smoothness === null ? null : Math.round((scale(report.smoothness, 0.5, 0.9) + (idleShare === null ? scale(report.smoothness, 0.5, 0.9) : scale(idleShare, 0.6, 0.2))) / 2);
  const handling = report.needleHandling || report.regrasps
    ? Math.max(1, 5 - (report.needleHandling?.drops ?? 0) - (report.regrasps?.onTip ?? 0) - Math.floor((report.tipCollisions ?? 0) / 2))
    : null;
  const flow = idleShare === null ? null : scale(idleShare, 0.6, 0.15);
  return [
    { item: 'Respect for tissue', score: respect, basis: hold === null ? 'no forceps hold yet' : `forceps control ${Math.round(hold * 100)}%, ${tears} tear${tears === 1 ? '' : 's'}` },
    { item: 'Time and motion', score: motion, basis: report.smoothness === null ? 'no movement yet' : `smoothness ${Math.round(report.smoothness * 100)}%${idleShare === null ? '' : `, idle ${Math.round(idleShare * 100)}%`}` },
    { item: 'Instrument handling', score: handling, basis: handling === null ? 'no needle handling yet' : `${report.needleHandling?.drops ?? 0} drops, ${report.regrasps?.onTip ?? 0} tip regrasps, ${report.tipCollisions ?? 0} tip collisions` },
    { item: 'Flow of operation', score: flow, basis: idleShare === null ? 'no timing yet' : `idle ${Math.round(idleShare * 100)}% of ${Math.round(report.seconds)} s` },
  ];
}

export function describeRubric(items: readonly RubricItem[]) {
  const scored = items.filter((i) => i.score !== null);
  if (!scored.length) return '';
  const total = scored.reduce((sum, i) => sum + i.score!, 0);
  return `OSATS-style (approximate, ${scored.length} of 7 items): ${scored.map((i) => `${i.item} ${i.score}/5`).join(' · ')} · total ${total}/${scored.length * 5}`;
}

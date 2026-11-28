/**
 * Edges of unequal length (roadmap, 2026-11-28). When one wound edge is longer, each bite must step
 * a little further along the long edge than along the short one, so the extra length is spread
 * evenly instead of bunching into a dog-ear at the end. Here the right edge (+x, exits of a
 * right-to-left bite or entries of a left-to-right one) is the long one by RATIO. Graded on each
 * gap's long/short step ratio against RATIO. Approximate; the pad's edges are drawn the same length.
 */
export const LONG_EDGE_RATIO = 1.25;
export const RATIO_TOLERANCE = 0.15;

type Pass = { entry: { x: number; z: number }; exit: { x: number; z: number } | null };

/** The side of each completed crossing pass on the left (short) and right (long) edge, in order along the wound. */
function edgePoints(passes: readonly Pass[]) {
  return passes
    .filter((p) => p.exit && Math.sign(p.entry.x) !== Math.sign(p.exit.x))
    .map((p) => (p.entry.x < 0 ? { short: p.entry.z, long: p.exit!.z } : { short: p.exit!.z, long: p.entry.z }))
    .sort((a, b) => a.short - b.short);
}

/** Long-edge step / short-edge step for each gap between neighbouring bites. */
export function stepRatios(passes: readonly Pass[]) {
  const points = edgePoints(passes);
  return points.slice(1).map((p, i) => {
    const shortStep = Math.abs(p.short - points[i].short);
    return shortStep > 1e-6 ? Math.abs(p.long - points[i].long) / shortStep : 0;
  });
}

export function describeUnequalEdges(passes: readonly Pass[]) {
  const ratios = stepRatios(passes);
  if (!ratios.length) return `Unequal edges: the right edge is ${Math.round((LONG_EDGE_RATIO - 1) * 100)}% longer · step about ${LONG_EDGE_RATIO}× further along it with each bite`;
  const good = ratios.filter((r) => Math.abs(r - LONG_EDGE_RATIO) <= RATIO_TOLERANCE).length;
  return `Unequal edges: ${good}/${ratios.length} gaps spread the extra length (steps ${ratios.map((r) => r.toFixed(2)).join(' / ')}×, aim ${LONG_EDGE_RATIO}×)`;
}

/**
 * Bite consistency (roadmap, 2026-11-27): each bite's distance from the wound edge (entry and exit
 * of every completed pass) compared with the median bite; bites further than the tolerance are
 * outliers. Millimetres from the 3D scene; approximate practice feedback.
 */

/** A bite more than this far from the median bite is an outlier (mm). */
export const BITE_OUTLIER_MM = 1.5;

export interface BiteOutlier {
  /** 1-based pass number. */
  pass: number;
  side: 'entry' | 'exit';
  biteMm: number;
}

export interface BiteConsistency {
  medianMm: number | null;
  bites: number;
  outliers: BiteOutlier[];
}

function median(values: readonly number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** `passes` are each completed pass's entry and exit bites (mm); exit is null while unfinished. */
export function biteConsistency(passes: ReadonlyArray<{ entryMm: number; exitMm: number | null }>, toleranceMm = BITE_OUTLIER_MM): BiteConsistency {
  const bites = passes.flatMap((pass, index) => [
    { pass: index + 1, side: 'entry' as const, biteMm: pass.entryMm },
    ...(pass.exitMm === null ? [] : [{ pass: index + 1, side: 'exit' as const, biteMm: pass.exitMm }]),
  ]);
  if (!bites.length) return { medianMm: null, bites: 0, outliers: [] };
  const medianMm = median(bites.map((bite) => bite.biteMm));
  return { medianMm, bites: bites.length, outliers: bites.filter((bite) => Math.abs(bite.biteMm - medianMm) > toleranceMm) };
}

export function describeBiteConsistency(result: BiteConsistency, toleranceMm = BITE_OUTLIER_MM) {
  if (result.medianMm === null) return 'Bite consistency: make a pass to measure your bites.';
  const within = result.bites - result.outliers.length;
  const head = `Bite consistency: ${within}/${result.bites} within ${toleranceMm} mm of ${result.medianMm.toFixed(1)} mm`;
  if (!result.outliers.length) return head;
  const list = result.outliers.slice(0, 3).map((o) => `pass ${o.pass} ${o.side} ${o.biteMm.toFixed(1)} mm`).join(', ');
  return `${head} · outliers: ${list}${result.outliers.length > 3 ? ', …' : ''}`;
}

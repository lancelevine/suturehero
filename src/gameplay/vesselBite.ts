/**
 * Microsurgical bite geometry (roadmap, 2026-11-28): each vessel bite should sit about twice the
 * wall thickness from the cut edge, equal on both sides. Distances in scene units from the entry
 * and exit points of each saved vessel stitch. Approximate.
 */
export const BITE_TO_WALL = { min: 1.5, max: 2.5 } as const;
/** Sides may differ by this share of the larger bite. */
export const SIDE_MATCH = 0.2;

export function vesselBite(entryX: number, exitX: number, gap: number, wall: number) {
  const left = Math.abs(entryX) - gap / 2;
  const right = Math.abs(exitX) - gap / 2;
  const ratio = (left + right) / 2 / wall;
  const matched = Math.abs(left - right) <= SIDE_MATCH * Math.max(left, right);
  return { ratio, matched, good: ratio >= BITE_TO_WALL.min && ratio <= BITE_TO_WALL.max && matched };
}

export function describeVesselBites(bites: ReadonlyArray<{ ratio: number; matched: boolean; good: boolean }>) {
  if (!bites.length) return '';
  const good = bites.filter((b) => b.good).length;
  const last = bites[bites.length - 1];
  return `Bites: ${good}/${bites.length} at ~2× wall, both sides equal · last ${last.ratio.toFixed(1)}× wall${last.matched ? '' : ', sides unequal'}`;
}

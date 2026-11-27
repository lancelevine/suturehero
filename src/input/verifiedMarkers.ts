import type { TrackerType } from './prismPose';

/**
 * The markers each instrument's pose uses (moved out of src/tracking.ts, 2026-11-27): only
 * markers whose ID was decoded within `maxDecodeAgeMs`, best first by a score that favours large
 * (close, well-resolved) and freshly decoded markers, at most as many as the tracker can show.
 */
export interface CornerMarker {
  id: number;
  corners: ReadonlyArray<{ x: number; y: number }>;
}

/** Score lost per millisecond since the marker was last decoded. */
const SCORE_PER_MS_AGE = 0.009;

/** Faces one camera can see at once: a prism two, a 6-face ring three, an 8-face ring five (with end faces). */
export function maxVisibleFaces(trackerType: TrackerType) {
  return trackerType === 'prism' ? 2 : trackerType === 'ring6' ? 3 : 5;
}

/** Area of a marker's corner quadrilateral (px²). */
export function markerArea(corners: CornerMarker['corners']) {
  return Math.abs(corners.reduce((sum, p, i) => sum + p.x * corners[(i + 1) % 4].y - corners[(i + 1) % 4].x * p.y, 0)) / 2;
}

export function selectVerifiedMarkers<M extends CornerMarker>(live: readonly M[], groups: Readonly<Record<string, readonly number[]>>, trackerType: TrackerType, lastDecoded: ReadonlyMap<number, number>, now: number, maxDecodeAgeMs: number): M[] {
  const eligible = live.filter((m) => now - (lastDecoded.get(m.id) ?? -Infinity) <= maxDecodeAgeMs);
  const selected: M[] = [];
  for (const name of Object.keys(groups)) {
    const ids = groups[name];
    const ranked = eligible
      .filter((m) => ids.includes(m.id))
      .map((m) => {
        const age = now - (lastDecoded.get(m.id) ?? 0);
        return { marker: m, score: Math.log1p(markerArea(m.corners)) - age * SCORE_PER_MS_AGE };
      })
      .sort((a, b) => b.score - a.score);
    selected.push(...ranked.slice(0, maxVisibleFaces(trackerType)).map((item) => item.marker));
  }
  return selected;
}

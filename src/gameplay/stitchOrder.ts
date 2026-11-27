/**
 * Stitch order coaching (roadmap, 2026-11-27): on a long wound, place the first stitch in the
 * middle, then halve each remaining gap. Each stitch is checked against the largest gap left at
 * the time it was placed. Positions are along the wound in scene units; practice coaching only.
 */

/** Wound ends along z (scene units), as the stitch course's site limits (src/gameplay/StitchCourse.ts). */
export const WOUND_ENDS = { min: -1.1, max: 1.1 } as const;
/** A stitch counts as halving its gap when it lands within this share of the gap's length from the middle. */
export const HALVING_TOLERANCE = 0.2;
/** A gap counts as one of the largest when it is at least this share of the largest gap. */
const LARGEST_GAP_SHARE = 0.8;

export interface StitchOrderReview {
  followed: number;
  total: number;
  /** 1-based number of the first stitch that did not halve the largest gap, or null. */
  firstMiss: number | null;
}

export function reviewStitchOrder(sitesInOrder: readonly number[], ends: { min: number; max: number } = WOUND_ENDS): StitchOrderReview {
  let gaps: Array<[number, number]> = [[ends.min, ends.max]];
  let followed = 0;
  let firstMiss: number | null = null;
  sitesInOrder.forEach((site, index) => {
    const gap = gaps.find(([low, high]) => site >= low && site <= high);
    if (!gap) {
      if (firstMiss === null) firstMiss = index + 1;
      return;
    }
    const [low, high] = gap;
    const length = high - low;
    const largest = Math.max(...gaps.map(([a, b]) => b - a));
    const nearMiddle = Math.abs(site - (low + high) / 2) <= HALVING_TOLERANCE * length;
    if (nearMiddle && length >= LARGEST_GAP_SHARE * largest) followed++;
    else if (firstMiss === null) firstMiss = index + 1;
    gaps = gaps.flatMap((g) => (g === gap ? [[low, site], [site, high]] as Array<[number, number]> : [g]));
  });
  return { followed, total: sitesInOrder.length, firstMiss };
}

/** One line for the Sandbox summary. */
export function describeStitchOrder(review: StitchOrderReview) {
  if (!review.total) return 'Stitch order: first stitch in the middle, then halve each gap.';
  if (review.firstMiss === null) return `Stitch order: middle first, then halving · ${review.followed}/${review.total}`;
  const hint = review.firstMiss === 1 ? 'start in the middle of the wound' : 'place each stitch midway in the largest gap';
  return `Stitch order: ${review.followed}/${review.total} halved the largest gap · from stitch ${review.firstMiss}, ${hint}`;
}

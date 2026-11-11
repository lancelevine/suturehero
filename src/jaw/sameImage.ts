/**
 * Ring and handle-prism corners from the same camera image.
 *
 * Camera 1's live marker list mixes optical-flow corners (newest image,
 * ~100 per second) with decoder corners for markers flow is not following
 * yet (an image 50–80 ms older). Combining a fresh ring with an older prism
 * face turns any hand movement in between into apparent handle rotation:
 * Lance saw 0 → 100% → 0 while wiggling with only face 9 visible (0.136).
 * The hinge only turns ~20°, so the two must come from the same image.
 */

/** Corners whose source images are this close (ms) count as the same image (same flow/decode result). */
export const SAME_IMAGE_MS = 1;

/**
 * The ring markers and prism faces taken from the newest image that shows
 * the ring, or null when no prism face comes from that image. Markers with
 * no known image time are treated as current (no filtering).
 */
export function sameImageMarkers<M extends { id: number }>(
  ring: readonly M[],
  faces: readonly M[],
  imageAt: (id: number) => number | undefined,
): { ring: M[]; faces: M[] } | null {
  const times = ring.map((m) => imageAt(m.id)).filter((t): t is number => t !== undefined);
  if (!times.length) return faces.length ? { ring: [...ring], faces: [...faces] } : null;
  const newest = Math.max(...times);
  const same = (m: M) => {
    const t = imageAt(m.id);
    return t === undefined || Math.abs(t - newest) <= SAME_IMAGE_MS;
  };
  const sameFaces = faces.filter(same);
  return sameFaces.length ? { ring: ring.filter(same), faces: sameFaces } : null;
}

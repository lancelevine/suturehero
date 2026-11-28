import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';

/**
 * Landmark alignment exercise (roadmap; Lance 2026-11-28: a separate exercise, landmark at the
 * centre). A line such as the vermilion border crosses the wound at z = 0; the first stitch must
 * line it up. Graded on millimetres off the line. Approximate practice measure.
 */
export const LANDMARK_Z = 0;
/** The first stitch counts as aligned within this distance of the landmark (mm). */
export const LANDMARK_TOLERANCE_MM = 1;

export function landmarkOffsetMm(firstStitchZ: number) {
  return Math.abs(firstStitchZ - LANDMARK_Z) * SCENE_MM_PER_UNIT;
}

export function describeLandmark(firstStitchZ: number | null) {
  if (firstStitchZ === null) return 'Landmark exercise: place the first stitch exactly on the landmark line, then close the rest of the wound.';
  const off = landmarkOffsetMm(firstStitchZ);
  return `Landmark: first stitch ${off.toFixed(1)} mm off the line · ${off <= LANDMARK_TOLERANCE_MM ? 'aligned ✓' : `aim within ${LANDMARK_TOLERANCE_MM} mm`}`;
}

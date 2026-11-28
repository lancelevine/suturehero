/** Needles that skid off the skin (roadmap). A tip meeting the skin at a shallow angle slides
 * across the surface instead of biting. Practice model: the angle limit is illustrative. */

/** Entry angles flatter than this (degrees between the needle path and the skin surface) skid. */
export const SKID_ANGLE_DEG = 20;
export const SKID_MESSAGE = 'Needle skidded · the tip met the skin too flat · lift the hand so the tip enters closer to 90°';

export function skids(entryAngleDeg: number) {
  return entryAngleDeg < SKID_ANGLE_DEG;
}

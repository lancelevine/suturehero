/** Checks before turning or flipping the microsurgery vessel (roadmap: "Flip the vessel").
 * Turning the clamp while the needle or thread is still through the wall, or while the forceps
 * hold the wall, would tear the stitch in a real anastomosis. Saved (tied) stitches turn with the
 * vessel, and both ends turn together, so a turn itself adds no twist. */
export interface FlipState { needleInWall: boolean; untiedThread: boolean; wallHeld: boolean }

/** Seconds the warning stays on the instruction line. */
export const FLIP_WARNING_SECONDS = 4;

export function flipBlocker(state: FlipState): string | null {
  if (state.needleInWall) return 'Not turned · the needle is still in the wall; turning now would tear it · finish or back out the bite first';
  if (state.wallHeld) return 'Not turned · release the forceps from the wall before turning the clamp';
  if (state.untiedThread) return 'Not turned · tie or save this stitch first; turning with loose thread through the wall tears it';
  return null;
}

import { MARKER_GROUPS } from './arucoTracking';
import type { TrackerType } from './prismPose';

/** ArUco marker IDs on each instrument's tracker, per tracker type (moved out of src/tracking.ts, 2026-11-27). */
export type InstrumentName = 'needleDriver' | 'forceps' | 'scissors';
export type MarkerGroups = Record<InstrumentName, readonly number[]>;

/** 8-face ring: eight consecutive IDs per instrument, in blocks of ten. */
export const RING8_MARKER_GROUPS: MarkerGroups = {
  needleDriver: [0, 1, 2, 3, 4, 5, 6, 7],
  forceps: [10, 11, 12, 13, 14, 15, 16, 17],
  scissors: [20, 21, 22, 23, 24, 25, 26, 27],
};

/** 6-face ring: six consecutive IDs per instrument, in blocks of ten. */
export const RING6_MARKER_GROUPS: MarkerGroups = {
  needleDriver: [0, 1, 2, 3, 4, 5],
  forceps: [10, 11, 12, 13, 14, 15],
  scissors: [20, 21, 22, 23, 24, 25],
};

export function markerGroupsFor(trackerType: TrackerType): MarkerGroups {
  if (trackerType === 'ring8') return RING8_MARKER_GROUPS;
  if (trackerType === 'ring6') return RING6_MARKER_GROUPS;
  return MARKER_GROUPS;
}

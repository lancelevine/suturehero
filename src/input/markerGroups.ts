import { MARKER_GROUPS } from './arucoTracking';
import * as THREE from 'three';
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

const INSTRUMENT_LABELS: Record<InstrumentName, string> = { needleDriver: 'Needle driver', forceps: 'Forceps', scissors: 'Scissors' };

/** The tracker-type status line and the geometry description under it (tracking page). */
export function trackerDescriptionText(trackerType: TrackerType, geometry: { faceCount: number; sideStepRadians: number; markerSizeMm: number }, groups: MarkerGroups) {
  const spacing = THREE.MathUtils.radToDeg(geometry.sideStepRadians).toFixed(0);
  const ids = (['needleDriver', 'forceps', 'scissors'] as const).map((name) => `${INSTRUMENT_LABELS[name]} IDs ${groups[name][0]}–${groups[name].at(-1)}`).join(' · ');
  const status = `${geometry.faceCount}-face ${trackerType === 'prism' ? 'prism' : 'ring'} · ${spacing}° side spacing for all instruments · ` + ids;
  const endFaces = trackerType === 'ring8' ? ' plus two inclined end faces; briefly show each angled marker together with a side marker to align its single-camera rotation' : '';
  const description = `DICT_4X4_50 · ${geometry.markerSizeMm} mm marker squares. All instruments use the selected ${geometry.faceCount}-face geometry with ${spacing}° side spacing${endFaces}. Face ID order and printed corner orientation must match the physical tracker. Camera depth and angles remain approximate until camera calibration.`;
  return { status, description };
}

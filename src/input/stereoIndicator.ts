import { fitErrorFromReason } from '../ui/trackingHealth';
/**
 * The tracking page's stereo status dot and label (moved out of src/tracking.ts, 2026-11-27).
 * `fallback` lists instruments placed from one camera only; `fresh` those triangulated now.
 */
export interface StereoIndicatorInput {
  configured: boolean;
  fallback: ReadonlyArray<readonly [string, string]>;
  fresh: readonly string[];
  /** Why the stereo calibration does not match the cameras, or null. */
  mismatch: string | null;
  /** One camera running without stereo (shown as mono). */
  monoStreaming: boolean;
}

export type StereoIndicatorState = 'mismatch' | 'fallback' | 'active' | 'waiting' | 'mono' | 'off';

export const STEREO_DOT_COLORS = { good: '#16a34a', warning: '#d69e28', off: '#89939e' } as const;

export function stereoIndicator({ configured, fallback, fresh, mismatch, monoStreaming }: StereoIndicatorInput): { color: string; label: string; state: StereoIndicatorState } {
  const active = configured && fresh.length > 0;
  const color = active && !mismatch && !fallback.length ? STEREO_DOT_COLORS.good : configured ? STEREO_DOT_COLORS.warning : STEREO_DOT_COLORS.off;
  let label: string;
  if (mismatch) label = 'Stereo triangulation: calibration mismatch · ' + mismatch;
  else if (configured && fallback.length) label = 'Stereo fallback: ' + fallback.map(([name, source]) => name + ' · ' + (source === 'camera1' ? 'Camera 1' : 'Camera 2') + ' · approximate depth').join(', ');
  else if (active) label = 'Stereo triangulation: ACTIVE · ' + fresh.join(', ');
  else if (configured) label = 'Stereo triangulation: waiting for valid markers';
  else label = 'Stereo triangulation: off';
  let state: StereoIndicatorState;
  if (mismatch) state = 'mismatch';
  else if (configured) state = fallback.length ? 'fallback' : active ? 'active' : 'waiting';
  else state = monoStreaming ? 'mono' : 'off';
  return { color, label, state };
}

/**
 * Why live triangulation cannot run yet, as shown under the stereo setup, or null when it can.
 * `mismatch` is only evaluated once a calibration is loaded and the other conditions hold.
 */
export function stereoBlockedReason(input: { calibrated: boolean; stereoMode: boolean; simulated: boolean; mismatch: () => string | null }): string | null {
  if (!input.calibrated) return 'Import a solved calibration JSON first.';
  if (!input.stereoMode) return 'Select 2 cameras in Tracking mode.';
  if (input.simulated) return 'Disable simulated input for live triangulation.';
  const mismatch = input.mismatch();
  return mismatch ? 'Stereo inactive: ' + mismatch : null;
}

/**
 * One instrument's line in the stereo triangulation status, and the joint fit error the
 * camera-moved monitor should see (src/ui/trackingHealth.ts): the accepted fit's error, or the
 * error in the rejection reason when a camera sees the instrument but stereo was not used.
 */
export function stereoInstrumentReport(
  name: string,
  rigid: { firstIds: readonly number[]; secondIds: readonly number[]; errorPx: number } | null,
  synchronized: { first: ReadonlyArray<{ id: number }>; second: ReadonlyArray<{ id: number }> } | null | undefined,
  ids: readonly number[],
  rejection: string | undefined,
): { note: string | null; fitErrorPx: number | null } {
  if (!synchronized) return { note: null, fitErrorPx: null };
  if (rigid) return { note: name + ' · Camera 1 IDs ' + rigid.firstIds.join(',') + ' / Camera 2 IDs ' + rigid.secondIds.join(',') + ' · joint error ' + rigid.errorPx.toFixed(2) + ' px', fitErrorPx: rigid.errorPx };
  // Explain instruments that at least one camera sees.
  const seen = [...synchronized.first, ...synchronized.second].some((m) => ids.includes(m.id));
  if (!seen || !rejection) return { note: null, fitErrorPx: null };
  return { note: name + ' · stereo not used: ' + rejection, fitErrorPx: fitErrorFromReason(rejection) };
}

/** Camera frames further apart than this (ms) are reported as not synchronized. */
export const STEREO_SYNC_WARNING_MS = 250;

/**
 * The "#stereo-match-status" line (moved out of src/tracking.ts, 2026-11-27): marker IDs seen by
 * both cameras and the frame offset; `null` offset while either camera has no detections yet.
 */
export function stereoMatchText(offsetMs: number | null, primaryIds: readonly number[], secondaryIds: readonly number[]) {
  if (offsetMs === null) return 'Stereo matching: waiting for both camera detections.';
  const shared = primaryIds.filter((id) => secondaryIds.includes(id));
  const sync = offsetMs <= STEREO_SYNC_WARNING_MS ? '' : 'frames not synchronized · ';
  const ids = shared.length ? 'shared marker IDs ' + shared.join(', ') : 'no shared marker IDs';
  return 'Stereo: ' + sync + ids + ' · frame offset ' + Math.round(offsetMs) + ' ms · calibration required for 3D';
}

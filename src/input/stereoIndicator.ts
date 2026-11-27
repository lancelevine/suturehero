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

import type { HallCalibration } from './HallJawInput';

/**
 * Guided jaw-sensor calibration (2026-11-23): the user holds the jaws closed, then opens
 * and closes them fully a few times while readings are collected. Closed is the reading
 * held at the start; open is the extreme farthest from it. Percentiles reject single
 * noisy readings. Works whichever way the magnet faces.
 */

/** Share of the sweep, from its start, taken as the held-closed reading. */
export const CLOSED_HOLD_SHARE = 0.15;
/** Percentiles used as the extremes of the sweep (reject single noisy readings). */
const LOW_PERCENTILE = 0.05;
const HIGH_PERCENTILE = 0.95;
/** Fewest readings for a usable sweep (about 0.3 s at the firmware's 100 readings/s). */
export const MIN_SWEEP_SAMPLES = 30;

export type SweepResult =
  | { ok: true; calibration: HallCalibration }
  | { ok: false; reason: string };

const percentile = (sorted: readonly number[], p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))];
const median = (values: readonly number[]) => percentile([...values].sort((a, b) => a - b), 0.5);

export function sweepCalibration(samples: readonly number[], minimumSpan: number): SweepResult {
  if (samples.length < MIN_SWEEP_SAMPLES) return { ok: false, reason: 'Too few readings · keep the sensor connected and try again' };
  const hold = samples.slice(0, Math.max(3, Math.round(samples.length * CLOSED_HOLD_SHARE)));
  const closed = Math.round(median(hold));
  const sorted = [...samples].sort((a, b) => a - b);
  const low = percentile(sorted, LOW_PERCENTILE);
  const high = percentile(sorted, HIGH_PERCENTILE);
  // Open is whichever extreme lies farther from the held-closed reading.
  const open = Math.round(Math.abs(high - closed) >= Math.abs(low - closed) ? high : low);
  if (Math.abs(open - closed) < minimumSpan) {
    return { ok: false, reason: `The reading barely changed (${closed} to ${open}) · open the jaws fully, or move the magnet nearer the sensor` };
  }
  return { ok: true, calibration: { closed, open } };
}

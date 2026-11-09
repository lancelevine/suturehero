/**
 * Tracking health for the main-screen status strip: a setup checklist, short
 * reasons when tracking is holding instead of updating, and a warning when
 * the stereo fit stays poor (a camera has probably moved).
 *
 * Pure functions and a small monitor; src/tracking.ts gathers the inputs.
 */

/** An instrument the cameras have seen in this session. */
export interface InstrumentHealth {
  label: string;
  /** Time since its markers were last seen (ms), or null if never seen this session. */
  lastSeenAgoMs: number | null;
  neutralSaved: boolean;
  /** null: the selected jaw tracker is calibrated elsewhere (classic). */
  jawsCalibrated: boolean | null;
  /** Single-camera depth is being held (marker too tilted or small). */
  depthHeld: boolean;
  /** Why stereo was not used for it, when stereo is on. */
  stereoRejection: string | null;
}

export interface HealthInput {
  stereoMode: boolean;
  camera1Running: boolean;
  camera2Running: boolean;
  /** null when a matching stereo calibration is loaded. */
  stereoCalibrationProblem: string | null;
  /** Why the two cameras' frames could not be paired, when stereo is on. */
  pairingFailure: string | null;
  instruments: InstrumentHealth[];
}

export type ChecklistKey = 'cameras' | 'stereo' | 'neutral' | 'jaws';

export interface ChecklistItem {
  key: ChecklistKey;
  label: string;
  ok: boolean;
  /** What is missing, for the tooltip. */
  detail: string;
}

/** After this long without markers an instrument is holding its last pose (matches tracking's 650 ms hold). */
export const HOLD_AFTER_MS = 650;

const inUse = (input: HealthInput) => input.instruments.filter((i) => i.lastSeenAgoMs !== null);

export function setupChecklist(input: HealthInput): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const camerasOk = input.camera1Running && (!input.stereoMode || input.camera2Running);
  items.push({
    key: 'cameras',
    label: input.stereoMode ? '2 cameras' : 'Camera',
    ok: camerasOk,
    detail: camerasOk ? 'Running' : input.stereoMode ? 'Start both cameras' : 'Start the camera',
  });
  if (input.stereoMode) {
    items.push({
      key: 'stereo',
      label: 'Stereo calibration',
      ok: input.stereoCalibrationProblem === null,
      detail: input.stereoCalibrationProblem ?? 'Loaded and matches the cameras',
    });
  }
  const seen = inUse(input);
  const needNeutral = seen.filter((i) => !i.neutralSaved).map((i) => i.label);
  items.push({
    key: 'neutral',
    label: 'Neutral',
    ok: seen.length > 0 && needNeutral.length === 0,
    detail: !seen.length ? 'Show an instrument to the camera' : needNeutral.length ? `Set neutral: ${needNeutral.join(', ')}` : 'Set for every instrument in view',
  });
  const jawTracked = seen.filter((i) => i.jawsCalibrated !== null);
  if (jawTracked.length) {
    const needJaws = jawTracked.filter((i) => !i.jawsCalibrated).map((i) => i.label);
    items.push({
      key: 'jaws',
      label: 'Jaws',
      ok: needJaws.length === 0,
      detail: needJaws.length ? `Calibrate jaws: ${needJaws.join(', ')}` : 'Calibrated',
    });
  }
  return items;
}

/** Short reasons, one per line, when an instrument is holding instead of updating. */
export function holdingReasons(input: HealthInput): string[] {
  const reasons: string[] = [];
  if (input.stereoMode && input.camera1Running && input.camera2Running && input.pairingFailure) {
    reasons.push(`Stereo paused: cameras out of step (${input.pairingFailure})`);
  }
  for (const instrument of inUse(input)) {
    if (instrument.lastSeenAgoMs! > HOLD_AFTER_MS) {
      reasons.push(`${instrument.label}: holding · markers not visible for ${(instrument.lastSeenAgoMs! / 1000).toFixed(1)} s`);
      continue;
    }
    if (instrument.depthHeld) reasons.push(`${instrument.label}: depth held · marker too tilted or small`);
    if (input.stereoMode && instrument.stereoRejection) reasons.push(`${instrument.label}: one camera only · ${instrument.stereoRejection}`);
  }
  return reasons;
}

/** Stereo fit error above this (px, the acquisition limit) counts as poor. */
export const POOR_FIT_PX = 3;
/** Judge the fit over this window (ms). */
export const FIT_WINDOW_MS = 4000;
/** Need at least this many fits in the window before warning. */
export const MIN_FIT_SAMPLES = 12;
/** Warn when at least this share of fits in the window are poor; clear when below CLEAR_SHARE. */
export const WARN_SHARE = 0.75;
export const CLEAR_SHARE = 0.4;

/**
 * Warns when the stereo fit stays poor for seconds: the usual cause is a
 * camera that moved after calibration (seen 2026-11-08: Camera 2 fitting at
 * ~6 px). A brief poor fit (fast motion, a partial view) does not warn.
 */
export class CameraMovedMonitor {
  private fits: Array<{ at: number; poor: boolean }> = [];
  private warning = false;

  feed(now: number, fitPx: number) {
    if (!Number.isFinite(fitPx)) return;
    this.fits.push({ at: now, poor: fitPx > POOR_FIT_PX });
  }

  /** The warning text, or null. */
  check(now: number): string | null {
    this.fits = this.fits.filter((f) => now - f.at <= FIT_WINDOW_MS);
    if (this.fits.length >= MIN_FIT_SAMPLES) {
      const poorShare = this.fits.filter((f) => f.poor).length / this.fits.length;
      if (poorShare >= WARN_SHARE) this.warning = true;
      else if (poorShare < CLEAR_SHARE) this.warning = false;
    } else if (!this.fits.length) {
      this.warning = false;
    }
    return this.warning
      ? 'A camera may have moved: the two views no longer fit the stereo calibration. Recalibrate stereo, then set neutral again.'
      : null;
  }

  reset() {
    this.fits = [];
    this.warning = false;
  }
}

/** The fit error (px) in a stereo rejection reason such as "fit error 3.9 px (limit 3)", if any. */
export function fitErrorFromReason(reason: string): number | null {
  const match = /fit error ([\d.]+) px/.exec(reason);
  return match ? Number(match[1]) : null;
}

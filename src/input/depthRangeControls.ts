import { depthRange } from './monocularDepthMapping';
import type { SizeDepthFrame } from './sizeDepthEstimator';
import { SizeDepthCalibration } from './tiltSizeDepth';
import { DEFAULT_WORKING_DEPTH_MM, parseDepthCalibration, readStoredJson, TRACKING_STORAGE_KEYS, writeStored, type SavedDepthCalibration } from './trackingStorage';

/**
 * Single-camera depth range (moved out of tracking.ts, 2026-11-26): the Near/Far marker
 * sizes captured with the size-depth calibration, the working depth, and the saved copy.
 * Near/Far only apply to the camera and tracker geometry they were captured with
 * (`binding`). Depth from marker size is approximate.
 */
/** Working depth after "Reset depth range" (mm). */
export const RESET_WORKING_DEPTH_MM = 400;

export class DepthRange {
  readonly size = new SizeDepthCalibration();
  nearMm: number | null = null;
  farMm: number | null = null;
  workingMm = DEFAULT_WORKING_DEPTH_MM;

  /** Saved form (`suturehero.depthCalibration.v2`). */
  serialize(): SavedDepthCalibration {
    return { near: this.nearMm, far: this.farMm, range: this.workingMm || DEFAULT_WORKING_DEPTH_MM, size: this.size };
  }

  /** Restore a saved range. Near/Far are only kept with the size calibration they were captured with. */
  restore(saved: unknown) {
    const value = parseDepthCalibration(saved);
    if (value.range !== undefined) this.workingMm = value.range;
    if (!this.size.restore(value.size)) return;
    if (value.near !== undefined) this.nearMm = value.near;
    if (value.far !== undefined) this.farMm = value.far;
  }

  setNear(sample: SizeDepthFrame) {
    this.size.setNear(sample);
    this.nearMm = sample.distanceMm;
    this.farMm = null;
  }

  /** False when Near is missing or the sample is not clearly farther with the same camera and tracker. */
  setFar(sample: SizeDepthFrame) {
    if (!this.size.setFar(sample)) return false;
    this.farMm = sample.distanceMm;
    this.workingMm = Math.round(this.farMm - this.nearMm!);
    return true;
  }

  /** A new working depth invalidates Far. */
  setWorking(mm: number) {
    this.workingMm = mm;
    this.size.far = null;
    this.farMm = null;
  }

  reset() {
    this.size.near = null;
    this.size.far = null;
    this.nearMm = null;
    this.farMm = null;
    this.workingMm = RESET_WORKING_DEPTH_MM;
  }

  /**
   * Near distance and span used for the virtual depth, for this camera/tracker binding. The
   * tracking page passes the working-depth field's live value, as it read it before the move
   * (Tracking Lab replays set the field directly).
   */
  range(binding: string, workingMm = this.workingMm) {
    return depthRange(this.size.near?.binding === binding, this.nearMm, this.farMm, workingMm);
  }

  status(binding: string) {
    if (!this.size.near) return 'Hold the selected instrument still at Near, then Far. A reasonably face-on marker is required.';
    if (this.size.near.binding !== binding) return 'Start the same camera and tracker geometry, or capture Near/Far again.';
    if (!this.size.far) return 'Near size captured. Move the same instrument farther away and capture Far.';
    return 'Near/Far tilt-corrected marker sizes calibrated. Edge-on markers hold the last depth.';
  }
}

export interface DepthRangeControlOptions {
  /** Current camera + tracker geometry key. */
  binding(): string;
  /** A steady size-depth sample from the selected instrument, or a message saying why there is none. */
  capture(): SizeDepthFrame | string;
  /** Depth filters must restart after the range changes. */
  changed(): void;
}

/** Wires the Near/Far/Reset buttons, the working-depth field and the status line to a DepthRange. */
export function mountDepthRangeControls(options: DepthRangeControlOptions, root: ParentNode = document) {
  const workingInput = root.querySelector<HTMLInputElement>('#working-depth-mm')!;
  const status = root.querySelector<HTMLElement>('#depth-range-status')!;
  const range = new DepthRange();
  const saved = readStoredJson(TRACKING_STORAGE_KEYS.depthCalibration);
  if (saved !== undefined) range.restore(saved);
  workingInput.value = String(range.workingMm);
  const label = () => { status.textContent = range.status(options.binding()); };
  const commit = () => {
    workingInput.value = String(range.workingMm);
    options.changed();
    writeStored(TRACKING_STORAGE_KEYS.depthCalibration, JSON.stringify(range.serialize()));
    label();
  };
  const capture = () => {
    const sample = options.capture();
    if (typeof sample === 'string') { status.textContent = sample; return null; }
    return sample;
  };
  // While typing, the depth follows the field (as before the move); committing it resets Far.
  workingInput.addEventListener('input', () => { range.workingMm = Number(workingInput.value); });
  workingInput.addEventListener('change', () => { range.setWorking(Number(workingInput.value)); commit(); });
  root.querySelector('#set-depth-near')!.addEventListener('click', () => {
    const sample = capture();
    if (!sample) return;
    range.setNear(sample);
    commit();
  });
  root.querySelector('#set-depth-far')!.addEventListener('click', () => {
    const sample = capture();
    if (!sample) return;
    if (!range.setFar(sample)) {
      status.textContent = 'Capture Near first, then move the same instrument clearly farther away using the same camera and tracker.';
      return;
    }
    commit();
  });
  root.querySelector('#reset-depth-range')!.addEventListener('click', () => { range.reset(); commit(); });
  return { range, label };
}

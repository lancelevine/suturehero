import type { SizeDepthAnchor } from './tiltSizeDepth';

/**
 * Single-camera depth from marker size, per instrument (moved out of
 * src/tracking.ts on 2026-11-09 without changing behaviour).
 *
 * Each frame the caller passes every visible face of the instrument as a
 * candidate: its tilt-corrected size and a size-to-distance "proxy" already
 * corrected for the face's offset from the tracker centre. The estimator:
 * - keeps using the same face unless another is clearly more face-on
 *   (FACE_SWITCH_COSINE_MARGIN), so the reading does not jump between faces;
 * - while the instrument is at rest, repeats the last recorded proxy;
 * - returns the median of the last MAX_FRAMES frames within FRAME_WINDOW_MS.
 */

export interface SizeDepthCandidate {
  id: number;
  /** Tilt-corrected marker side as a fraction of the image width. */
  normalizedSide: number;
  /** Cosine of the face's tilt to the camera (1 = face-on). */
  cosine: number;
  /** Size-derived distance proxy (distance in mm per (focal px / image width)), offset to the tracker centre. */
  proxy: number;
}

export type SizeDepthFrame = SizeDepthAnchor & { at: number; distanceMm: number };

/** Stay on the current face unless another is more face-on by this much (cosine). */
export const FACE_SWITCH_COSINE_MARGIN = 0.12;
export const MAX_FRAMES = 8;
export const FRAME_WINDOW_MS = 500;

export interface SizeDepthUpdate {
  candidates: readonly SizeDepthCandidate[];
  now: number;
  stationary: boolean;
  /** Depth calibration binding (camera + tracker setup); frames from another binding are not reused at rest. */
  binding: string;
  instrument: string;
  /** focal length (px) / image width (px): converts a proxy to millimetres. */
  focalPerWidth: number;
}

export class SizeDepthEstimator {
  private faceId: number | undefined;
  private recorded: SizeDepthFrame[] = [];

  /** The median frame, or null when no face is usable (caller holds its last depth). */
  update(input: SizeDepthUpdate): SizeDepthFrame | null {
    const options = [...input.candidates].filter((c) => Number.isFinite(c.proxy) && c.proxy > 0).sort((a, b) => b.cosine - a.cosine);
    const best = options[0];
    const current = options.find((c) => c.id === this.faceId);
    const selected = current && best && current.cosine >= best.cosine - FACE_SWITCH_COSINE_MARGIN ? current : best;
    if (!selected) return null;
    this.faceId = selected.id;
    const last = this.recorded.at(-1);
    const proxy = input.stationary && last?.binding === input.binding ? last.proxy : selected.proxy;
    if (last?.at !== input.now) {
      this.recorded.push({
        proxy,
        normalizedSide: selected.normalizedSide,
        binding: input.binding,
        instrument: input.instrument,
        at: input.now,
        distanceMm: proxy * input.focalPerWidth,
      });
    }
    while (this.recorded.length > MAX_FRAMES || (this.recorded.length && input.now - this.recorded[0].at > FRAME_WINDOW_MS)) this.recorded.shift();
    return [...this.recorded].sort((a, b) => a.proxy - b.proxy)[Math.floor(this.recorded.length / 2)];
  }

  /** Recorded frames, oldest first (for capturing near/far depth calibration points). */
  frames(): readonly SizeDepthFrame[] {
    return this.recorded;
  }
}

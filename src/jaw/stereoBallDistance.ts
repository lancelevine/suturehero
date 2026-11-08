import { triangulate, type StereoCalibration } from '../input/stereoGeometry';
import type { Pixel } from './jawGeometry';

/**
 * Jaw opening from the real 3D distance between the two jaw balls, measured
 * by triangulating each ball from both calibrated cameras. Independent of the
 * ring pose, the instrument's distance and its orientation.
 */

/** Two camera rays through the same ball must pass within this distance. */
export const MAX_RAY_GAP_MM = 3;
/** Plausible ball-to-ball distances on a needle driver or forceps. */
export const MIN_BALL_DISTANCE_MM = 3;
export const MAX_BALL_DISTANCE_MM = 60;
/** Balls must lie within this distance of the ring centre when it is known. */
export const MAX_BALL_TO_RING_MM = 120;

export interface Size {
  width: number;
  height: number;
}

export interface BallPair3D {
  distanceMm: number;
  points: [[number, number, number], [number, number, number]];
  /** Larger of the two rays' miss distances. */
  rayGapMm: number;
}

const distance3 = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Match ball candidates between cameras and return the two balls' 3D
 * distance. Every camera-1/camera-2 pairing is triangulated; pairings whose
 * rays do not meet are rejected, then the two non-conflicting matches with
 * the smallest ray gaps (and a plausible separation) are used.
 */
export function stereoBallPair(
  calibration: StereoCalibration,
  first: readonly Pixel[],
  second: readonly Pixel[],
  size1: Size,
  size2: Size,
  ringCenterMm?: readonly number[],
  range: { minMm: number; maxMm: number } = { minMm: MIN_BALL_DISTANCE_MM, maxMm: MAX_BALL_DISTANCE_MM },
): BallPair3D | null {
  const matches: Array<{ i: number; j: number; xyz: [number, number, number]; gap: number }> = [];
  first.forEach((a, i) =>
    second.forEach((b, j) => {
      const point = triangulate(calibration, a, b, size1, size2);
      if (!point || point.rayGapMm > MAX_RAY_GAP_MM) return;
      if (ringCenterMm && distance3(point.xyzMm, ringCenterMm) > MAX_BALL_TO_RING_MM) return;
      matches.push({ i, j, xyz: point.xyzMm, gap: point.rayGapMm });
    }),
  );
  let best: BallPair3D | null = null;
  let bestScore = Infinity;
  for (let a = 0; a < matches.length; a++) {
    for (let b = a + 1; b < matches.length; b++) {
      const m = matches[a];
      const n = matches[b];
      if (m.i === n.i || m.j === n.j) continue;
      const distanceMm = distance3(m.xyz, n.xyz);
      if (distanceMm < range.minMm || distanceMm > range.maxMm) continue;
      const score = m.gap + n.gap;
      if (score < bestScore) {
        bestScore = score;
        best = { distanceMm, points: [m.xyz, n.xyz], rayGapMm: Math.max(m.gap, n.gap) };
      }
    }
  }
  return best;
}

/** Margin around the calibrated ball spacing accepted at run time, mm. */
export const SPACING_MARGIN_MM = 5;

/** Accepted ball-to-ball distances, from the ring-frame ball positions (metric via the marker size). */
export function expectedSpacing(balls: ReadonlyArray<{ closed: { distanceTo(o: unknown): number }; open: { distanceTo(o: unknown): number } }>): { minMm: number; maxMm: number } | null {
  if (balls.length !== 2) return null;
  const closed = balls[0].closed.distanceTo(balls[1].closed);
  const open = balls[0].open.distanceTo(balls[1].open);
  return { minMm: Math.max(MIN_BALL_DISTANCE_MM, Math.min(closed, open) - SPACING_MARGIN_MM), maxMm: Math.min(MAX_BALL_DISTANCE_MM, Math.max(closed, open) + SPACING_MARGIN_MM) };
}

/** 0 closed … 1 open from a distance and the calibrated closed/open distances. */
export function openingFromDistance(distanceMm: number, closedMm: number, openMm: number): number {
  const span = openMm - closedMm;
  if (Math.abs(span) < 1e-6) return 0;
  return Math.min(1, Math.max(0, (distanceMm - closedMm) / span));
}

/** Median, robust to the occasional mismatched frame during calibration. */
export function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

/**
 * The two cameras are not synchronized (frames up to ~70 ms apart), so while
 * the instrument moves fast each ball is seen at a different moment and the
 * triangulated distance between them is wrong — closed jaws read as open.
 * Above this ring speed, in marker sides per second, jaw readings are held.
 */
export const MAX_JAW_MOTION_SIDES_PER_S = 3;

export interface RingSample {
  x: number;
  y: number;
  /** Mean marker side, px. */
  side: number;
  at: number;
}

/** Ring centre speed between two samples, in marker sides per second (0 without a usable earlier sample). */
export function ringSpeedSidesPerSecond(previous: RingSample | undefined, current: RingSample): number {
  if (!previous || current.at <= previous.at || current.side <= 0) return 0;
  const dt = (current.at - previous.at) / 1000;
  return Math.hypot(current.x - previous.x, current.y - previous.y) / current.side / dt;
}

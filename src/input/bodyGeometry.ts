import * as THREE from 'three';

/**
 * Geometry for marker-relative jaw tracking.
 *
 * "Body frame" is the instrument tracker's own frame, in millimetres, as
 * solved by `solvePrismPose` (camera frame: +X right, +Y down, +Z forward).
 * Ball positions are stored in the body frame, so they stay valid however
 * the instrument is held or how far it is from the camera.
 */

export interface BodyPose {
  quaternion: THREE.Quaternion;
  translation: THREE.Vector3;
}

export interface Intrinsics {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
}

export interface Pixel {
  x: number;
  y: number;
}

/**
 * The camera model assumed by the single-camera pose solver
 * (`solvePrismPose` / `estimateMarkerPose`), copied exactly. Jaw projection
 * must use the same focal length so ball positions agree with the solved
 * tracker pose.
 *
 * Note: those solvers compute `width / (2·tan(70·π/360/2))`, i.e. a 35°
 * horizontal field of view, although their comments say 70°. Changing it
 * would change instrument tracking, so it is matched here, not "fixed".
 */
export function defaultIntrinsics(width: number, height: number): Intrinsics {
  const fx = width / (2 * Math.tan((70 * Math.PI) / 360 / 2));
  return { fx, fy: fx, cx: width / 2, cy: height / 2 };
}

export interface Projection extends Pixel {
  /** Distance along the camera axis, mm. */
  depth: number;
}

/** Project a body-frame point (mm) into the image, or null if behind the camera. */
export function projectBodyPoint(pose: BodyPose, point: THREE.Vector3, k: Intrinsics): Projection | null {
  const camera = point.clone().applyQuaternion(pose.quaternion).add(pose.translation);
  if (camera.z <= 1) return null;
  return { x: (k.fx * camera.x) / camera.z + k.cx, y: (k.fy * camera.y) / camera.z + k.cy, depth: camera.z };
}

export interface Ray {
  origin: THREE.Vector3;
  /** Unit direction. */
  direction: THREE.Vector3;
}

/** The viewing ray through an image pixel, expressed in the body frame. */
export function bodyRay(pose: BodyPose, pixel: Pixel, k: Intrinsics): Ray {
  const inverse = pose.quaternion.clone().invert();
  const cameraDirection = new THREE.Vector3((pixel.x - k.cx) / k.fx, (pixel.y - k.cy) / k.fy, 1).normalize();
  return {
    origin: pose.translation.clone().negate().applyQuaternion(inverse),
    direction: cameraDirection.applyQuaternion(inverse).normalize(),
  };
}

export interface RayFit {
  point: THREE.Vector3;
  /** Root-mean-square distance from the point to the rays, mm. */
  rmsMm: number;
}

function solve3(m: number[][], b: number[]): number[] | null {
  const a = m.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let row = 0; row < 3; row++) {
      if (row === col) continue;
      const factor = a[row][col] / a[col][col];
      for (let k = col; k < 4; k++) a[row][k] -= factor * a[col][k];
    }
  }
  return [a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2]];
}

/**
 * The point closest (least squares) to a set of rays.
 *
 * With little viewpoint change the rays are nearly parallel and depth along
 * them is poorly determined. `prior` (with a small `priorWeight`) then pulls
 * the answer towards a sensible point, typically at the tracker's depth.
 */
export function nearestPointToRays(rays: Ray[], prior?: THREE.Vector3, priorWeight = 0): RayFit | null {
  if (!rays.length) return null;
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const b = [0, 0, 0];
  for (const { origin, direction: d } of rays) {
    const dir = [d.x, d.y, d.z];
    const o = [origin.x, origin.y, origin.z];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const value = (i === j ? 1 : 0) - dir[i] * dir[j];
        m[i][j] += value;
        b[i] += value * o[j];
      }
    }
  }
  if (prior && priorWeight > 0) {
    const p = [prior.x, prior.y, prior.z];
    for (let i = 0; i < 3; i++) {
      m[i][i] += priorWeight;
      b[i] += priorWeight * p[i];
    }
  }
  const solution = solve3(m, b);
  if (!solution) return null;
  const point = new THREE.Vector3(...solution);
  let squared = 0;
  for (const { origin, direction } of rays) {
    const offset = point.clone().sub(origin);
    squared += offset.sub(direction.clone().multiplyScalar(offset.dot(direction))).lengthSq();
  }
  return { point, rmsMm: Math.sqrt(squared / rays.length) };
}

export interface PathPosition {
  /** 0 at `from`, 1 at `to`; not clamped. */
  fraction: number;
  /** Perpendicular distance from the path line, px. */
  offsetPx: number;
  /** Length of the path, px. */
  lengthPx: number;
}

/** Where a pixel lies along the straight path from `from` to `to`. */
export function pathPosition(point: Pixel, from: Pixel, to: Pixel): PathPosition {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthPx = Math.hypot(dx, dy);
  if (lengthPx < 1e-9) return { fraction: 0, offsetPx: Math.hypot(point.x - from.x, point.y - from.y), lengthPx: 0 };
  const px = point.x - from.x;
  const py = point.y - from.y;
  return {
    fraction: (px * dx + py * dy) / (lengthPx * lengthPx),
    offsetPx: Math.abs(px * dy - py * dx) / lengthPx,
    lengthPx,
  };
}

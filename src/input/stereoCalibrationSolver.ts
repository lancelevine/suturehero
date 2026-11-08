/**
 * In-app stereo calibration from checkerboard corner pairs (replaces the
 * Python script for normal use: scripts/validate_stereo_calibration.py).
 *
 * Same method and validation gates as that script:
 *  1. Each camera alone: Zhang's closed-form intrinsics from board
 *     homographies, then Levenberg–Marquardt refinement of fx, fy, cx, cy,
 *     k1, k2, p1, p2 (k3 fixed at 0, like CALIB_FIX_K3) and every board pose.
 *  2. Camera 2's board poses for both corner orders (a symmetric board can be
 *     detected reversed), keeping the order consistent across views.
 *  3. Joint refinement of camera 2's rotation/translation relative to
 *     camera 1 and every board pose, with intrinsics fixed (like
 *     stereoCalibrate with CALIB_FIX_INTRINSIC).
 *  4. Validation: stereo RMS < 2 px, epipolar P95 < 2 px, worst view < 4 px,
 *     plausible baseline, sane intrinsics, enough board tilt.
 *
 * Pure TypeScript (no OpenCV) so it is unit-tested against synthetic data.
 * Convention as everywhere in SutureHero: X2 = R · X1 + T, millimetres.
 */

export type Pixel = { x: number; y: number };
type Vec3 = [number, number, number];
type Mat3 = number[]; // row-major 3×3
/** fx, fy, cx, cy, k1, k2, p1, p2 */
type Intrinsics = number[];
/** rotation vector (Rodrigues) then translation, mm */
type Pose = number[];

export interface BoardSpec {
  innerCornersX: number;
  innerCornersY: number;
  squareSizeMm: number;
}

export interface CornerPair {
  first: Pixel[];
  second: Pixel[];
}

export interface StereoSolveResult {
  calibration: Record<string, unknown>;
  summary: { pairsUsed: number; monoRmsPx: [number, number]; stereoRmsPx: number; epipolarP95Px: number; worstViewPx: number; baselineMm: number };
}

/** Validation gates (same as the Python solver). */
export const MIN_PAIRS = 12;
export const MAX_RMS_PX = 2;
export const MAX_EPIPOLAR_P95_PX = 2;
export const MAX_VIEW_RMS_PX = 4;

// --- Small linear algebra -----------------------------------------------------

const mul3 = (a: Mat3, b: Mat3): Mat3 => {
  const r = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return r;
};
const transpose3 = (a: Mat3): Mat3 => [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
const apply3 = (m: Mat3, v: Vec3): Vec3 => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);

/** Rotation matrix from a rotation vector. */
export function rodrigues(r: number[]): Mat3 {
  const theta = Math.hypot(r[0], r[1], r[2]);
  if (theta < 1e-12) return [1, -r[2], r[1], r[2], 1, -r[0], -r[1], r[0], 1];
  const [x, y, z] = [r[0] / theta, r[1] / theta, r[2] / theta];
  const c = Math.cos(theta), s = Math.sin(theta), C = 1 - c;
  return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C];
}

/** Rotation vector from a (near-)rotation matrix. */
export function rotationVector(m: Mat3): Vec3 {
  const ortho = orthonormalize(m);
  const cos = Math.max(-1, Math.min(1, (ortho[0] + ortho[4] + ortho[8] - 1) / 2));
  const theta = Math.acos(cos);
  if (theta < 1e-9) return [0, 0, 0];
  if (Math.PI - theta < 1e-6) {
    // Near 180°: axis from the largest diagonal entry.
    const xx = Math.sqrt(Math.max(0, (ortho[0] + 1) / 2)), yy = Math.sqrt(Math.max(0, (ortho[4] + 1) / 2)), zz = Math.sqrt(Math.max(0, (ortho[8] + 1) / 2));
    let axis: Vec3 = [xx, Math.sign(ortho[1] || 1) * yy, Math.sign(ortho[2] || 1) * zz];
    if (yy >= xx && yy >= zz) axis = [Math.sign(ortho[1] || 1) * xx, yy, Math.sign(ortho[5] || 1) * zz];
    if (zz >= xx && zz >= yy) axis = [Math.sign(ortho[2] || 1) * xx, Math.sign(ortho[5] || 1) * yy, zz];
    const n = norm(axis);
    return [(axis[0] / n) * theta, (axis[1] / n) * theta, (axis[2] / n) * theta];
  }
  const k = theta / (2 * Math.sin(theta));
  return [(ortho[7] - ortho[5]) * k, (ortho[2] - ortho[6]) * k, (ortho[3] - ortho[1]) * k];
}

/** Nearest rotation (Gram–Schmidt on the columns, then re-orthogonalised). */
function orthonormalize(m: Mat3): Mat3 {
  let a: Vec3 = [m[0], m[3], m[6]];
  let b: Vec3 = [m[1], m[4], m[7]];
  const na = norm(a);
  a = [a[0] / na, a[1] / na, a[2] / na];
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  b = [b[0] - d * a[0], b[1] - d * a[1], b[2] - d * a[2]];
  const nb = norm(b);
  b = [b[0] / nb, b[1] / nb, b[2] / nb];
  const c = cross(a, b);
  return [a[0], b[0], c[0], a[1], b[1], c[1], a[2], b[2], c[2]];
}

/** Eigenvector of the smallest eigenvalue of a symmetric matrix (cyclic Jacobi). */
function smallestEigenvector(input: number[][]): number[] {
  const n = input.length;
  const a = input.map((row) => [...row]);
  const v: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    if (off < 1e-22) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(a[p][q]) < 1e-300) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) {
        const akp = a[k][p], akq = a[k][q];
        a[k][p] = c * akp - s * akq;
        a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < n; k++) {
        const apk = a[p][k], aqk = a[q][k];
        a[p][k] = c * apk - s * aqk;
        a[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < n; k++) {
        const vkp = v[k][p], vkq = v[k][q];
        v[k][p] = c * vkp - s * vkq;
        v[k][q] = s * vkp + c * vkq;
      }
    }
  }
  let best = 0;
  for (let i = 1; i < n; i++) if (a[i][i] < a[best][best]) best = i;
  return v.map((row) => row[best]);
}

/** Solve a symmetric positive-definite system (Cholesky); null if not positive definite. */
function solveSPD(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const L = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = a[i][j];
      for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
      if (i === j) {
        if (sum <= 0) return null;
        L[i][i] = Math.sqrt(sum);
      } else L[i][j] = sum / L[j][j];
    }
  }
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = b[i];
    for (let k = 0; k < i; k++) sum -= L[i][k] * y[k];
    y[i] = sum / L[i][i];
  }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let k = i + 1; k < n; k++) sum -= L[k][i] * x[k];
    x[i] = sum / L[i][i];
  }
  return x;
}

// --- Camera model (OpenCV pinhole + k1, k2, p1, p2) ---------------------------

export function projectPoint(k: Intrinsics, pose: Pose, point: Vec3): Pixel {
  const r = rodrigues(pose);
  const c = apply3(r, point);
  return distortAndScale(k, [c[0] + pose[3], c[1] + pose[4], c[2] + pose[5]]);
}

function distortAndScale(k: Intrinsics, c: Vec3): Pixel {
  const x = c[0] / c[2], y = c[1] / c[2];
  const [fx, fy, cx, cy, k1, k2, p1, p2] = k;
  const r2 = x * x + y * y, radial = 1 + k1 * r2 + k2 * r2 * r2;
  const xd = x * radial + 2 * p1 * x * y + p2 * (r2 + 2 * x * x);
  const yd = y * radial + p1 * (r2 + 2 * y * y) + 2 * p2 * x * y;
  return { x: fx * xd + cx, y: fy * yd + cy };
}

/** Undistorted normalised coordinates of a pixel (iterative inverse, as OpenCV). */
function undistortNormalized(k: Intrinsics, p: Pixel): [number, number] {
  const [fx, fy, cx, cy, k1, k2, p1, p2] = k;
  const xd = (p.x - cx) / fx, yd = (p.y - cy) / fy;
  let x = xd, y = yd;
  for (let i = 0; i < 20; i++) {
    const r2 = x * x + y * y, radial = 1 + k1 * r2 + k2 * r2 * r2;
    const dx = 2 * p1 * x * y + p2 * (r2 + 2 * x * x), dy = p1 * (r2 + 2 * y * y) + 2 * p2 * x * y;
    x = (xd - dx) / radial;
    y = (yd - dy) / radial;
  }
  return [x, y];
}

// --- Board geometry, homographies, Zhang initialisation -----------------------

/** Board corner positions (mm, z = 0) in OpenCV's corner order: x varies fastest. */
export function boardPoints(board: BoardSpec): Vec3[] {
  return Array.from({ length: board.innerCornersX * board.innerCornersY }, (_, i) => [(i % board.innerCornersX) * board.squareSizeMm, Math.floor(i / board.innerCornersX) * board.squareSizeMm, 0] as Vec3);
}

/** Normalised DLT homography mapping board (x, y) to image pixels. */
function homography(object: Vec3[], image: Pixel[]): Mat3 {
  const normalizer = (pts: Array<[number, number]>) => {
    const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const d = pts.reduce((s, p) => s + Math.hypot(p[0] - mx, p[1] - my), 0) / pts.length || 1;
    const s = Math.SQRT2 / d;
    return [s, 0, -s * mx, 0, s, -s * my, 0, 0, 1];
  };
  const src = object.map((p) => [p[0], p[1]] as [number, number]);
  const dst = image.map((p) => [p.x, p.y] as [number, number]);
  const Ts = normalizer(src), Td = normalizer(dst);
  const A: number[][] = Array.from({ length: 9 }, () => new Array(9).fill(0));
  for (let i = 0; i < src.length; i++) {
    const [x, y] = [Ts[0] * src[i][0] + Ts[2], Ts[4] * src[i][1] + Ts[5]];
    const [u, v] = [Td[0] * dst[i][0] + Td[2], Td[4] * dst[i][1] + Td[5]];
    const rows = [
      [-x, -y, -1, 0, 0, 0, u * x, u * y, u],
      [0, 0, 0, -x, -y, -1, v * x, v * y, v],
    ];
    for (const row of rows) for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) A[r][c] += row[r] * row[c];
  }
  const h = smallestEigenvector(A);
  const Hn = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], h[8]];
  // Undo the normalisation: H = Td⁻¹ · Hn · Ts.
  const TdInv = [1 / Td[0], 0, -Td[2] / Td[0], 0, 1 / Td[4], -Td[5] / Td[4], 0, 0, 1];
  const H = mul3(mul3(TdInv, Hn), Ts);
  return H.map((value) => value / H[8]);
}

/** Zhang's closed-form intrinsics (zero skew) from several homographies; null if degenerate. */
function zhangIntrinsics(homographies: Mat3[]): number[] | null {
  const vij = (H: Mat3, i: number, j: number) => {
    const hi = [H[i], H[3 + i], H[6 + i]], hj = [H[j], H[3 + j], H[6 + j]];
    return [hi[0] * hj[0], hi[0] * hj[1] + hi[1] * hj[0], hi[1] * hj[1], hi[2] * hj[0] + hi[0] * hj[2], hi[2] * hj[1] + hi[1] * hj[2], hi[2] * hj[2]];
  };
  const V: number[][] = Array.from({ length: 6 }, () => new Array(6).fill(0));
  const add = (row: number[]) => { for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) V[r][c] += row[r] * row[c]; };
  for (const H of homographies) {
    // Scale-normalise for numerical balance.
    const s = Math.hypot(H[0], H[3], H[6]) || 1;
    const Hs = H.map((v) => v / s);
    const v12 = vij(Hs, 0, 1), v11 = vij(Hs, 0, 0), v22 = vij(Hs, 1, 1);
    add(v12);
    add(v11.map((v, i) => v - v22[i]));
  }
  let [B11, B12, B22, B13, B23, B33] = smallestEigenvector(V);
  if (B11 < 0) [B11, B12, B22, B13, B23, B33] = [-B11, -B12, -B22, -B13, -B23, -B33];
  const den = B11 * B22 - B12 * B12;
  if (!(den > 0) || !(B11 > 0)) return null;
  const v0 = (B12 * B13 - B11 * B23) / den;
  const lambda = B33 - (B13 * B13 + v0 * (B12 * B13 - B11 * B23)) / B11;
  if (!(lambda / B11 > 0)) return null;
  const alpha = Math.sqrt(lambda / B11), beta = Math.sqrt((lambda * B11) / den);
  const u0 = (-B13 * alpha * alpha) / lambda;
  return [alpha, beta, u0, v0].every(Number.isFinite) ? [alpha, beta, u0, v0] : null;
}

/** Board pose (rotation vector + translation) from a homography and intrinsics. */
function poseFromHomography(H: Mat3, k: Intrinsics): Pose {
  const [fx, fy, cx, cy] = k;
  const Kinv = [1 / fx, 0, -cx / fx, 0, 1 / fy, -cy / fy, 0, 0, 1];
  const col = (j: number): Vec3 => apply3(Kinv, [H[j], H[3 + j], H[6 + j]]);
  let r1 = col(0), r2 = col(1), t = col(2);
  let lambda = 1 / norm(r1);
  if (t[2] * lambda < 0) lambda = -lambda; // board in front of the camera
  r1 = r1.map((v) => v * lambda) as Vec3;
  r2 = r2.map((v) => v * lambda) as Vec3;
  t = t.map((v) => v * lambda) as Vec3;
  const r3 = cross(r1, r2);
  const R = [r1[0], r2[0], r3[0], r1[1], r2[1], r3[1], r1[2], r2[2], r3[2]];
  return [...rotationVector(R), ...t];
}

// --- Levenberg–Marquardt over shared + per-view parameters --------------------

type ViewResiduals = (shared: number[], view: number[], index: number) => number[];

/**
 * Minimise Σ‖r_i(shared, view_i)‖² with dense normal equations (sizes here are
 * small: ≤ 8 shared + 6 per view, ≤ 40 views) and forward-difference Jacobians.
 */
function levenbergMarquardt(shared: number[], views: number[][], residuals: ViewResiduals, steps: { shared: number[]; view: number[] }, iterations = 60) {
  const S = shared.length, P = views[0]?.length ?? 0, N = S + P * views.length;
  let cost = 0;
  const totalCost = (s: number[], v: number[][]) => v.reduce((sum, view, i) => sum + residuals(s, view, i).reduce((a, r) => a + r * r, 0), 0);
  cost = totalCost(shared, views);
  let lambda = 1e-3;
  for (let iteration = 0; iteration < iterations; iteration++) {
    const A: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
    const g = new Array<number>(N).fill(0);
    for (let i = 0; i < views.length; i++) {
      const r0 = residuals(shared, views[i], i);
      const columns: Array<{ index: number; d: number[] }> = [];
      for (let p = 0; p < S; p++) {
        const s = [...shared];
        s[p] += steps.shared[p];
        const r = residuals(s, views[i], i);
        columns.push({ index: p, d: r.map((v, k) => (v - r0[k]) / steps.shared[p]) });
      }
      for (let p = 0; p < P; p++) {
        const v = [...views[i]];
        v[p] += steps.view[p];
        const r = residuals(shared, v, i);
        columns.push({ index: S + i * P + p, d: r.map((value, k) => (value - r0[k]) / steps.view[p]) });
      }
      for (const a of columns) {
        let gr = 0;
        for (let k = 0; k < r0.length; k++) gr += a.d[k] * r0[k];
        g[a.index] += gr;
        for (const b of columns) {
          if (b.index < a.index) continue;
          let dot = 0;
          for (let k = 0; k < r0.length; k++) dot += a.d[k] * b.d[k];
          A[a.index][b.index] += dot;
          if (a.index !== b.index) A[b.index][a.index] += dot;
        }
      }
    }
    let improved = false;
    for (let attempt = 0; attempt < 8 && !improved; attempt++) {
      const damped = A.map((row, r) => row.map((v, c) => (r === c ? v * (1 + lambda) + 1e-12 : v)));
      const delta = solveSPD(damped, g.map((v) => -v));
      if (!delta) {
        lambda *= 10;
        continue;
      }
      const s = shared.map((v, p) => v + delta[p]);
      const v = views.map((view, i) => view.map((value, p) => value + delta[S + i * P + p]));
      const next = totalCost(s, v);
      if (Number.isFinite(next) && next < cost) {
        const relative = (cost - next) / Math.max(cost, 1e-12);
        shared = s;
        views = v;
        cost = next;
        lambda = Math.max(1e-9, lambda / 3);
        improved = true;
        if (relative < 1e-10) return { shared, views, cost };
      } else lambda *= 10;
    }
    if (!improved) break;
  }
  return { shared, views, cost };
}

const INTRINSIC_STEPS = [1e-3, 1e-3, 1e-3, 1e-3, 1e-7, 1e-7, 1e-8, 1e-8];
const POSE_STEPS = [1e-7, 1e-7, 1e-7, 1e-5, 1e-5, 1e-5];

const viewRms = (residual: number[]) => Math.sqrt(residual.reduce((s, r) => s + r * r, 0) / (residual.length / 2));

// --- Single camera ------------------------------------------------------------

export interface MonoCalibration {
  intrinsics: Intrinsics;
  poses: Pose[];
  rmsPx: number;
}

/** Calibrate one camera from board views (each a full set of corners in board order). */
export function calibrateCamera(board: BoardSpec, views: Pixel[][], size: { width: number; height: number }): MonoCalibration {
  const object = boardPoints(board);
  const homographies = views.map((image) => homography(object, image));
  const closed = zhangIntrinsics(homographies);
  const guess = closed && closed[0] > 0.3 * size.width && closed[0] < 5 * size.width && closed[1] > 0.3 * size.height && closed[1] < 5 * size.height
    ? closed
    : [size.width * 0.9, size.width * 0.9, size.width / 2, size.height / 2];
  let intrinsics: Intrinsics = [...guess, 0, 0, 0, 0];
  const poses = homographies.map((H) => poseFromHomography(H, intrinsics));
  const residual: ViewResiduals = (k, pose, i) => {
    const out: number[] = [];
    for (let j = 0; j < object.length; j++) {
      const p = projectPoint(k, pose, object[j]);
      out.push(p.x - views[i][j].x, p.y - views[i][j].y);
    }
    return out;
  };
  const result = levenbergMarquardt(intrinsics, poses, residual, { shared: INTRINSIC_STEPS, view: POSE_STEPS });
  intrinsics = result.shared;
  const all = result.views.flatMap((pose, i) => residual(intrinsics, pose, i));
  return { intrinsics, poses: result.views, rmsPx: viewRms(all) };
}

/** One board pose for fixed intrinsics (used for camera 2's reversed-corner hypothesis). */
function boardPose(board: BoardSpec, k: Intrinsics, image: Pixel[]): Pose {
  const object = boardPoints(board);
  const start = poseFromHomography(homography(object, image), k);
  const residual: ViewResiduals = (_shared, pose) => {
    const out: number[] = [];
    for (let j = 0; j < object.length; j++) {
      const p = projectPoint(k, pose, object[j]);
      out.push(p.x - image[j].x, p.y - image[j].y);
    }
    return out;
  };
  return levenbergMarquardt([], [start], residual, { shared: [], view: POSE_STEPS }, 30).views[0];
}

// --- Stereo -------------------------------------------------------------------

const relative = (pose1: Pose, pose2: Pose) => {
  const R1 = rodrigues(pose1), R2 = rodrigues(pose2);
  const R = mul3(R2, transpose3(R1));
  const t1: Vec3 = [pose1[3], pose1[4], pose1[5]];
  const Rt1 = apply3(R, t1);
  return { R, T: [pose2[3] - Rt1[0], pose2[4] - Rt1[1], pose2[5] - Rt1[2]] as Vec3 };
};
const rotationAngle = (a: Mat3, b: Mat3) => Math.acos(Math.max(-1, Math.min(1, (mul3(a, transpose3(b)).reduce((s, v, i) => s + (i % 4 === 0 ? v : 0), 0) - 1) / 2)));

/** Full stereo calibration from corner pairs, or an error explaining which gate failed. */
export function solveStereoCalibration(
  board: BoardSpec,
  pairs: CornerPair[],
  sizes: [{ width: number; height: number }, { width: number; height: number }],
  cameraIds?: { first: string; second: string },
): StereoSolveResult | { error: string } {
  const count = board.innerCornersX * board.innerCornersY;
  const usable = pairs.filter((p) => p.first.length === count && p.second.length === count);
  if (usable.length < MIN_PAIRS) return { error: `At least ${MIN_PAIRS} board pairs are needed (have ${usable.length}); capture about 20 varied poses.` };
  const first = usable.map((p) => p.first), second = usable.map((p) => p.second);
  const mono = [calibrateCamera(board, first, sizes[0]), calibrateCamera(board, second, sizes[1])];
  for (const [index, m] of mono.entries()) {
    const [fx, fy, cx, cy] = m.intrinsics, size = sizes[index];
    const sane = m.intrinsics.every(Number.isFinite) && fx > 0.3 * size.width && fx < 5 * size.width && fy > 0.3 * size.height && fy < 5 * size.height && cx > 0 && cx < size.width && cy > 0 && cy < size.height && fx / fy > 0.75 && fx / fy < 1.25;
    if (!sane || !(m.rmsPx < MAX_RMS_PX)) return { error: `Camera ${index + 1} intrinsics are unreliable (RMS ${m.rmsPx.toFixed(2)} px); use sharper, more varied board poses.` };
  }
  // Tilt diversity (board normals in camera 1).
  const normals = mono[0].poses.map((pose) => { const R = rodrigues(pose); return [R[2], R[5], R[8]]; });
  const spread = [0, 1, 2].map((axis) => {
    const values = normals.map((n) => n[axis]), mean = values.reduce((s, v) => s + v, 0) / values.length;
    return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  }).sort((a, b) => a - b);
  if (spread[2] < 0.08 || spread[1] < 0.03) return { error: 'Not enough board tilt variety; tilt the board around both horizontal and vertical axes.' };

  // Camera 2 poses for both corner orders; keep the order consistent with a seed.
  const candidates = usable.map((_, i) => [second[i], [...second[i]].reverse()].map((points) => {
    const pose2 = boardPose(board, mono[1].intrinsics, points);
    return { ...relative(mono[0].poses[i], pose2), points };
  }));
  const cost = (a: { R: Mat3; T: Vec3 }, b: { R: Mat3; T: Vec3 }) => (rotationAngle(a.R, b.R) / 0.08) ** 2 + (norm([a.T[0] - b.T[0], a.T[1] - b.T[1], a.T[2] - b.T[2]]) / 40) ** 2;
  const all = candidates.flat();
  const seed = all.reduce((best, c) => {
    const score = candidates.reduce((s, pair) => s + Math.min(25, Math.min(...pair.map((p) => cost(c, p)))), 0);
    return score < best.score ? { c, score } : best;
  }, { c: all[0], score: Infinity }).c;
  const aligned = candidates.map((pair) => pair.reduce((a, b) => (cost(seed, a) <= cost(seed, b) ? a : b)).points);

  // Joint refinement: shared = camera 2 extrinsics; per view = board pose in camera 1.
  const object = boardPoints(board);
  const [k1, k2] = [mono[0].intrinsics, mono[1].intrinsics];
  const stereoResidual: ViewResiduals = (extrinsics, pose, i) => {
    const R = rodrigues(extrinsics), Rb = rodrigues(pose), out: number[] = [];
    for (let j = 0; j < object.length; j++) {
      const c1 = apply3(Rb, object[j]);
      const X1: Vec3 = [c1[0] + pose[3], c1[1] + pose[4], c1[2] + pose[5]];
      const a = distortAndScale(k1, X1);
      const c2 = apply3(R, X1);
      const b = distortAndScale(k2, [c2[0] + extrinsics[3], c2[1] + extrinsics[4], c2[2] + extrinsics[5]]);
      out.push(a.x - first[i][j].x, a.y - first[i][j].y, b.x - aligned[i][j].x, b.y - aligned[i][j].y);
    }
    return out;
  };
  const start = [...rotationVector(seed.R), ...seed.T];
  const refined = levenbergMarquardt(start, mono[0].poses, stereoResidual, { shared: POSE_STEPS, view: POSE_STEPS });
  const extrinsics = refined.shared;
  const R = rodrigues(extrinsics), T: Vec3 = [extrinsics[3], extrinsics[4], extrinsics[5]];
  const perView = refined.views.map((pose, i) => stereoResidual(extrinsics, pose, i));
  const stereoRms = viewRms(perView.flat());
  const worstView = Math.max(...perView.map((r) => {
    // Camera 2 part of the residual, as the Python per-view check.
    const second2 = r.filter((_, k) => k % 4 >= 2);
    return viewRms(second2);
  }));
  // Epipolar distances of undistorted points (pixels in camera 2).
  const tx = [0, -T[2], T[1], T[2], 0, -T[0], -T[1], T[0], 0];
  const E = mul3(tx, R);
  const epipolar: number[] = [];
  for (let i = 0; i < first.length; i++) for (let j = 0; j < object.length; j++) {
    const [x1, y1] = undistortNormalized(k1, first[i][j]);
    const [x2, y2] = undistortNormalized(k2, aligned[i][j]);
    const l = apply3(E, [x1, y1, 1]);
    // Distance in normalised units, converted to pixels with camera 2's focal length.
    epipolar.push((Math.abs(l[0] * x2 + l[1] * y2 + l[2]) / Math.hypot(l[0], l[1])) * (k2[0] + k2[1]) / 2);
  }
  epipolar.sort((a, b) => a - b);
  const epipolarP95 = epipolar[Math.min(epipolar.length - 1, Math.ceil(0.95 * epipolar.length) - 1)];
  const baseline = norm(T);
  if (!(stereoRms < MAX_RMS_PX && baseline > 10 && baseline < 2000 && epipolarP95 < MAX_EPIPOLAR_P95_PX && worstView < MAX_VIEW_RMS_PX)) {
    return { error: `Stereo validation failed: RMS ${stereoRms.toFixed(2)} px, epipolar P95 ${epipolarP95.toFixed(2)} px, baseline ${baseline.toFixed(1)} mm, worst view ${worstView.toFixed(2)} px. Keep both cameras fixed and recapture.` };
  }
  const camera = (k: Intrinsics, size: { width: number; height: number }) => ({
    cameraMatrix: [[k[0], 0, k[2]], [0, k[1], k[3]], [0, 0, 1]],
    distortionCoefficients: [k[4], k[5], k[6], k[7], 0],
    imageSize: size,
  });
  const calibration: Record<string, unknown> = {
    format: 'suturehero-stereo-calibration-v1',
    imageSize: sizes[0],
    camera1: camera(k1, sizes[0]),
    camera2: camera(k2, sizes[1]),
    stereo: { rotation: [R.slice(0, 3), R.slice(3, 6), R.slice(6, 9)], translationMm: T, baselineMm: baseline, rmsPx: stereoRms },
    board,
    validation: { accepted: true, solver: 'in-app (src/input/stereoCalibrationSolver.ts)', pairsUsed: usable.length, monocularRmsPx: mono.map((m) => m.rmsPx), epipolarP95Px: epipolarP95, worstViewPx: worstView },
  };
  if (cameraIds) calibration.cameraIds = cameraIds;
  return { calibration, summary: { pairsUsed: usable.length, monoRmsPx: [mono[0].rmsPx, mono[1].rmsPx], stereoRmsPx: stereoRms, epipolarP95Px: epipolarP95, worstViewPx: worstView, baselineMm: baseline } };
}

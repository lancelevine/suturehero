import { describe, expect, it } from 'vitest';
import { boardPoints, calibrateCamera, projectPoint, rodrigues, rotationVector, solveStereoCalibration, type Pixel } from './stereoCalibrationSolver';

const board = { innerCornersX: 8, innerCornersY: 6, squareSizeMm: 16 };
const size = { width: 1920, height: 1080 };
const K1 = [1400, 1395, 965, 548, -0.11, 0.06, 0.0012, -0.0006];
const K2 = [1385, 1380, 950, 532, -0.08, 0.03, -0.0008, 0.0004];
/** Camera 2 extrinsics: X2 = R·X1 + T (15° about y, 283 mm baseline). */
const extrinsics = [0, (15 * Math.PI) / 180, 0.02, -283, 6, 24];
let seed = 12345;
const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const gaussian = () => Math.sqrt(-2 * Math.log(random() + 1e-12)) * Math.cos(2 * Math.PI * random());

function scene(noise: number) {
  const object = boardPoints(board);
  const pairs: { first: Pixel[]; second: Pixel[] }[] = [];
  for (let i = 0; i < 20; i++) {
    const tilt = [(-0.45 + (i % 5) * 0.22), (-0.4 + Math.floor(i / 5) * 0.27), (i % 3) * 0.2 - 0.2];
    const pose1 = [...tilt, -60 + (i % 5) * 18 - 56, -40 + Math.floor(i / 5) * 12 - 40, 520 + (i % 4) * 60];
    const R2 = rodrigues(extrinsics);
    const Rb = rodrigues(pose1);
    // Board pose in camera 2: R2·Rb, R2·t + T.
    const Rc = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => R2[r * 3] * Rb[c] + R2[r * 3 + 1] * Rb[3 + c] + R2[r * 3 + 2] * Rb[6 + c]));
    const t = [pose1[3], pose1[4], pose1[5]];
    const t2 = [0, 1, 2].map((r) => R2[r * 3] * t[0] + R2[r * 3 + 1] * t[1] + R2[r * 3 + 2] * t[2] + extrinsics[3 + r]);
    const pose2 = [...rotationVector(Rc), ...t2];
    const noisy = (p: Pixel) => ({ x: p.x + noise * gaussian(), y: p.y + noise * gaussian() });
    const first = object.map((X) => noisy(projectPoint(K1, pose1, X)));
    let second = object.map((X) => noisy(projectPoint(K2, pose2, X)));
    if (i % 4 === 1) second = [...second].reverse(); // symmetric board detected in reverse order
    pairs.push({ first, second });
  }
  return pairs;
}

describe('in-app stereo calibration', () => {
  it('recovers one camera’s intrinsics and distortion', () => {
    const views = scene(0.1).map((p) => p.first);
    const mono = calibrateCamera(board, views, size);
    expect(mono.rmsPx).toBeLessThan(0.2);
    expect(Math.abs(mono.intrinsics[0] - K1[0])).toBeLessThan(8);
    expect(Math.abs(mono.intrinsics[2] - K1[2])).toBeLessThan(8);
    expect(Math.abs(mono.intrinsics[4] - K1[4])).toBeLessThan(0.02);
  });

  it('recovers the stereo extrinsics despite reversed corner orders, and passes validation', () => {
    const result = solveStereoCalibration(board, scene(0.15), [size, size], { first: 'a', second: 'b' });
    if ('error' in result) throw new Error(result.error);
    const stereo = result.calibration.stereo as { rotation: number[][]; translationMm: number[]; baselineMm: number };
    const truth = rodrigues(extrinsics);
    const R = stereo.rotation.flat();
    const angle = Math.acos(Math.min(1, ([0, 1, 2].reduce((s, i) => s + [0, 1, 2].reduce((a, k) => a + R[i * 3 + k] * truth[i * 3 + k], 0), 0) - 1) / 2));
    // The fit reaches the noise floor (RMS ≈ 0.15 px × √2); what remains is how well 20 board views pin
    // down each lens centre and distortion (~5–7 px here), which limits rotation to a few tenths of a degree.
    expect((angle * 180) / Math.PI).toBeLessThan(0.5);
    expect(Math.hypot(...stereo.translationMm.map((v, i) => v - extrinsics[3 + i]))).toBeLessThan(3);
    expect(result.summary.stereoRmsPx).toBeLessThan(0.3);
    expect(result.summary.epipolarP95Px).toBeLessThan(0.5);
    expect(result.calibration.format).toBe('suturehero-stereo-calibration-v1');
  });

  it('refuses too few pairs and a poor fit', () => {
    expect(solveStereoCalibration(board, scene(0.1).slice(0, 5), [size, size])).toHaveProperty('error');
    expect(solveStereoCalibration(board, scene(4), [size, size])).toHaveProperty('error');
  });
});

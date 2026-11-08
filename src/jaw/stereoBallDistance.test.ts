import { describe, expect, it } from 'vitest';
import type { StereoCalibration } from '../input/stereoGeometry';
import { expectedSpacing, median, openingFromDistance, stereoBallPair } from './stereoBallDistance';

// Two pinhole cameras 100 mm apart, camera 2 turned 20° toward camera 1.
const angle = (-20 * Math.PI) / 180;
const R = [[Math.cos(angle), 0, Math.sin(angle)], [0, 1, 0], [-Math.sin(angle), 0, Math.cos(angle)]];
const cam = { cameraMatrix: [[800, 0, 480], [0, 800, 270], [0, 0, 1]], distortionCoefficients: [0, 0, 0, 0, 0] };
const cal: StereoCalibration = { format: 'suturehero-stereo-calibration-v1', imageSize: { width: 960, height: 540 }, camera1: cam, camera2: cam, stereo: { rotation: R, translationMm: [-100, 0, 0] } };
const size = { width: 960, height: 540 };
const project = (p: number[], second: boolean) => {
  const q = second ? R.map((row, i) => row[0] * p[0] + row[1] * p[1] + row[2] * p[2] + cal.stereo.translationMm[i]) : p;
  return { x: (800 * q[0]) / q[2] + 480, y: (800 * q[1]) / q[2] + 270 };
};

describe('stereo ball distance', () => {
  const a = [10, 5, 300];
  const b = [22, 9, 305]; // ~13.6 mm from a
  const truth = Math.hypot(12, 4, 5);

  it('measures the 3D distance between the balls, whatever order they were found in', () => {
    const pair = stereoBallPair(cal, [project(a, false), project(b, false)], [project(b, true), project(a, true)], size, size)!;
    expect(pair).not.toBeNull();
    expect(pair.distanceMm).toBeCloseTo(truth, 3);
  });

  it('ignores a bright spot seen by only one camera', () => {
    const decoy = { x: 700, y: 100 };
    const pair = stereoBallPair(cal, [decoy, project(a, false), project(b, false)], [project(a, true), project(b, true)], size, size)!;
    expect(pair.distanceMm).toBeCloseTo(truth, 3);
  });

  it('needs both balls in both cameras', () => {
    expect(stereoBallPair(cal, [project(a, false)], [project(a, true), project(b, true)], size, size)).toBeNull();
  });

  it('maps distance to opening and takes robust medians', () => {
    expect(openingFromDistance(15, 10, 20)).toBe(0.5);
    expect(openingFromDistance(5, 10, 20)).toBe(0);
    expect(openingFromDistance(25, 10, 20)).toBe(1);
    expect(median([3, 100, 4, 5, 4])).toBe(4);
    expect(median([])).toBeNull();
  });
});

describe('expected spacing', () => {
  it('rejects pairs far from the calibrated ball spacing', async () => {
    const THREE = await import('three');
    const v = (x: number) => new THREE.Vector3(x, 0, 0);
    expect(expectedSpacing([{ closed: v(0), open: v(0) }, { closed: v(14), open: v(24) }])).toEqual({ minMm: 9, maxMm: 29 });
    expect(expectedSpacing([{ closed: v(0), open: v(0) }])).toBeNull();
    const a = [10, 5, 300], b = [22, 9, 305];
    expect(stereoBallPair(cal, [project(a, false), project(b, false)], [project(a, true), project(b, true)], size, size, undefined, { minMm: 20, maxMm: 30 })).toBeNull();
  });
});

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { localCorners, solvePrismPose } from '../input/prismPose';
import {
  bodyRay,
  defaultIntrinsics,
  nearestPointToRays,
  pathPosition,
  projectBodyPoint,
  type BodyPose,
} from './jawGeometry';

const k = defaultIntrinsics(960, 540);
const pose = (eulerDeg: [number, number, number], translation: [number, number, number]): BodyPose => ({
  quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(...eulerDeg.map(THREE.MathUtils.degToRad) as [number, number, number])),
  translation: new THREE.Vector3(...translation),
});

describe('projection', () => {
  it('uses the same camera model as the single-camera pose solver', () => {
    // Project two 8-face-ring markers with a known pose, solve the pose back
    // with solvePrismPose, and check it matches: jaw projection then agrees
    // with the instrument tracker's own pose.
    const truth = pose([-60, 20, 5], [25, -10, 380]);
    const markers = [0, 1].map((index) => ({
      id: index,
      corners: localCorners(index, 'ring8').map((p) => projectBodyPoint(truth, p, k)!),
    }));
    const solved = solvePrismPose(markers, 0, 960, 540, undefined, truth as never, 'ring8')!;
    expect(solved).not.toBeNull();
    // The solver runs a fixed number of iterations, so allow sub-pixel residual.
    expect(solved.error).toBeLessThan(0.5);
    expect(solved.translation.distanceTo(truth.translation)).toBeLessThan(0.1);
    expect(THREE.MathUtils.radToDeg(solved.quaternion.angleTo(truth.quaternion))).toBeLessThan(0.05);
  });

  it('returns null behind the camera', () => {
    expect(projectBodyPoint(pose([0, 0, 0], [0, 0, -50]), new THREE.Vector3(), k)).toBeNull();
  });
});

describe('rays', () => {
  it('passes through the projected body point', () => {
    const p = pose([10, 30, -5], [-20, 15, 350]);
    const point = new THREE.Vector3(12, -40, 8);
    const pixel = projectBodyPoint(p, point, k)!;
    const ray = bodyRay(p, pixel, k);
    const offset = point.clone().sub(ray.origin);
    const distance = offset.sub(ray.direction.clone().multiplyScalar(offset.dot(ray.direction))).length();
    expect(distance).toBeLessThan(1e-6);
  });

  it('recovers a fixed body point from several viewpoints', () => {
    const point = new THREE.Vector3(5, -35, 12);
    const rays = [
      pose([0, 0, 0], [0, 0, 400]),
      pose([15, 5, 0], [20, -10, 380]),
      pose([-10, 25, 10], [-15, 5, 420]),
      pose([5, -20, -15], [10, 20, 390]),
    ].map((p) => bodyRay(p, projectBodyPoint(p, point, k)!, k));
    const fit = nearestPointToRays(rays)!;
    expect(fit.point.distanceTo(point)).toBeLessThan(1e-6);
    expect(fit.rmsMm).toBeLessThan(1e-6);
  });

  it('uses the prior to fix depth when rays are parallel', () => {
    const p = pose([0, 0, 0], [0, 0, 400]);
    const point = new THREE.Vector3(0, -30, 0);
    const ray = bodyRay(p, projectBodyPoint(p, point, k)!, k);
    const prior = ray.origin.clone().add(ray.direction.clone().multiplyScalar(400));
    const fit = nearestPointToRays([ray, ray, ray], prior, 0.01)!;
    expect(fit.point.distanceTo(prior)).toBeLessThan(1);
  });
});

describe('path position', () => {
  it('measures fraction along and distance from a path', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    expect(pathPosition({ x: 5, y: 3 }, a, b)).toEqual({ fraction: 0.5, offsetPx: 3, lengthPx: 10 });
    expect(pathPosition({ x: 15, y: 0 }, a, b).fraction).toBe(1.5);
    expect(pathPosition({ x: 1, y: 1 }, a, a).lengthPx).toBe(0);
  });
});

import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { localCorners } from '../input/prismPose';
import type { StereoCalibration } from '../input/stereoGeometry';
import { inRingFrame, parseStereoHandle, prismApothem, prismAxisPoint, robustPoint, serializeStereoHandle, stereoOpening, triangulateMarker } from './stereoHandle';

const lens = { cameraMatrix: [[1400, 0, 960], [0, 1400, 540], [0, 0, 1]], distortionCoefficients: [0, 0, 0, 0, 0], imageSize: { width: 1920, height: 1080 } };
// Camera 2 is 280 mm to the right: X2 = X1 + T with T = (−280, 0, 0).
const calibration = { format: 'suturehero-stereo-calibration-v1', imageSize: { width: 1920, height: 1080 }, camera1: lens, camera2: lens, stereo: { rotation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], translationMm: [-280, 0, 0] } } as unknown as StereoCalibration;
const size = { width: 1920, height: 1080 };
const project = (p: Vector3, camera: 0 | 1) => {
  const x = camera ? p.x - 280 : p.x;
  return { x: 1400 * (x / p.z) + 960, y: 1400 * (p.y / p.z) + 540 };
};

/** Corners of a 12 mm square face (ArUco corner order) whose inward normal is `inward`, centred at `center`. */
function face(center: Vector3, inward: Vector3, up: Vector3) {
  const right = new Vector3().crossVectors(up, inward).normalize();
  const down = up.clone().negate();
  return [[-6, -6], [6, -6], [6, 6], [-6, 6]].map(([x, y]) => center.clone().addScaledVector(right, x).addScaledVector(down, y));
}

describe('stereo handle prism', () => {
  it('triangulates a marker and finds the same prism axis point from every face', () => {
    const axis = new Vector3(20, -10, 700);
    const apothem = prismApothem(19);
    const results = [0, 1, 2].map((k) => {
      const angle = (k * 2 * Math.PI) / 3 + 0.3;
      const outward = new Vector3(Math.sin(angle), 0, -Math.cos(angle)); // faces roughly toward the cameras
      const corners3d = face(axis.clone().addScaledVector(outward, apothem), outward.clone().negate(), new Vector3(0, -1, 0));
      const tri = triangulateMarker(calibration, corners3d.map((p) => project(p, 0)), corners3d.map((p) => project(p, 1)), size, size);
      return tri ? prismAxisPoint(tri, apothem) : null;
    });
    for (const point of results) expect(point!.distanceTo(axis)).toBeLessThan(1e-6);
  });

  it('finds the same axis point from every face of the real prism layout', () => {
    // localCorners('prism') is the layout the pose solver matches against detected ArUco corners.
    const width = localCorners(0, 'prism')[0].distanceTo(localCorners(0, 'prism')[1]);
    for (let face = 0; face < 3; face++) {
      expect(prismAxisPoint(localCorners(face, 'prism'), prismApothem(width)).length()).toBeLessThan(1e-9);
    }
  });

  it('measures opening from position in the ring frame, unaffected by rolling the instrument', () => {
    const closed = new Vector3(0, 60, 8), open = new Vector3(15, 58, 8);
    const model = { closed, open };
    for (const roll of [0, 1.2, 2.5]) {
      const ring = { quaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), roll), translation: new Vector3(10, 20, 650) };
      const halfOpen = closed.clone().lerp(open, 0.5);
      const seen = halfOpen.clone().applyQuaternion(ring.quaternion).add(ring.translation);
      expect(stereoOpening(model, inRingFrame(seen, ring))).toBeCloseTo(0.5, 9);
    }
  });

  it('averages captures robustly and round-trips saved models', () => {
    const points = Array.from({ length: 15 }, (_, i) => new Vector3(1 + (i % 3) * 0.2, 2, 3));
    points.push(new Vector3(40, 2, 3)); // one bad triangulation
    const r = robustPoint(points)!;
    expect(r.inliers).toBe(15);
    expect(r.point.x).toBeCloseTo(1.2, 6);
    const model = { closed: new Vector3(0, 0, 0), open: new Vector3(10, 0, 0) };
    expect(parseStereoHandle(JSON.parse(JSON.stringify(serializeStereoHandle(model))))!.open.x).toBe(10);
    expect(parseStereoHandle({ version: 1, closed: [0, 0, 0], open: [1, 0, 0] })).toBeNull();
  });
});

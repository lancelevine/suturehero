import * as THREE from 'three';
import { expect, it } from 'vitest';
import { estimateMarkerPose } from './markerPose';

const FOCAL = 1000, W = 1280, H = 800;

/** Project a 12 mm marker posed at `position` with `rotation` into the image. */
function project(position: THREE.Vector3, rotation = new THREE.Quaternion(), size = 12) {
  const s = size / 2;
  return [[-s, -s], [s, -s], [s, s], [-s, s]].map(([x, y]) => {
    const p = new THREE.Vector3(x, y, 0).applyQuaternion(rotation).add(position);
    return { x: (FOCAL * p.x) / p.z + W / 2, y: (FOCAL * p.y) / p.z + H / 2 };
  });
}

it('recovers a marker facing the camera', () => {
  const pose = estimateMarkerPose({ id: 4, corners: project(new THREE.Vector3(20, -10, 400)) }, W, H, 12, FOCAL)!;
  expect(pose.id).toBe(4);
  expect(pose.position.x).toBeCloseTo(20, 3);
  expect(pose.position.y).toBeCloseTo(-10, 3);
  expect(pose.position.z).toBeCloseTo(400, 3);
  expect(pose.reprojectionError).toBeLessThan(1e-6);
});

it('recovers a tilted marker', () => {
  const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, -0.3, 0.2));
  const pose = estimateMarkerPose({ id: 1, corners: project(new THREE.Vector3(0, 0, 300), tilt) }, W, H, 12, FOCAL)!;
  expect(pose.position.z).toBeCloseTo(300, 2);
  expect(pose.quaternion.angleTo(tilt)).toBeLessThan(1e-3);
});

it('rejects incomplete or degenerate input', () => {
  expect(estimateMarkerPose({ id: 1, corners: project(new THREE.Vector3(0, 0, 300)).slice(0, 3) }, W, H)).toBeNull();
  expect(estimateMarkerPose({ id: 1, corners: project(new THREE.Vector3(0, 0, 300)) }, 0, H)).toBeNull();
  const point = { x: 640, y: 400 };
  expect(estimateMarkerPose({ id: 1, corners: [point, point, point, point] }, W, H)).toBeNull();
});

import * as THREE from 'three';
import { expect, it } from 'vitest';
import { localCorners } from '../input/prismPose';
import { defaultIntrinsics, projectBodyPoint, type BodyPose } from '../jaw/jawGeometry';
import { lineIntersection, ringAxisSegment, RING_AXIS_HALF_LENGTH_MM } from './ringAxisOverlay';

it('draws the ring shaft axis through the projected ring centre', () => {
  const k = defaultIntrinsics(960, 540);
  const truth: BodyPose = {
    quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(-1, 0.3, 0.1)),
    translation: new THREE.Vector3(25, -10, 380),
  };
  const markers = [0, 1].map((id) => ({ id, corners: localCorners(id, 'ring8').map((p) => projectBodyPoint(truth, p, k)!) }));
  const segment = ringAxisSegment(markers, 0, 'ring8', 960, 540, truth as never)!;
  expect(segment).not.toBeNull();
  const expectedEnd = projectBodyPoint(truth, new THREE.Vector3(0, RING_AXIS_HALF_LENGTH_MM, 0), k)!;
  expect(Math.hypot(segment.b.x - expectedEnd.x, segment.b.y - expectedEnd.y)).toBeLessThan(1);
  expect(ringAxisSegment([], 0, 'ring8', 960, 540)).toBeNull();
});

it('finds where two image lines cross, and refuses near-parallel lines', () => {
  const crossing = lineIntersection({ a: { x: 0, y: 0 }, b: { x: 10, y: 10 } }, { a: { x: 0, y: 10 }, b: { x: 10, y: 0 } })!;
  expect(crossing.x).toBeCloseTo(5, 9);
  expect(crossing.y).toBeCloseTo(5, 9);
  expect(lineIntersection({ a: { x: 0, y: 0 }, b: { x: 100, y: 0 } }, { a: { x: 0, y: 5 }, b: { x: 100, y: 6 } })).toBeNull();
});

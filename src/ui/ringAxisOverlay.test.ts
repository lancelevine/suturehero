import * as THREE from 'three';
import { expect, it } from 'vitest';
import { localCorners } from '../input/prismPose';
import { defaultIntrinsics, projectBodyPoint, type BodyPose } from '../jaw/jawGeometry';
import { ringAxisSegment, RING_AXIS_HALF_LENGTH_MM } from './ringAxisOverlay';

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

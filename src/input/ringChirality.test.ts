import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { localCorners } from './prismPose';
import { fromLegacyQuaternion, physicalCorners, toLegacyQuaternion } from './ringChirality';

describe('mirror-corrected ring layout', () => {
  it('is the x-mirror of the legacy model for every ring8 face, with readable (non-mirrored) markers', () => {
    for (let face = 0; face < 8; face++) {
      const legacy = localCorners(face, 'ring8');
      const physical = physicalCorners(face, 'ring8');
      physical.forEach((p, i) => expect(p.distanceTo(new THREE.Vector3(-legacy[i].x, legacy[i].y, legacy[i].z))).toBeLessThan(1e-9));
      // Seen from outside the ring, corners TL→TR→BR→BL must turn the same way
      // as a printed marker: (TR−TL)×(BL−TL) points into the ring.
      const center = physical.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(0.25);
      const inward = physical[1].clone().sub(physical[0]).cross(physical[3].clone().sub(physical[0]));
      expect(inward.dot(new THREE.Vector3(-center.x, 0, -center.z))).toBeGreaterThan(0);
    }
  });

  it('leaves the prism unchanged and converts orientations both ways', () => {
    expect(physicalCorners(1, 'prism')).toEqual(localCorners(1, 'prism'));
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, -0.7, 0.2));
    // angleTo uses acos, so ~1e-8 rad of rounding is expected.
    expect(fromLegacyQuaternion(toLegacyQuaternion(q, 'ring8'), 'ring8').angleTo(q)).toBeLessThan(1e-6);
    expect(toLegacyQuaternion(q, 'prism').angleTo(q)).toBeLessThan(1e-6);
  });
});

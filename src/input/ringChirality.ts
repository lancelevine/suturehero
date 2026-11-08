import * as THREE from 'three';
import { faceGeometry, trackerGeometry, type TrackerType } from './prismPose';
import type { MarkerPose } from './markerPose';

/**
 * Physically correct ("mirror-corrected") ring face layout for stereo.
 *
 * Triangulating Lance's recordings showed the ring model in `prismPose.ts`
 * is the mirror image of the printed ring: neighbouring markers lie on the
 * opposite side of each marker's plane. One marker alone fits either way
 * (a flat square is unchanged by a mirror in its own plane), which is why
 * single-camera tracking works, but fits combining several markers fail and
 * single-marker fits disagree by 60°/120°. Mirroring the model (x → −x) made
 * multi-marker stereo fits succeed on every recording (< 1 px).
 *
 * Only the stereo solver uses this layout, so single-camera tracking is
 * unchanged. Stereo poses are converted back to the existing output
 * convention with `toLegacyQuaternion` (a fixed 180° turn about the shaft
 * axis, exact for faces 0 and 3).
 */

const HALF_TURN_ABOUT_SHAFT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

const ring = (type: TrackerType) => type === 'ring6' || type === 'ring8';

/** Face rotation and center in the mirror-corrected layout (prism unchanged). */
export function physicalFaceGeometry(index: number, type: TrackerType) {
  const { rotation, center } = faceGeometry(index, type);
  if (!ring(type)) return { rotation, center };
  // Reflection x → −x conjugates a rotation to (qx, −qy, −qz, qw); the extra
  // half turn keeps each printed square readable (not mirrored) from outside.
  const mirrored = new THREE.Quaternion(rotation.x, -rotation.y, -rotation.z, rotation.w).multiply(HALF_TURN_ABOUT_SHAFT);
  return { rotation: mirrored, center: new THREE.Vector3(-center.x, center.y, center.z) };
}

/** Marker corners (TL, TR, BR, BL) in the body frame, mirror-corrected. */
export function physicalCorners(index: number, type: TrackerType): THREE.Vector3[] {
  const { rotation, center } = physicalFaceGeometry(index, type);
  const s = trackerGeometry(type).markerSizeMm / 2;
  return [[-s, -s], [s, -s], [s, s], [-s, s]].map(([x, y]) => new THREE.Vector3(x, y, 0).applyQuaternion(rotation).add(center));
}

/** Body pose implied by one marker's pose, in the mirror-corrected layout. */
export function physicalBodyPose(pose: MarkerPose, index: number, type: TrackerType) {
  const geometry = physicalFaceGeometry(index, type);
  const quaternion = pose.quaternion.clone().multiply(geometry.rotation.clone().invert()).normalize();
  return { quaternion, translation: pose.position.clone().sub(geometry.center.clone().applyQuaternion(quaternion)) };
}

/** Convert a mirror-corrected body orientation to the existing output convention, and back. */
export function toLegacyQuaternion(quaternion: THREE.Quaternion, type: TrackerType): THREE.Quaternion {
  return ring(type) ? quaternion.clone().multiply(HALF_TURN_ABOUT_SHAFT) : quaternion.clone();
}
export const fromLegacyQuaternion = toLegacyQuaternion;

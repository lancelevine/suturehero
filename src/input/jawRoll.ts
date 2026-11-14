import { Matrix4, Quaternion, Vector3 } from 'three';
import { trackedInstrumentRotation } from './trackingFrame';
import type { StereoWorkspace } from './stereoWorkspace';

/**
 * Jaw orientation (roll) for instruments with a calibrated stereo tip
 * (2026-11-14). Tip calibration fixes the tip and the shaft direction but
 * not the roll about the shaft, which sets the plane the jaws open in.
 *
 * Capture: the user holds the instrument with the jaws opening sideways
 * (finger rings level, side by side) and presses "Set jaw orientation". At
 * that moment the model should have its shaft (+Z after mounting) from tip
 * to ring and its jaw opening axis (+X) level. The fixed rotation from the
 * tracker body to that model pose is saved; afterwards the model's whole
 * orientation follows the ring's measured rotation.
 *
 * Quaternions here use the tracking-pose convention (before the model
 * mounting rotation, src/input/trackingFrame.ts).
 */

/** Rotation from camera-1 axes to scene axes: the workspace's right / up / −forward, or (x, −y, −z) without one. */
export function cameraToScene(workspace: StereoWorkspace | null): Quaternion {
  if (!workspace) return new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI);
  // Rows right, up, −forward map camera vectors to scene coordinates; makeBasis builds the transpose.
  const basis = new Matrix4().makeBasis(workspace.right, workspace.up, workspace.forward.clone().negate());
  return new Quaternion().setFromRotationMatrix(basis).invert();
}

/**
 * Tracking-pose quaternion whose model shaft points along `shaftScene`
 * (tip → ring) with the jaws opening level (hinge axis as close to scene up
 * as the shaft allows). Null if the shaft is vertical (no level direction).
 */
export function levelJawPose(shaftScene: Vector3): Quaternion | null {
  const z = shaftScene.clone().normalize();
  const up = new Vector3(0, 1, 0);
  const y = up.clone().addScaledVector(z, -up.dot(z));
  if (y.lengthSq() < 1e-6) return null;
  y.normalize();
  const x = new Vector3().crossVectors(y, z);
  const modelWorld = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
  // modelWorld = pose · mount  ⇒  pose = modelWorld · mount⁻¹.
  const mount = trackedInstrumentRotation(new Quaternion());
  return modelWorld.multiply(mount.invert()).normalize();
}

/** The saved body→model rotation from a capture: (sceneFromCamera · ring)⁻¹ · pose. */
export function bodyToModel(ringInCamera: Quaternion, workspace: StereoWorkspace | null, pose: Quaternion): Quaternion {
  const ringInScene = cameraToScene(workspace).multiply(ringInCamera);
  return ringInScene.invert().multiply(pose).normalize();
}

/** The model's tracking-pose quaternion for a ring rotation and a saved body→model rotation. */
export function modelPose(ringInCamera: Quaternion, workspace: StereoWorkspace | null, saved: Quaternion): Quaternion {
  return cameraToScene(workspace).multiply(ringInCamera).multiply(saved).normalize();
}

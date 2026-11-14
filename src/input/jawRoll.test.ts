import { Euler, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { bodyToModel, cameraToScene, levelJawPose, modelPose } from './jawRoll';
import { trackedInstrumentRotation } from './trackingFrame';
import type { StereoWorkspace } from './stereoWorkspace';

// A tilted camera: forward across the table is partly along camera y; up = right × forward (as solveWorkspaceAxes).
const right = new Vector3(1, 0, 0), forward = new Vector3(0, 0.6, -0.8);
const workspace: StereoWorkspace = { origin: new Vector3(), right, forward, up: new Vector3().crossVectors(right, forward).normalize(), unitsPerMm: 0.02 };

const axis = (pose: Quaternion, local: Vector3) => local.clone().applyQuaternion(trackedInstrumentRotation(pose));

describe('jaw roll', () => {
  it('maps camera axes to the workspace right / up / −forward', () => {
    const r = cameraToScene(workspace);
    expect(workspace.right.clone().applyQuaternion(r).distanceTo(new Vector3(1, 0, 0))).toBeLessThan(1e-9);
    expect(workspace.up.clone().applyQuaternion(r).distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-9);
    expect(workspace.forward.clone().applyQuaternion(r).distanceTo(new Vector3(0, 0, -1))).toBeLessThan(1e-9);
    expect(new Vector3(0, 1, 0).applyQuaternion(cameraToScene(null)).distanceTo(new Vector3(0, -1, 0))).toBeLessThan(1e-9);
  });

  it('builds a pose with the shaft along the tip-to-ring direction and the jaws opening level', () => {
    const shaft = new Vector3(0.3, 0.5, -0.8).normalize();
    const pose = levelJawPose(shaft)!;
    expect(axis(pose, new Vector3(0, 0, 1)).angleTo(shaft)).toBeLessThan(1e-9);
    expect(Math.abs(axis(pose, new Vector3(1, 0, 0)).y)).toBeLessThan(1e-9);
    expect(axis(pose, new Vector3(0, 1, 0)).y).toBeGreaterThan(0);
    expect(levelJawPose(new Vector3(0, 1, 0))).toBeNull();
  });

  it('keeps the captured relation as the ring turns (roll follows the real instrument)', () => {
    const ringAtCapture = new Quaternion().setFromEuler(new Euler(0.4, -0.3, 1.1));
    const pose = levelJawPose(new Vector3(0.2, 0.6, -0.7))!;
    const saved = bodyToModel(ringAtCapture, workspace, pose);
    expect(modelPose(ringAtCapture, workspace, saved).angleTo(pose)).toBeLessThan(1e-9);
    // Rolling the ring 40° about its own axis rolls the model by the same amount in the scene.
    const roll = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.7);
    const turned = modelPose(ringAtCapture.clone().multiply(roll), workspace, saved);
    expect(turned.angleTo(pose)).toBeCloseTo(0.7, 6);
  });
});

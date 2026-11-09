import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { PrismPose } from './prismPose';
import { acceptRotation, chooseFace, combineRotation, largestFaceId, rotationFaceMarkers, predictRotation, restRigidBody, rotationVerdict, stallRotation, startRigidBody, updateFaceTransition, type RotationGateInput } from './rotationTracking';

const pose = (angle: number, axis = new THREE.Vector3(0, 1, 0)): PrismPose => ({ quaternion: new THREE.Quaternion().setFromAxisAngle(axis, angle), translation: new THREE.Vector3(), error: 1, faces: 1 } as PrismPose);
const gate = (change: Partial<RotationGateInput> = {}): RotationGateInput => ({
  error: 1, faces: 1, stereo: false, angularDifference: 0.1, predictedDifference: Infinity, elapsedSeconds: 0.033, staleMs: 33,
  freshDecodedFace: false, flowRotationRecent: false, faceTransitionEnabled: false, newFaceFresh: false, candidateCount: 0, ...change,
});

describe('rotation gate', () => {
  it('accepts small single-face steps and any well-fitted multi-face or stereo solve', () => {
    expect(rotationVerdict(gate())).toBe('accepted');
    expect(rotationVerdict(gate({ faces: 2, angularDifference: 2 }))).toBe('accepted');
    expect(rotationVerdict(gate({ stereo: true, angularDifference: 2 }))).toBe('accepted');
  });
  it('rejects a large single-face jump (likely a mirrored solution) and poor fits', () => {
    expect(rotationVerdict(gate({ angularDifference: 1.5 }))).toBe('rejected');
    expect(rotationVerdict(gate({ error: 12, faces: 3 }))).toBe('rejected');
    expect(rotationVerdict(gate({ stereo: true, error: 6 }))).toBe('rejected');
  });
  it('allows the special cases for large single-face changes', () => {
    expect(rotationVerdict(gate({ angularDifference: 1.5, freshDecodedFace: true }))).toBe('fast face accepted');
    expect(rotationVerdict(gate({ angularDifference: 0.5, flowRotationRecent: true }))).toBe('flow accepted');
    expect(rotationVerdict(gate({ angularDifference: 2.4, error: 2.2, faceTransitionEnabled: true, newFaceFresh: true, candidateCount: 2, predictedDifference: 0.5 }))).toBe('face transition accepted');
    expect(rotationVerdict(gate({ angularDifference: 2.9, staleMs: 300, error: 4 }))).toBe('reacquired');
  });
});

describe('rotation state', () => {
  it('continues the output from its anchor and estimates angular velocity', () => {
    const state = startRigidBody(pose(0), new THREE.Quaternion(), 0);
    const output = acceptRotation(state, pose(0.1), 100, 0.1, 0.1);
    expect(output.angleTo(pose(0.1).quaternion)).toBeLessThan(1e-9);
    expect(state.angularVelocity.y).toBeCloseTo(0.25, 6); // 1 rad/s smoothed by 0.25
    expect(predictRotation(state, 190).quaternion.angleTo(pose(0.1 + 0.25 * 0.09).quaternion)).toBeLessThan(1e-6);
  });
  it('decays velocity while stalled and keeps the first stall time', () => {
    const state = startRigidBody(pose(0), new THREE.Quaternion(), 0);
    state.angularVelocity.set(0, 1, 0);
    stallRotation(state, 50);
    stallRotation(state, 80);
    expect(state.stallSince).toBe(50);
    expect(state.angularVelocity.y).toBeCloseTo(0.7225);
  });
  it('counts consecutive fresh sightings of a new face', () => {
    const transition = { faceId: 1, candidateId: null as number | null, candidateCount: 0 };
    updateFaceTransition(transition, 2, true);
    updateFaceTransition(transition, 2, true);
    expect(transition.candidateCount).toBe(2);
    updateFaceTransition(transition, 1, false);
    expect(transition).toMatchObject({ candidateId: null, candidateCount: 0 });
  });
});

describe('largest face', () => {
  const square = (id: number, side: number) => ({ id, corners: [{ x: 0, y: 0 }, { x: side, y: 0 }, { x: side, y: side }, { x: 0, y: side }] });
  it('picks the largest marker, keeping the first on a tie', () => {
    expect(largestFaceId([square(1, 10), square(2, 20), square(3, 5)])).toBe(2);
    expect(largestFaceId([square(4, 10), square(5, 10)])).toBe(4);
    expect(largestFaceId([])).toBeNull();
  });
});

describe('face choice', () => {
  const c = (id: number, error: number) => ({ pose: { id, reprojectionError: error } });
  it('keeps the previous face while it fits, else takes the best fit', () => {
    const sorted = [c(2, 1), c(5, 3), c(7, 6)];
    expect(chooseFace(sorted, 5)!.pose.id).toBe(5);
    expect(chooseFace(sorted, 7)!.pose.id).toBe(2);
    expect(chooseFace(sorted, undefined)!.pose.id).toBe(2);
    expect(chooseFace([], 5)).toBeUndefined();
  });
});

describe('rest', () => {
  it('clears motion and stalls while keeping the state current', () => {
    const state = startRigidBody(pose(0), new THREE.Quaternion(), 0);
    state.angularVelocity.set(1, 2, 3);
    state.stallSince = 5;
    restRigidBody(state, 40);
    expect(state).toMatchObject({ lastAt: 40, stallSince: null });
    expect(state.angularVelocity.length()).toBe(0);
  });
});

describe('rotation source', () => {
  it('prefers stereo, counting it as two faces and keeping the mono translation', () => {
    const mono = { ...pose(0.1), translation: new THREE.Vector3(1, 2, 3) } as PrismPose;
    const stereo = { quaternion: pose(0.2).quaternion, errorPx: 1.5, faces: 1 };
    const both = combineRotation(mono, stereo);
    expect(both.source).toBe('stereo');
    expect(both.rigid).toMatchObject({ error: 1.5, faces: 2 });
    expect(both.rigid!.translation.toArray()).toEqual([1, 2, 3]);
    expect(combineRotation(mono, null)).toEqual({ rigid: mono, source: 'mono' });
    expect(combineRotation(undefined, null)).toEqual({ rigid: null, source: 'mono' });
  });
  it('follows ring side faces when any are visible', () => {
    const m = (id: number) => ({ id });
    expect(rotationFaceMarkers([m(10), m(16)], 10, true).map((x) => x.id)).toEqual([10]);
    expect(rotationFaceMarkers([m(16), m(17)], 10, true).map((x) => x.id)).toEqual([16, 17]);
    expect(rotationFaceMarkers([m(10), m(16)], 10, false).map((x) => x.id)).toEqual([10, 16]);
  });
});

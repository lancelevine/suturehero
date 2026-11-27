import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { RotationTracker, type RotationContext } from './RotationTracker';

function context(stereo: { quaternion: THREE.Quaternion } | null, overrides: Partial<RotationContext> = {}): RotationContext {
  return {
    ids: [0, 1, 2],
    trackerType: 'prism',
    mono: true,
    width: 1280,
    height: 800,
    flowRotation: false,
    faceTransition: false,
    recentlyDecoded: () => [],
    lastDecodedAt: () => performance.now(),
    markerAge: () => 0,
    ringTracker: () => undefined,
    stereoRotation: () => (stereo ? ({ ...stereo, translation: new THREE.Vector3(), errorPx: 0.5, faces: 3 } as never) : null),
    stageRaw: new Map(),
    stageStatus: new Map(),
    setSolverStatus: vi.fn(),
    setAngleDegrees: vi.fn(),
    ...overrides,
  };
}

it('keeps the previous orientation when there is no pose to solve', () => {
  const tracker = new RotationTracker();
  const previous = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, 0));
  const ctx = context(null);
  expect(tracker.update('forceps', 1000, previous, ctx).angleTo(previous)).toBeCloseTo(0, 6);
  expect(tracker.has('forceps')).toBe(false);
  expect(ctx.stageStatus.get('forceps')).toBe('no raw pose');
});

it('starts a rigid body on the first stereo pose, then follows small rotations', () => {
  const tracker = new RotationTracker();
  const start = tracker.update('forceps', 1000, undefined, context({ quaternion: new THREE.Quaternion() }));
  expect(start.angleTo(new THREE.Quaternion())).toBeCloseTo(0, 6);
  expect(tracker.has('forceps')).toBe(true);
  const turned = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.05));
  const ctx = context({ quaternion: turned });
  const next = tracker.update('forceps', 1033, start, ctx);
  expect(ctx.setAngleDegrees).toHaveBeenCalled();
  expect(ctx.stageStatus.get('forceps')).toBe('accepted');
  expect(next.angleTo(start)).toBeGreaterThan(0);
  tracker.reset();
  expect(tracker.has('forceps')).toBe(false);
});

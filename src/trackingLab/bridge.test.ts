import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { createTrackingLabBridge, type TrackingLabBridgeDeps } from './bridge';

const corners = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
const target = (lastSeen: number) => ({ id: 3, lastSeen, position: new THREE.Vector3(1, 2, 3), quaternion: new THREE.Quaternion(), pose: { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), reprojectionError: 0.5 } });

function deps(now: number, overrides: Partial<TrackingLabBridgeDeps> = {}): TrackingLabBridgeDeps {
  return {
    videos: () => [{} as HTMLVideoElement, {} as HTMLVideoElement],
    running: () => true, startPrimary: vi.fn(), startSecondary: vi.fn(), stereoMode: () => false,
    primaryDeviceId: () => 'a', secondarySelect: { value: 'b' } as HTMLSelectElement, availableCameras: async () => [],
    instrumentProfiles: () => ({}),
    observationsAt: () => now - 10,
    workers: () => [{ lastResultAt: now, lastDetectedIds: [3] }],
    presentedAt: () => now - 5,
    liveMarkers: () => [{ id: 3, corners }],
    overlaySize: () => ({ width: 640, height: 400 }),
    statusText: () => 'Stereo triangulation: off',
    stereoActive: () => false,
    liveTargets: () => [['forceps', target(now - 50)], ['scissors', target(now - 500)]],
    recordedInput: () => true,
    detect: vi.fn(async () => {}),
    busy: () => false,
    updateLiveTargets: vi.fn(),
    animate: vi.fn(),
    ...overrides,
  };
}

it('snapshots fresh markers and poses only', () => {
  const now = performance.now();
  const snapshot = createTrackingLabBridge(deps(now)).snapshot(0);
  expect(snapshot.markers.map((m) => [m.id, m.current])).toEqual([[3, true]]);
  expect(snapshot.poses.map((p) => p.instrument)).toEqual(['forceps']);
  expect([snapshot.width, snapshot.status]).toEqual([640, 'Stereo triangulation: off']);
});

it('processes a recorded frame and refuses live input', async () => {
  const d = deps(performance.now());
  await createTrackingLabBridge(d).process(1, 1234);
  expect(d.detect).toHaveBeenCalledWith(1, 1234);
  expect(d.animate).toHaveBeenCalledWith(1234);
  await expect(createTrackingLabBridge(deps(0, { recordedInput: () => false })).process(0, 1)).rejects.toThrow('Recorded frame input is required');
});

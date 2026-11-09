import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DistanceTracks, measureTrackerDistance, type DistanceInput } from './trackerDistance';

const W = 960, H = 540, F = W / (2 * Math.tan((70 * Math.PI) / 360));
/** A face-on 12 mm marker centred in view at `z` mm. */
const marker = (id: number, z: number) => {
  const half = (6 * F) / z;
  return { id, corners: [{ x: 480 - half, y: 270 - half }, { x: 480 + half, y: 270 - half }, { x: 480 + half, y: 270 + half }, { x: 480 - half, y: 270 + half }] };
};
const pose = (id: number, z: number, error: number) => ({ id, quaternion: new THREE.Quaternion(), position: new THREE.Vector3(0, 0, z), reprojectionError: error });
const input = (z: number, error: number, change: Partial<DistanceInput> = {}): DistanceInput => {
  const chosen = { marker: marker(0, z), pose: pose(0, z, error) } as unknown as DistanceInput['chosen'];
  return { chosen, candidates: [chosen], faceIndex: () => 0, trackerType: 'ring8', width: W, height: H, focalPx: F, now: 0, stationary: false, singleCamera: false, binding: 'cam', instrument: 'forceps', ...change };
};

describe('tracker distance', () => {
  it('uses the 3D pose when its fit is good, else the marker size', () => {
    const tracks = new DistanceTracks<string>();
    expect(measureTrackerDistance(tracks.get('a'), input(400, 1))!.source).toBe('3D pose');
    const sized = measureTrackerDistance(tracks.get('b'), input(400, 5))!;
    expect(sized.source).toBe('marker size');
    expect(sized.measuredDistance).toBeCloseTo(400, 0);
  });

  it('ignores a face too small to measure without recording anything', () => {
    const tracks = new DistanceTracks<string>();
    const tiny = input(400, 5);
    tiny.chosen.marker.corners.forEach((p) => { p.x = 480; p.y = 270; });
    expect(measureTrackerDistance(tracks.get('a'), tiny)).toBeNull();
    expect(tracks.get('a').lastDepthMm).toBeUndefined();
  });

  it('with one camera, reports size depth and holds the last depth when no face is measurable', () => {
    const tracks = new DistanceTracks<string>();
    const first = measureTrackerDistance(tracks.get('a'), input(400, 5, { singleCamera: true }))!;
    expect(first.source).toBe('tilt-corrected marker size');
    expect(first.valid).toBe(true);
    const held = measureTrackerDistance(tracks.get('a'), input(500, 5, { singleCamera: true, now: 30, candidates: [] }))!;
    expect(held.source).toBe('depth held · marker too tilted or small');
    expect(held.valid).toBe(false);
    expect(held.depthDistance).toBe(first.depthDistance);
  });

  it('resets histories and size estimators separately, keeping the last depth', () => {
    const tracks = new DistanceTracks<string>();
    const track = tracks.get('a');
    measureTrackerDistance(track, input(400, 5, { singleCamera: true }));
    const { history, sizeEstimator, lastDepthMm } = track;
    tracks.resetHistories();
    expect(track.history).not.toBe(history);
    expect(track.sizeEstimator).toBe(sizeEstimator);
    tracks.resetSizeEstimators();
    expect(track.sizeEstimator).not.toBe(sizeEstimator);
    expect(track.lastDepthMm).toBe(lastDepthMm);
  });
});

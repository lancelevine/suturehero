import { Quaternion, Vector3 } from 'three';
import { expect, it, vi } from 'vitest';
import { stereoTipPose } from './stereoTipPose';

const ring = { position: new Vector3(0, 0, 500), quaternion: new Quaternion() };

function calibration(tip: Vector3 | null, jaw: Quaternion | null = null, request: string | null = null) {
  return { tip: () => tip, jawOrientation: () => jaw, takeJawRequest: vi.fn(() => request), saveJawOrientation: vi.fn() };
}

it('needs a calibrated tip', () => {
  expect(stereoTipPose('forceps', ring, 'ring8', calibration(null), null, [], new Quaternion())).toBeNull();
});

it('places the instrument at its tip and turns the shaft toward the ring', () => {
  const pose = stereoTipPose('forceps', ring, 'ring8', calibration(new Vector3(0, 0, 100)), null, [], new Quaternion())!;
  expect(pose.tipMm.toArray()).toEqual([0, 0, 600]);
  expect(pose.position.distanceTo(new Vector3())).toBeGreaterThan(0);
  expect(pose.quaternion.length()).toBeCloseTo(1);
});

it('saves a requested jaw orientation and then follows it', () => {
  const cal = calibration(new Vector3(0, 0, 100), new Quaternion(), 'ring8');
  const pose = stereoTipPose('forceps', ring, 'ring8', cal, null, [], new Quaternion(0, 0, 1, 0))!;
  expect(cal.saveJawOrientation).toHaveBeenCalledOnce();
  expect(pose.quaternion.toArray()).not.toEqual([0, 0, 1, 0]);
});

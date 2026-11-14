import { Euler, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CAPTURE_MS, StereoTipCalibration } from './stereoTipCalibration';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};
const pose = (i: number, tip: Vector3, pivot: Vector3) => {
  const quaternion = new Quaternion().setFromEuler(new Euler(0.6 * Math.sin(i * 0.37), 0.6 * Math.cos(i * 0.23), 0.1 * Math.sin(i * 0.11)));
  return { position: pivot.clone().sub(tip.clone().applyQuaternion(quaternion)), quaternion };
};

describe('stereo tip calibration sessions', () => {
  it('captures, solves when the time is up, and saves per tracker type and instrument', () => {
    const calibration = new StereoTipCalibration(memory());
    const tip = new Vector3(3, -60, 7), pivot = new Vector3(0, 0, 400);
    calibration.start('needleDriver', 'ring8', 0);
    expect(calibration.capturing('needleDriver')).toBe(true);
    calibration.feed('forceps', pose(0, tip, pivot), 10); // other instrument ignored
    for (let i = 0; i <= 100; i++) calibration.feed('needleDriver', pose(i, tip, pivot), (i * CAPTURE_MS) / 100);
    expect(calibration.capturing()).toBe(false);
    expect(calibration.status()).toMatch(/Tip calibrated/);
    expect(calibration.tip('needleDriver', 'ring8')!.distanceTo(tip)).toBeLessThan(0.01);
    expect(calibration.tip('needleDriver', 'ring6')).toBeNull();
    expect(calibration.tip('forceps', 'ring8')).toBeNull();
    calibration.remove('needleDriver', 'ring8');
    expect(calibration.tip('needleDriver', 'ring8')).toBeNull();
  });

  it('reports a failed capture and saves nothing', () => {
    const calibration = new StereoTipCalibration(memory());
    calibration.start('forceps', 'ring8', 0);
    calibration.feed('forceps', pose(0, new Vector3(0, -100, 0), new Vector3()), CAPTURE_MS);
    expect(calibration.status()).toMatch(/Tip not calibrated/);
    expect(calibration.tip('forceps', 'ring8')).toBeNull();
  });
});

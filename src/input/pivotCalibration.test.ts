import { Euler, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { MAX_PIVOT_RMS_MM, MIN_PIVOT_SAMPLES, solvePivot, tipPosition, type PivotSample } from './pivotCalibration';

let seed = 99;
const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const gaussian = () => Math.sqrt(-2 * Math.log(random() + 1e-12)) * Math.cos(2 * Math.PI * random());

/** Samples rocking about `pivot` with the tip at `tip` in the body frame; `noiseMm` on positions. */
function rock(tip: Vector3, pivot: Vector3, count: number, maxDegrees: number, noiseMm = 0): PivotSample[] {
  const samples: PivotSample[] = [];
  for (let i = 0; i < count; i++) {
    const a = (maxDegrees * Math.PI) / 180;
    const quaternion = new Quaternion().setFromEuler(new Euler(a * Math.sin(i * 0.37), a * Math.cos(i * 0.23), 0.3 * a * Math.sin(i * 0.11)));
    const position = pivot.clone().sub(tip.clone().applyQuaternion(quaternion)).add(new Vector3(gaussian(), gaussian(), gaussian()).multiplyScalar(noiseMm));
    samples.push({ position, quaternion });
  }
  return samples;
}

describe('pivot tip calibration', () => {
  const tip = new Vector3(4, -112, 9);
  const pivot = new Vector3(30, -20, 420);

  it('recovers the tip offset and the pivot point', () => {
    const result = solvePivot(rock(tip, pivot, 120, 35, 0.4));
    if ('error' in result) throw new Error(result.error);
    expect(result.tipInBody.distanceTo(tip)).toBeLessThan(1.5);
    expect(result.pivot.distanceTo(pivot)).toBeLessThan(1.5);
    expect(result.rmsMm).toBeLessThan(1);
  });

  it('puts two instruments touching at one point at the same tip position', () => {
    const otherTip = new Vector3(-2, -55, 5);
    const a = solvePivot(rock(tip, pivot, 80, 30, 0.2));
    const b = solvePivot(rock(otherTip, pivot, 80, 30, 0.2));
    if ('error' in a || 'error' in b) throw new Error('solve failed');
    const poseA = rock(tip, pivot, 1, 10)[0];
    const poseB = rock(otherTip, pivot, 1, 25)[0];
    expect(tipPosition(poseA, a.tipInBody).distanceTo(tipPosition(poseB, b.tipInBody))).toBeLessThan(2);
  });

  it('refuses too few samples, too little rocking, and a sliding tip', () => {
    expect(solvePivot(rock(tip, pivot, MIN_PIVOT_SAMPLES - 1, 35))).toHaveProperty('error');
    expect(solvePivot(rock(tip, pivot, 60, 5))).toHaveProperty('error');
    const sliding = rock(tip, pivot, 60, 35).map((s, i) => ({ ...s, position: s.position.clone().add(new Vector3(i * 0.4, 0, 0)) }));
    const result = solvePivot(sliding);
    expect('error' in result || result.rmsMm <= MAX_PIVOT_RMS_MM).toBe(true);
    expect(result).toHaveProperty('error');
  });
});

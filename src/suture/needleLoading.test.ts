import * as THREE from 'three';
import { expect, it } from 'vitest';
import { describeLoading, loadingFraction, loadingVerdict } from './needleLoading';

const ARC = Math.PI * 0.75;
const at = (fraction: number) => new THREE.Vector3(Math.cos(fraction * ARC) * 0.3, 0, Math.sin(fraction * ARC) * 0.3);

it('measures the grip from swage to tip and grades it', () => {
  expect(loadingFraction(at(0.4), ARC)).toBeCloseTo(0.4, 9);
  expect(loadingVerdict(0.1)).toBe('near swage');
  expect(loadingVerdict(0.4)).toBe('good');
  expect(loadingVerdict(0.8)).toBe('near tip');
  expect(describeLoading(0.4)).toBe('Gripped 40% from the swage · good loading');
  expect(describeLoading(0.9)).toMatch(/too near the tip/);
});

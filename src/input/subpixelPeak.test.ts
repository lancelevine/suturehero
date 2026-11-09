import { expect, it } from 'vitest';
import { quadraticPeakOffset } from './subpixelPeak';

it('finds the vertex of a sampled parabola', () => {
  for (const peak of [-0.4, -0.1, 0, 0.25, 0.45]) {
    const f = (x: number) => 10 - 3 * (x - peak) ** 2;
    expect(quadraticPeakOffset(f(-1), f(0), f(1))).toBeCloseTo(peak, 9);
  }
});

it('returns 0 for flat or non-peak samples and clamps far estimates', () => {
  expect(quadraticPeakOffset(1, 1, 1)).toBe(0);
  expect(quadraticPeakOffset(1, 0, 1)).toBe(0);
  expect(quadraticPeakOffset(Number.NaN, 1, 0)).toBe(0);
  // Vertex 0.75 px left of centre: clamped to half a pixel.
  expect(quadraticPeakOffset(12, 10, 0)).toBe(-0.5);
});

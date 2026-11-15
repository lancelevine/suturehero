import { expect, it } from 'vitest';
import { EDGE_ROLL_DEPTH, shapedSkinSurface } from './freeSkinSurface';

const flat = { halfGapAt: (z: number) => (Math.abs(z) < 0.5 ? 0.01 : 0.05), shapedTopAt: () => 0.41 };

it('has no skin in the wound gap, which narrows where stitches close it', () => {
  expect(shapedSkinSurface(0.03, 1, flat)).toBeNull();
  expect(shapedSkinSurface(0.03, 0, flat)).not.toBeNull();
});

it('rolls the cut edge down and is flat away from it', () => {
  expect(shapedSkinSurface(0.0501, 1, flat)!).toBeCloseTo(0.41 - EDGE_ROLL_DEPTH, 3);
  expect(shapedSkinSurface(0.6, 1, flat)!).toBeCloseTo(0.41, 6);
});

it('follows the shaped tissue (eversion lifts the surface)', () => {
  const everted = { ...flat, shapedTopAt: (x: number) => 0.41 + (x > 0 ? 0.06 * Math.exp(-x / 0.2) : 0) };
  expect(shapedSkinSurface(0.2, 1, everted)!).toBeGreaterThan(shapedSkinSurface(-0.2, 1, everted)! + 0.015);
});

import * as THREE from 'three';
import { expect, it } from 'vitest';
import { DERMAL_MIDPOINT } from './anatomy';
import { SKIN_SURFACE_Y, type FreeTract } from './FreeNeedlePass';
import { freePassBites } from './freePassKnot';

const RADIUS = 0.3;
/** A vertical circle across the wound, centre `height` above the skin, from the left entry to the right exit. */
function tract(height: number): FreeTract {
  const centre = new THREE.Vector3(0, SKIN_SURFACE_Y + height, 0.1);
  const half = Math.acos(height / RADIUS);
  // Start at the left entry (angle π + (π/2 − half) from +x), advancing counter-clockwise about +z.
  const startAngle = Math.PI * 1.5 - half;
  return { centre, axis: new THREE.Vector3(0, 0, 1), start: new THREE.Vector3(Math.cos(startAngle) * RADIUS, Math.sin(startAngle) * RADIUS, 0), exitAngle: 2 * half };
}

it('finds the dermal crossings on each side of the wound', () => {
  const [right, left] = freePassBites(tract(0.15));
  expect(right!.x).toBeGreaterThan(0);
  expect(left!.x).toBeLessThan(0);
  expect(right!.y).toBeCloseTo(DERMAL_MIDPOINT, 6);
  expect(left!.y).toBeCloseTo(DERMAL_MIDPOINT, 6);
  expect(right!.x).toBeCloseTo(-left!.x, 6);
});

it('has no bites for a pass too shallow to reach the dermis, or without an exit', () => {
  expect(freePassBites(tract(RADIUS - 0.005))).toEqual([null, null]);
  expect(freePassBites({ ...tract(0.15), exitAngle: null })).toEqual([null, null]);
});

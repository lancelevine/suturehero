import * as THREE from 'three';
import { expect, it } from 'vitest';
import { knotSurfaceAt, microEnvironment } from './knotTissue';

const skin = { environment: 'skin' as const, siteZ: 0, field: [] };

it('gives the skin pad, tray and floor heights', () => {
  expect(knotSurfaceAt(skin, new THREE.Vector3(0, 0, 0))).toBeCloseTo(0.423);
  expect(knotSurfaceAt(skin, new THREE.Vector3(3, 0, 0))).toBeCloseTo(0.055);
  expect(knotSurfaceAt(skin, new THREE.Vector3(10, 0, 0))).toBeCloseTo(-0.075);
});

it('places the pad relative to the current stitch site', () => {
  // 1.5 along the pad is on it at site 0, off it once the site has moved 0.5 further.
  expect(knotSurfaceAt(skin, new THREE.Vector3(0, 0, 1.5))).toBeCloseTo(0.423);
  expect(knotSurfaceAt({ ...skin, siteZ: 0.5 }, new THREE.Vector3(0, 0, 1.5))).toBeCloseTo(0.055);
});

it('uses the microsurgery target surface and builds each environment once', () => {
  const micro = { environment: 'microsurgery' as const, microTarget: 'artery' as const, siteZ: 0, field: [] };
  const p = new THREE.Vector3(0, 0, 0);
  expect(knotSurfaceAt(micro, p)).toBe(microEnvironment('artery').surfaceAt(p));
  expect(microEnvironment('artery')).toBe(microEnvironment('artery'));
});

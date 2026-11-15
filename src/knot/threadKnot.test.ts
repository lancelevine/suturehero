import * as THREE from 'three';
import { expect, it } from 'vitest';
import { closedThread, threadKnot } from './threadKnot';

const line = (from: THREE.Vector3, to: THREE.Vector3, n = 30) => Array.from({ length: n + 1 }, (_, i) => from.clone().lerp(to, i / n));

it('closes an untied suture into an unknotted loop', () => {
  const entry = new THREE.Vector3(0.25, 0.41, 0), exit = new THREE.Vector3(-0.25, 0.41, 0);
  const long = line(exit, new THREE.Vector3(-2, 1, 0.5)), short = line(entry, new THREE.Vector3(1, 0.6, -0.3));
  const loop = closedThread(long, short, entry, exit);
  expect(loop.length).toBeGreaterThan(30);
  const knot = threadKnot(long, short, entry, exit);
  expect(knot.name).toBe('unknot');
});

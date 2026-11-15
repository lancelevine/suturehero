import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { crossingDiagram } from './crossingDiagram';
import { crossingCount, gaussCode, simplify, type GaussCode } from './gaussCode';

const sample = (f: (t: number) => THREE.Vector3, n = 400) => Array.from({ length: n }, (_, i) => f((i / n) * 2 * Math.PI));
const trefoil = () => sample((t) => new THREE.Vector3(Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -Math.sin(3 * t)));
/** A loop with a small twist (curl) in it: one crossing, still unknotted. */
const curledLoop = () => sample((t) => {
  const curl = Math.exp(-(((t - Math.PI) / 0.25) ** 2));
  return new THREE.Vector3(Math.cos(t) + 0.9 * curl * Math.cos(6 * t), Math.sin(t) + 0.9 * curl * Math.sin(6 * t), 0.3 * curl * Math.sin(6 * t));
});
const code = (text: string): GaussCode => {
  // "O1 U2 ..." with signs all +1.
  const passes = text.split(' ').map((p) => ({ crossing: Number(p.slice(1)), over: p[0] === 'O' }));
  return { passes, signs: new Map(passes.map((p) => [p.crossing, 1 as const])) };
};

describe('Gauss code simplification', () => {
  it('keeps the trefoil’s three crossings', () => {
    const c = gaussCode(crossingDiagram(trefoil()));
    expect(crossingCount(c)).toBe(3);
    expect(crossingCount(simplify(c))).toBe(3);
  });

  it('removes a twist (R1)', () => {
    expect(crossingCount(simplify(code('O1 U1')))).toBe(0);
    expect(crossingCount(simplify(code('O1 U2 O3 U1 O2 U3 O4 U4')))).toBe(3);
  });

  it('removes one strand lying across another (R2)', () => {
    // Strand A passes over 1 and 2; strand B passes under 2 and 1: an overlap.
    expect(crossingCount(simplify(code('O1 O2 U2 U1')))).toBe(0);
    // Within a trefoil, an extra overlap pair (5, 6) is removed and the trefoil kept.
    expect(crossingCount(simplify(code('O1 U2 O5 O6 O3 U1 U6 U5 O2 U3')))).toBe(3);
  });

  it('reduces a real curled loop drawn in 3D to no crossings', () => {
    const c = gaussCode(crossingDiagram(curledLoop()));
    expect(crossingCount(c)).toBeGreaterThan(0);
    expect(crossingCount(simplify(c))).toBe(0);
  });
});

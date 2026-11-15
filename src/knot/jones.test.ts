import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { crossingDiagram } from './crossingDiagram';
import { gaussCode, simplify } from './gaussCode';
import { formatPolynomial, jonesPolynomial } from './jones';

const sample = (f: (t: number) => THREE.Vector3, n = 400) => Array.from({ length: n }, (_, i) => f((i / n) * 2 * Math.PI));
const trefoil = (mirror = 1) => sample((t) => new THREE.Vector3(Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -mirror * Math.sin(3 * t)));
const figureEight = () => sample((t) => new THREE.Vector3((2 + Math.cos(2 * t)) * Math.cos(3 * t), (2 + Math.cos(2 * t)) * Math.sin(3 * t), Math.sin(4 * t)));
const jones = (points: THREE.Vector3[]) => formatPolynomial(jonesPolynomial(simplify(gaussCode(crossingDiagram(points))))!);

describe('Jones polynomial', () => {
  it('is 1 for the unknot', () => {
    expect(jones(sample((t) => new THREE.Vector3(Math.cos(t), Math.sin(t), 0)))).toBe('1');
  });

  it('gives the two trefoils their known, mirror-image polynomials', () => {
    const known = new Set(['t^1 + t^3 - t^4', '-t^-4 + t^-3 + t^-1']);
    const a = jones(trefoil(1)), b = jones(trefoil(-1));
    expect(known.has(a)).toBe(true);
    expect(known.has(b)).toBe(true);
    expect(a).not.toBe(b);
  });

  it('gives the figure-eight knot its known polynomial', () => {
    expect(jones(figureEight())).toBe('t^-2 - t^-1 + 1 - t^1 + t^2');
  });
});

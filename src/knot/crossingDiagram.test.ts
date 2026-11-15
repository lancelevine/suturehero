import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { crossingDiagram } from './crossingDiagram';

const sample = (f: (t: number) => THREE.Vector3, n = 300) => Array.from({ length: n }, (_, i) => f((i / n) * 2 * Math.PI));
/** Standard trefoil; `mirror` flips it to the other handedness. */
const trefoil = (mirror = 1) => sample((t) => new THREE.Vector3(Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -mirror * Math.sin(3 * t)));
const figureEight = () => sample((t) => new THREE.Vector3((2 + Math.cos(2 * t)) * Math.cos(3 * t), (2 + Math.cos(2 * t)) * Math.sin(3 * t), Math.sin(4 * t)));
const circle = () => sample((t) => new THREE.Vector3(Math.cos(t), Math.sin(t), 0.1 * Math.sin(t)));

describe('crossing diagram', () => {
  it('has no crossings for a plain loop', () => {
    expect(crossingDiagram(circle()).crossings).toHaveLength(0);
  });

  it('finds the three same-sign crossings of a trefoil, flipped for its mirror image', () => {
    const left = crossingDiagram(trefoil(1)), right = crossingDiagram(trefoil(-1));
    expect(left.crossings).toHaveLength(3);
    expect(Math.abs(left.writhe)).toBe(3);
    expect(right.writhe).toBe(-left.writhe);
  });

  it('finds the four crossings of a figure-eight knot, with writhe 0', () => {
    const d = crossingDiagram(figureEight());
    expect(d.crossings).toHaveLength(4);
    expect(d.writhe).toBe(0);
  });

  it('alternates over and under along an alternating knot', () => {
    const d = crossingDiagram(trefoil());
    const passes = d.crossings.flatMap((c) => [{ at: c.over, over: true }, { at: c.under, over: false }]).sort((a, b) => a.at - b.at);
    passes.forEach((p, i) => expect(p.over).toBe(!passes[(i + 1) % passes.length].over));
  });
});

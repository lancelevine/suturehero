import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ThreadGrasp, type JawState } from './ThreadGrasp';

const thread = Array.from({ length: 10 }, (_, i) => new THREE.Vector3(i * 0.1, 0.45, 0));
const jaw = (openness: number, x: number, busy = false): JawState => ({ id: 'left', openness, tip: new THREE.Vector3(x, 0.47, 0), busy });

describe('thread grasp', () => {
  it('grips the nearest thread point when the jaw closes near it, follows the jaw, and lets go when it opens', () => {
    const grasp = new ThreadGrasp();
    grasp.update([jaw(0.6, 0.41)], thread, new Set());
    expect(grasp.holds('left')).toBe(false);
    grasp.update([jaw(0.1, 0.41)], thread, new Set());
    expect(grasp.grips.get('left')).toBe(4);
    const moved = jaw(0.1, 0.8);
    expect(grasp.pins([moved]).get(4)!.x).toBeCloseTo(0.8);
    grasp.update([jaw(0.5, 0.8)], thread, new Set());
    expect(grasp.holds('left')).toBe(false);
  });

  it('does not grip far thread, thread in the tissue, the eye, or with a busy instrument', () => {
    for (const [state, fixed] of [[jaw(0.1, 3), new Set<number>()], [jaw(0.1, 0.41), new Set([4])], [jaw(0.1, 0.01), new Set<number>()], [jaw(0.1, 0.41, true), new Set<number>()]] as const) {
      const grasp = new ThreadGrasp();
      grasp.update([{ ...state, openness: 0.6 }], thread, fixed);
      grasp.update([state], thread, fixed);
      expect(grasp.holds('left')).toBe(false);
    }
  });

  it('needs a closing motion: an already closed jaw moved onto the thread does not grip', () => {
    const grasp = new ThreadGrasp();
    grasp.update([jaw(0.1, 3)], thread, new Set());
    grasp.update([jaw(0.1, 0.41)], thread, new Set());
    expect(grasp.holds('left')).toBe(false);
  });
});

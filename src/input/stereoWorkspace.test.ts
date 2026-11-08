import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { parseWorkspace, serializeWorkspace, solveWorkspaceAxes, sweepScale, workspacePracticePosition } from './stereoWorkspace';

// Camera looking down at the desk at 40°: desk "forward" is a mix of camera +y and +z.
const t = (40 * Math.PI) / 180;
const deskRight = new Vector3(1, 0, 0);
const deskForward = new Vector3(0, -Math.sin(t), Math.cos(t)); // away from the user, into the scene
const deskUp = new Vector3(0, -Math.cos(t), -Math.sin(t)); // camera +y points down
const neutral = new Vector3(10, 20, 350);
const at = (r: number, u: number, f: number) => neutral.clone().addScaledVector(deskRight, r).addScaledVector(deskUp, u).addScaledVector(deskForward, f);

describe('stereo workspace', () => {
  const guides = { neutral, right: at(100, 3, -4), forward: at(5, -2, 100), up: at(-3, 100, 6) };

  it('recovers the desk axes from slightly imperfect guided moves', () => {
    const axes = solveWorkspaceAxes(guides);
    if ('error' in axes) throw new Error(axes.error);
    expect(axes.right.angleTo(deskRight)).toBeLessThan(0.06);
    expect(axes.forward.angleTo(deskForward)).toBeLessThan(0.06);
    expect(axes.up.angleTo(deskUp)).toBeLessThan(0.06);
  });

  it('turns a forward move into scene −z only, at the swept scale', () => {
    const axes = solveWorkspaceAxes({ neutral, right: at(100, 0, 0), forward: at(0, 0, 100), up: at(0, 100, 0) });
    if ('error' in axes) throw new Error(axes.error);
    const sweep = [];
    for (let i = 0; i <= 20; i++) sweep.push(at(-100 + i * 10, 0, 0), at(0, 0, -80 + i * 8));
    const scale = sweepScale(axes, sweep);
    if (typeof scale !== 'number') throw new Error(scale.error);
    expect(scale).toBeCloseTo(4 / 200, 6);
    const w = { ...axes, unitsPerMm: scale };
    const p = workspacePracticePosition(at(0, 0, 100), w);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(-2, 6);
    expect(workspacePracticePosition(at(0, 50, 0), w).y).toBeCloseTo(1, 6);
  });

  it('rejects too-small moves, a wrong up move, and too-small sweeps', () => {
    expect(solveWorkspaceAxes({ ...guides, right: at(10, 0, 0) })).toHaveProperty('error');
    expect(solveWorkspaceAxes({ ...guides, up: at(0, -100, 0) })).toHaveProperty('error');
    const axes = solveWorkspaceAxes(guides);
    if ('error' in axes) throw new Error(axes.error);
    expect(sweepScale(axes, Array.from({ length: 20 }, (_, i) => at(i, 0, 0)))).toHaveProperty('error');
  });

  it('saves per stereo calibration and keeps the old mapping without a workspace', () => {
    const axes = solveWorkspaceAxes(guides);
    if ('error' in axes) throw new Error(axes.error);
    const saved = JSON.parse(JSON.stringify(serializeWorkspace({ ...axes, unitsPerMm: 0.02 }, 'cal-A')));
    expect(parseWorkspace(saved, 'cal-A')?.unitsPerMm).toBe(0.02);
    expect(parseWorkspace(saved, 'cal-B')).toBeNull();
    expect(workspacePracticePosition(new Vector3(200, 200, 200), null).toArray()).toEqual([1, -1, -1]);
  });
});

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FreeNeedlePass, layerAtDepth, SKIN_SURFACE_Y } from './FreeNeedlePass';

const RADIUS = 0.3, ARC = Math.PI * 0.75;
/** Needle circle in the world XY plane around `centre`; advancing the tip is a rotation about world +Z. */
const base = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const pose = (centre: THREE.Vector3, turn: number, wobble = new THREE.Quaternion()) => ({
  position: centre.clone(),
  quaternion: wobble.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), turn)).multiply(base),
});
const tipOf = (p: { position: THREE.Vector3; quaternion: THREE.Quaternion }) => new THREE.Vector3(Math.cos(ARC) * RADIUS, 0, Math.sin(ARC) * RADIUS).applyQuaternion(p.quaternion).add(p.position);

describe('free needle pass', () => {
  const centre = new THREE.Vector3(0, SKIN_SURFACE_Y + 0.15, 0.2);

  it('enters where the tip crosses the skin, follows the curve, exits across the wound and completes', () => {
    const pass = new FreeNeedlePass(RADIUS, ARC);
    let entered = false;
    for (let turn = 0; turn <= Math.PI * 1.9; turn += 0.01) {
      pass.update(pose(centre, turn), true, true);
      entered ||= pass.inTissue;
    }
    expect(entered).toBe(true);
    expect(pass.inTissue).toBe(false);
    expect(pass.passes).toHaveLength(1);
    const r = pass.passes[0];
    // Circle centre 0.15 above the surface, radius 0.3: entry/exit at x = ∓0.26, depth 0.15.
    expect(r.entry.x).toBeCloseTo(-Math.sqrt(0.3 ** 2 - 0.15 ** 2), 2);
    expect(r.exit!.x).toBeCloseTo(Math.sqrt(0.3 ** 2 - 0.15 ** 2), 1);
    expect(r.depth).toBeCloseTo(0.15, 2);
    expect(r.crossesWound).toBe(true);
    expect(r.deepestLayer).toBe(layerAtDepth(0.15));
  });

  it('keeps the needle on its curve when the holder twists it, and reports forcing', () => {
    const pass = new FreeNeedlePass(RADIUS, ARC);
    let turn = 0;
    while (!pass.inTissue) pass.update(pose(centre, (turn += 0.01)), true, true);
    const twisted = pose(centre, turn + 0.2, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.6));
    const allowed = pass.update(twisted, true, true);
    // The allowed pose keeps the tip on the needle's circle in the original plane (z of every point unchanged).
    expect(tipOf(allowed).z).toBeCloseTo(centre.z, 6);
    expect(pass.forcingWarning).toBe(true);
    expect(pass.update(pose(centre, turn + 0.2), true, true).quaternion.angleTo(pose(centre, turn + 0.2).quaternion)).toBeLessThan(1e-6);
    expect(pass.forcingWarning).toBe(false);
  });

  it('stays in the tissue when released, and ends the pass when backed fully out', () => {
    const pass = new FreeNeedlePass(RADIUS, ARC);
    let turn = 0;
    while (!pass.inTissue) pass.update(pose(centre, (turn += 0.01)), true, true);
    const engagedAt = turn;
    for (let i = 0; i < 30; i++) pass.update(pose(centre, (turn += 0.01)), true, true);
    const held = pass.update(pose(new THREE.Vector3(5, 5, 5), 0), false, false);
    expect(tipOf(held).y).toBeLessThan(SKIN_SURFACE_Y);
    expect(pass.inTissue).toBe(true);
    pass.update(pose(centre, engagedAt - 0.2), true, true);
    expect(pass.inTissue).toBe(false);
    expect(pass.passes).toHaveLength(0);
    while (!pass.inTissue) pass.update(pose(centre, (turn += 0.01)), true, true);
    pass.abortCurrent();
    expect(pass.inTissue).toBe(false);
  });

  it('only starts a pass from the needle driver, over the pad', () => {
    const forcepsOnly = new FreeNeedlePass(RADIUS, ARC);
    for (let turn = 0; turn <= 1.5; turn += 0.01) forcepsOnly.update(pose(centre, turn), true, false);
    expect(forcepsOnly.inTissue).toBe(false);
    const offPad = new FreeNeedlePass(RADIUS, ARC);
    for (let turn = 0; turn <= 1.5; turn += 0.01) offPad.update(pose(new THREE.Vector3(3, SKIN_SURFACE_Y + 0.15, 0), turn), true, true);
    expect(offPad.inTissue).toBe(false);
  });
});

describe('free pass tract (thread path)', () => {
  it('records the needle circle from the entry and where the tip came out', async () => {
    const { tractPoint } = await import('./FreeNeedlePass');
    const pass = new FreeNeedlePass(RADIUS, ARC);
    const centre = new THREE.Vector3(0, SKIN_SURFACE_Y + 0.2, 0.2);
    for (let turn = 0; turn <= Math.PI * 1.9 && pass.passes.length === 0; turn += 0.01) pass.update(pose(centre, turn), true, true);
    const { tract, entry, exit } = pass.passes[0];
    expect(tract.centre.distanceTo(centre)).toBeLessThan(1e-9);
    expect(tractPoint(tract, 0).distanceTo(entry)).toBeLessThan(0.02);
    expect(tractPoint(tract, tract.exitAngle!).distanceTo(exit!)).toBeLessThan(0.02);
    // Every tract point is on the needle's circle.
    expect(tractPoint(tract, tract.exitAngle! / 2).distanceTo(centre)).toBeCloseTo(RADIUS, 6);
  });
});

describe('threaded passes (running stitch)', () => {
  it('lists the pass in progress first, then completed passes newest first, until unthreaded', () => {
    const pass = new FreeNeedlePass(RADIUS, ARC);
    for (const z of [-0.3, 0.2]) {
      const centre = new THREE.Vector3(0, SKIN_SURFACE_Y + 0.2, z);
      const before = pass.passes.length;
      for (let turn = 0; turn <= Math.PI * 1.9 && pass.passes.length === before; turn += 0.01) pass.update(pose(centre, turn), true, true);
    }
    const chain = pass.threadedPasses();
    expect(chain.map((p) => p.tract.centre.z)).toEqual([0.2, -0.3]);
    expect(chain.every((p) => p.eyeAngle === Infinity)).toBe(true);
    pass.unthreadAll();
    expect(pass.threadedPasses()).toHaveLength(0);
    expect(pass.passes).toHaveLength(2);
  });
});

describe('tearing when forced', () => {
  const centre = new THREE.Vector3(0, SKIN_SURFACE_Y + 0.2, 0.2);
  const enter = (pass: FreeNeedlePass) => {
    let turn = 0;
    while (!pass.inTissue) pass.update(pose(centre, (turn += 0.01)), true, true);
    return turn;
  };
  const hardTwist = (turn: number) => pose(centre, turn, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 1));

  it('tears the needle out after sustained hard forcing, and it then follows the hand', async () => {
    const { TEAR_SECONDS } = await import('./FreeNeedlePass');
    const pass = new FreeNeedlePass(RADIUS, ARC);
    const turn = enter(pass);
    let frames = 0;
    while (pass.inTissue && frames < 200) { pass.update(hardTwist(turn), true, true, 1 / 60); frames++; }
    expect(pass.inTissue).toBe(false);
    expect(frames / 60).toBeGreaterThanOrEqual(TEAR_SECONDS - 1e-9);
    expect(pass.torn).toHaveLength(1);
    expect(pass.torn[0].torn).toBe(true);
    expect(pass.passes).toHaveLength(0);
    const free = pass.update(hardTwist(turn), true, true);
    expect(free.quaternion.angleTo(hardTwist(turn).quaternion)).toBeLessThan(1e-6);
  });

  it('does not tear on a brief flick or on ordinary forcing', () => {
    const pass = new FreeNeedlePass(RADIUS, ARC);
    const turn = enter(pass);
    for (let i = 0; i < 10; i++) pass.update(hardTwist(turn), true, true, 1 / 60);
    for (let i = 0; i < 120; i++) pass.update(pose(centre, turn, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.4)), true, true, 1 / 60);
    expect(pass.inTissue).toBe(true);
    expect(pass.torn).toHaveLength(0);
  });
});

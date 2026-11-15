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
    // Forcing is smoothed (tracking jitter): held for 0.2 s it warns, below the tear time.
    for (let i = 0; i < 12; i++) pass.update(twisted, true, true);
    expect(pass.forcingWarning).toBe(true);
    expect(pass.inTissue).toBe(true);
    expect(pass.update(pose(centre, turn + 0.2), true, true).quaternion.angleTo(pose(centre, turn + 0.2).quaternion)).toBeLessThan(1e-6);
    for (let i = 0; i < 40; i++) pass.update(pose(centre, turn + 0.2), true, true);
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

describe('tissue shape, jitter, skin tears and undo', () => {
  const centre = new THREE.Vector3(0, SKIN_SURFACE_Y + 0.15, 0.2);
  const drive = (pass: FreeNeedlePass, c = centre, until = () => pass.passes.length + pass.torn.length > 0) => {
    for (let turn = 0; turn <= Math.PI * 1.9 && !until(); turn += 0.01) pass.update(pose(c, turn), true, true);
  };

  it('enters and exits on a raised (everted) surface and measures depth from it', () => {
    const pass = new FreeNeedlePass(RADIUS, ARC);
    const lift = 0.05;
    pass.surfaceAt = () => SKIN_SURFACE_Y + lift;
    // Centre 0.2 above the flat skin = 0.15 above the raised surface.
    drive(pass, new THREE.Vector3(0, SKIN_SURFACE_Y + 0.2, 0.2));
    const r = pass.passes[0];
    expect(r.entry.y).toBeCloseTo(SKIN_SURFACE_Y + lift, 6);
    expect(r.depth).toBeCloseTo(0.15, 2);
    // Same geometry relative to the raised surface as the flat case with the centre 0.15 above it.
    expect(r.entry.x).toBeCloseTo(-Math.sqrt(0.3 ** 2 - 0.15 ** 2), 2);
  });

  it('finds no skin in the open wound gap, and measures bites from the wound edge', () => {
    const halfGap = 0.05;
    const pass = new FreeNeedlePass(RADIUS, ARC);
    pass.surfaceAt = (x) => (Math.abs(x) < halfGap ? null : SKIN_SURFACE_Y);
    pass.halfGapAt = () => halfGap;
    // A needle aimed straight down into the gap does not engage.
    const gapCentre = new THREE.Vector3(-Math.cos(ARC) * RADIUS, SKIN_SURFACE_Y + 0.05, 0.2);
    for (let turn = -0.6; turn <= 0.6; turn += 0.01) pass.update(pose(gapCentre, turn), true, true);
    drive(pass);
    const r = pass.passes[0];
    expect(r.entryEdge).toBeCloseTo(Math.abs(r.entry.x) - halfGap, 6);
    expect(r.exitEdge!).toBeCloseTo(Math.abs(r.exit!.x) - halfGap, 6);
  });

  it('reports the entry angle to the surface (a 3/8 needle entering on a circle ≈ 60°)', () => {
    const pass = new FreeNeedlePass(RADIUS, ARC);
    drive(pass);
    // Tangent of a circle centred 0.15 above the surface, radius 0.3, at the surface: 90° − asin(0.15/0.3) = 60°.
    expect(pass.passes[0].entryAngleDeg).toBeCloseTo(60, 0);
  });

  it('ignores small tracking jitter while in tissue', () => {
    const pass = new FreeNeedlePass(RADIUS, ARC);
    let turn = 0;
    while (!pass.inTissue) pass.update(pose(centre, (turn += 0.01)), true, true);
    for (let i = 0; i < 30; i++) pass.update(pose(centre, (turn += 0.01)), true, true);
    // ±1.7° wobble and ±0.5 mm shake at 60 Hz for 3 s: no warning, no tear.
    let warned = false;
    for (let i = 0; i < 180; i++) {
      const wobble = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.03 * Math.sin(i * 2.1));
      const p = pose(centre.clone().add(new THREE.Vector3(0.018 * Math.sin(i * 1.7), 0, 0)), turn, wobble);
      pass.update(p, true, true);
      warned ||= pass.forcingWarning;
    }
    expect(warned).toBe(false);
    expect(pass.torn).toHaveLength(0);
  });

  it('a tear splits the skin; the split holds no new stitch; undo takes it back', () => {
    const pass = new FreeNeedlePass(RADIUS, ARC);
    let turn = 0;
    while (!pass.inTissue) pass.update(pose(centre, (turn += 0.01)), true, true);
    for (let i = 0; i < 20; i++) pass.update(pose(centre, (turn += 0.01)), true, true);
    const shoved = pose(centre.clone().add(new THREE.Vector3(0, 0, 0.4)), turn);
    for (let i = 0; i < 60 && pass.inTissue; i++) pass.update(shoved, true, true);
    expect(pass.torn).toHaveLength(1);
    expect(pass.rents).toHaveLength(1);
    const rent = pass.rents[0];
    expect(rent.from.distanceTo(pass.torn[0].entry)).toBeLessThan(1e-9);
    // The split runs the way the needle was shoved (+z here).
    expect(rent.to.z - rent.from.z).toBeGreaterThan(0.04);
    // Lift out, then try the same entry again: no purchase in torn skin.
    for (let i = 0; i < 5; i++) pass.update(pose(centre.clone().add(new THREE.Vector3(0, 1, 0)), 0), true, true);
    for (let t = 0; t <= 1.6 && !pass.inTissue; t += 0.01) pass.update(pose(centre, t), true, true);
    expect(pass.inTissue).toBe(false);
    expect(pass.rejection).toMatch(/torn skin/);
    expect(pass.undoLast()).toBe(true);
    expect(pass.torn).toHaveLength(0);
    expect(pass.rents).toHaveLength(0);
    expect(pass.undoLast()).toBe(false);
  });

  it('undo takes back the latest completed pass, and cancels one in progress first', () => {
    const pass = new FreeNeedlePass(RADIUS, ARC);
    drive(pass);
    let turn = 0;
    while (!pass.inTissue) pass.update(pose(new THREE.Vector3(0, SKIN_SURFACE_Y + 0.15, -0.4), (turn += 0.01)), true, true);
    expect(pass.undoLast()).toBe(true);
    expect(pass.inTissue).toBe(false);
    expect(pass.passes).toHaveLength(1);
    expect(pass.undoLast()).toBe(true);
    expect(pass.passes).toHaveLength(0);
  });

  it('uses the tissue tear limits', () => {
    const fragile = new FreeNeedlePass(RADIUS, ARC);
    fragile.tearLimits = { degrees: 10, units: 0.05, seconds: 0.2 };
    let turn = 0;
    while (!fragile.inTissue) fragile.update(pose(centre, (turn += 0.01)), true, true);
    for (let i = 0; i < 20; i++) fragile.update(pose(centre, (turn += 0.01)), true, true);
    const twisted = pose(centre, turn, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.35));
    for (let i = 0; i < 60 && fragile.inTissue; i++) fragile.update(twisted, true, true);
    expect(fragile.torn).toHaveLength(1);
  });
});

describe('thread cut-through', () => {
  it('tears the newest threaded pass out toward the wound and stops threading it', () => {
    const pass = new FreeNeedlePass(RADIUS, ARC);
    pass.halfGapAt = () => 0.05;
    const centre = new THREE.Vector3(0, SKIN_SURFACE_Y + 0.15, 0.2);
    for (let turn = 0; turn <= Math.PI * 1.9 && pass.passes.length === 0; turn += 0.01) pass.update(pose(centre, turn), true, true);
    const record = pass.cutThrough()!;
    expect(record.cutThrough).toBe(true);
    expect(pass.passes).toHaveLength(0);
    expect(pass.threadedPasses()).toHaveLength(0);
    const rent = pass.rents[0];
    expect(rent.from.distanceTo(record.exit!)).toBeLessThan(1e-9);
    expect(Math.abs(rent.to.x)).toBeCloseTo(0.05, 6);
    expect(pass.cutThrough()).toBeNull();
  });
});

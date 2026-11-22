import * as THREE from 'three';
import { tieKnot } from '../../gameplay/test-support/knotTrials';
import { expect, it } from 'vitest';
import { Instrument } from '../../instruments/Instrument';
import { ClaudeKnotEngine } from './ClaudeKnotEngine';

it('gives a closing needle driver the short tail’s end even with the long strand lying beside it', () => {
  const tools = [new Instrument('left', 0), new Instrument('right', 0)];
  const engine = new ClaudeKnotEngine();
  engine.begin(tools, 'auto');
  for (let i = 0; i < 120; i++) engine.update(1 / 120, tools);
  const [, driver] = tools;
  const tail = engine.short.points[engine.short.count - 1];
  // Lay a stretch of the long strand right next to the tail's end (closer to the jaws than the end itself).
  const jawAt = tail.clone().add(new THREE.Vector3(0.03, 0, 0));
  driver.root.position.copy(jawAt).sub(new THREE.Vector3(0, 0, 0.05));
  driver.root.updateWorldMatrix(true, false);
  driver.openness = 0.7;
  engine.update(1 / 120, tools);
  // Right before the jaws close, a stretch of the long strand lies at the jaws (closer than the tail's end).
  for (let i = 30; i < 34; i++) engine.long.points[i].copy(jawAt).add(new THREE.Vector3(0.002 * (i - 31.5), 0, 0));
  driver.openness = 0.1;
  engine.update(1 / 120, tools);
  expect(engine.gripLabel('right')).toBe('short tail');
});

it('locks a surgeon’s knot at 2× hand speed and 30 fps', async () => {
  // The arm to the forceps passing the shaft used to merge with the coil, so the
  // single second throw counted as two wraps and never tightened (build 0.210).
  const model = await tieKnot(new ClaudeKnotEngine(), 2, 30, [[2, 1], [1, -1]]);
  expect(model.sequence!.technique, model.instruction).toBe('surgeon');
  expect(model.sequence!.throws.map((t) => t.wraps), model.instruction).toEqual([2, 1]);
  expect(model.sequence!.locked, model.instruction).toBe(true);
}, 300000);

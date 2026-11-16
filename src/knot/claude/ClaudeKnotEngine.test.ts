import * as THREE from 'three';
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

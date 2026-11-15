import { expect, it } from 'vitest';
import { createFreeTyingFixture } from './test-support/freeTying';
import { WoundApproximation } from '../tissue/WoundApproximation';
import { tractEntry, tractExit } from '../tissue/sutureTract';
import * as THREE from 'three';

it('forms, seats, releases, and retains a surgeon knot through irregular frames', async () => {
  const wound = new WoundApproximation();
  wound.setDermalBites(new THREE.Vector3(.25, .31, 0), new THREE.Vector3(-.25, .31, 0));
  const { model, tools, throwOne, lowerAndPull, update } = createFreeTyingFixture('auto', (dt, practice, tools) => {
    practice.entry.copy(wound.deformPoint(tractEntry()));
    practice.exit.copy(wound.deformPoint(tractExit()));
    practice.update(dt, tools);
    wound.update(practice.closureLoad, dt);
  }, undefined, 'event-ledger');
  await throwOne(2, 1);
  await lowerAndPull();
  expect(model.knotAtTissue, model.instruction).toBe(true);
  await throwOne(1, -1);
  expect(model.sequence!.technique, model.instruction).toBe('surgeon');
  expect(model.sequence!.throws, model.instruction).toHaveLength(2);
  expect(model.sequence!.locked, model.instruction).toBe(true);
  await lowerAndPull();
  expect(model.lockSeated, `${model.instruction} · seated ${model.seatedThrows} · load ${model.tissueSeat.load} · ${model.earlierThrows.map((item) => item.phase)} / ${model.retainedThrow.phase}`).toBe(true);
  const first = model.earlierThrows[0], indices = [first.first, first.last];
  tools.forEach((tool) => { tool.openness = 0.7; });
  for (let frame = 0; frame < 240; frame++) update([1 / 60, 1 / 30, 0.05][frame % 3]);
  expect([first.first, first.last]).toEqual(indices);
  expect(first.phase).toBe('seated');
  expect(model.long.points.every((point) => point.toArray().every(Number.isFinite))).toBe(true);
}, 180000);

it('requires a taut post, advances a sliding start, then locks it', async () => {
  let sawSliding = false;
  const { model, throwOne } = createFreeTyingFixture('auto', (dt, practice, tools) => {
    practice.update(dt, tools);
    sawSliding ||= practice.sequence?.technique === 'sliding' && practice.retainedThrow.sliding;
  }, undefined, 'event-ledger');
  await throwOne(1, 1);
  await throwOne(1, 1);
  expect(model.sequence!.technique, model.instruction).toBe('sliding');
  expect(sawSliding).toBe(true);
  await throwOne(1, -1);
  expect(model.sequence!.throws, model.instruction).toHaveLength(3);
  expect(model.sequence!.locked, model.instruction).toBe(true);
}, 180000);

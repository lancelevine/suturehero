import { expect, it } from 'vitest';
import { createFreeTyingFixture } from './test-support/freeTying';

it.each([
  { name: 'near the working jaws', radius: .4, depth: .3, pullSide: .15, direction: 1 },
  { name: 'from the opposite side', radius: .35, depth: 1.2, pullSide: -.15, direction: -1 },
  { name: 'with a tilted driver', radius: .4, depth: .3, pullSide: .15, direction: 1, rotation: [.2, .25, .3] as [number, number, number] },
])('retains an event-ledger throw $name', async ({ direction, ...motion }) => {
  const { model, throwOne } = createFreeTyingFixture('auto', undefined, motion, 'event-ledger');
  await throwOne(1, direction);
  expect(model.retainedThrow.active, model.instruction).toBe(true);
  expect(model.sequence!.throws).toHaveLength(1);
  expect(model.long.points.every((point) => point.toArray().every(Number.isFinite))).toBe(true);
}, 180000);

it('rejects a lost post instead of manufacturing an event-ledger throw', async () => {
  const motion = { radius: .4, depth: .3, pullSide: .2, rotation: [.6, .4, .3] as [number, number, number] };
  const { model, throwOne } = createFreeTyingFixture('auto', undefined, motion, 'event-ledger');
  await throwOne(1, 1);
  expect(model.retainedThrow.active).toBe(false);
  expect(model.retainedThrow.lastFailure).toContain('Loop slipped off');
  expect(model.sequence!.throws).toHaveLength(0);
}, 180000);

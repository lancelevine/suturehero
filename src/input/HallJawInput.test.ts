import { expect, it } from 'vitest';
import { HallJawInput, HallJawMapper, SyntheticHallSensorSource } from './HallJawInput';

it('maps, clamps, filters, and rejects stale Hall readings in either sensor direction', () => {
  const normal = new HallJawMapper('needleDriver', { closed: 100, open: 900 });
  expect(normal.update({ instrument: 'needleDriver', raw: 100, at: 0 })!.openness).toBe(0);
  const middle = normal.update({ instrument: 'needleDriver', raw: 500, at: 30 })!;
  expect(middle.openness).toBeGreaterThan(0.3);
  expect(middle.openness).toBeLessThan(0.5);
  expect(normal.update({ instrument: 'needleDriver', raw: 1200, at: 60 })!.openness).toBeLessThanOrEqual(1);
  const current = normal.current()!;
  expect(normal.update({ instrument: 'needleDriver', raw: 100, at: 50 })).toEqual(current);
  const inverted = new HallJawMapper('forceps', { closed: 900, open: 100 });
  expect(inverted.update({ instrument: 'forceps', raw: 100, at: 1 })!.openness).toBe(1);
});

it('routes a deterministic synthetic multi-instrument source and can recalibrate', async () => {
  const source = new SyntheticHallSensorSource();
  const input = new HallJawInput(source, { needleDriver: { closed: 0, open: 1000 } });
  const values: number[] = [];
  input.subscribe((value) => values.push(value.openness));
  await input.start();
  source.emit('needleDriver', 250, 10);
  source.emit('forceps', 500, 10);
  expect(input.value('needleDriver')!.openness).toBe(.25);
  expect(input.value('forceps')).toBeNull();
  input.recalibrate('forceps', { closed: 1000, open: 0 });
  source.emit('forceps', 500, 20);
  expect(input.value('forceps')!.openness).toBe(.5);
  expect(values).toEqual([.25, .5]);
  await input.stop();
  source.emit('needleDriver', 1000, 30);
  expect(input.value('needleDriver')!.raw).toBe(250);
});

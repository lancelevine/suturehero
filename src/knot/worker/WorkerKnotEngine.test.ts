import { expect, it } from 'vitest';
import { tieKnot } from '../../gameplay/test-support/knotTrials';
import { KnotHost } from './KnotHost';
import { LocalKnotPort, WorkerKnotEngine } from './WorkerKnotEngine';

const throughStandIn = async (speed: number, fps: number, throws: Array<[number, number]>) => {
  const host = new KnotHost();
  const engine = new WorkerKnotEngine(new LocalKnotPort(host));
  await tieKnot(engine, speed, fps, throws);
  return { host, engine };
};

// Note: at 1× speed, 60 fps the second throw ends at the thread's reach limit and tightens or not
// depending on a single frame (the classic engine directly tightens it; one frame later it does not).
it('ties and locks a surgeon’s knot through the stand-in, with the knot model a frame behind (as in a worker)', async () => {
  const { host, engine } = await throughStandIn(2, 60, [[2, 1], [1, -1]]);
  expect(host.model.sequence?.technique, host.model.instruction).toBe('surgeon');
  expect(host.model.sequence?.locked, host.model.instruction).toBe(true);
  // The stand-in shows the same state, and its thread matches the model's.
  for (let i = 0; i < 3; i++) engine.update(1 / 60, []);
  expect(engine.sequence?.locked).toBe(true);
  expect(engine.long.count).toBe(host.model.long.count);
  expect(engine.short.points.at(-1)!.distanceTo(host.model.short.points.at(-1)!)).toBeLessThan(0.05);
}, 300000);

it('forms the double first throw through the stand-in at normal speed', async () => {
  const { host } = await throughStandIn(1, 60, [[2, 1]]);
  expect(host.model.sequence?.technique, host.model.instruction).toBe('surgeon');
  expect(host.model.sequence?.throws[0].wraps).toBe(2);
}, 300000);

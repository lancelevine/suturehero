import { expect, it } from 'vitest';
import { CameraMarkerState, MARKER_LIVE_MS } from './CameraMarkerState';

const marker = (id: number, x = 0) => ({ id, corners: [{ x, y: 0 }, { x: x + 1, y: 0 }, { x: x + 1, y: 1 }, { x, y: 1 }] });

it('keeps flow markers live for MARKER_LIVE_MS and clears them on an empty flow result', () => {
  const state = new CameraMarkerState(0);
  state.applyFlow([marker(1)], 100);
  expect(state.live(100 + MARKER_LIVE_MS).map((m) => m.id)).toEqual([1]);
  expect(state.live(101 + MARKER_LIVE_MS)).toEqual([]);
  expect(state.latestFlowAt).toBe(100);
  state.applyFlow([], 120);
  expect(state.live(120)).toEqual([]);
  expect([state.at, state.latestFlowAt]).toEqual([120, 100]);
});

it('adds newly decoded markers and records decode times', () => {
  const state = new CameraMarkerState(0);
  state.applyFlow([marker(1)], 100);
  state.applyDecode([marker(2, 50)], 110);
  expect(state.live(110).map((m) => m.id).sort()).toEqual([1, 2]);
  expect(state.decodedAge(2, 150)).toBe(40);
  expect(state.decodedAge(1, 150)).toBe(Infinity);
});

it('reports decode and flow rates once per second', () => {
  const state = new CameraMarkerState(0);
  state.applyFlow([], 10);
  state.countDecode();
  expect(state.takeRates(500)).toBeNull();
  expect(state.takeRates(1200)).toEqual({ decodes: 1, flows: 1, seconds: 1.2 });
  expect(state.takeRates(1300)).toBeNull();
});

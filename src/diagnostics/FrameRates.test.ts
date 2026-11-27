import { expect, it } from 'vitest';
import { FpsCounter, FrameRates } from './FrameRates';

it('reports flow and decode counts once per window', () => {
  const rates = new FrameRates(0);
  rates.flow();
  rates.flow();
  rates.decode();
  expect(rates.take(999)).toBeNull();
  expect(rates.take(1250)).toEqual({ flows: 2, decodes: 1, seconds: 1.25 });
  expect(rates.take(1300)).toBeNull();
});

it('reports frames per second once per window', () => {
  const counter = new FpsCounter(0);
  for (let t = 20; t < 1000; t += 20) expect(counter.tick(t)).toBeNull();
  expect(counter.tick(1000)).toBe(50);
  expect(counter.tick(1020)).toBeNull();
});

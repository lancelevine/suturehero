import { expect, it } from 'vitest';
import { FrameRates } from './FrameRates';

it('reports flow and decode counts once per window', () => {
  const rates = new FrameRates(0);
  rates.flow();
  rates.flow();
  rates.decode();
  expect(rates.take(999)).toBeNull();
  expect(rates.take(1250)).toEqual({ flows: 2, decodes: 1, seconds: 1.25 });
  expect(rates.take(1300)).toBeNull();
});

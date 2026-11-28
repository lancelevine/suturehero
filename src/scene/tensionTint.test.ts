import { expect, it } from 'vitest';
import { tensionGlow } from './tensionTint';

it('glows green as the thread draws taut and red when pulled too hard', () => {
  expect(tensionGlow({ state: 'slack', tautness: 0.5, demand: 0 }).getHex()).toBe(0);
  const gentle = tensionGlow({ state: 'gentle', tautness: 1, demand: 0.1 });
  expect(gentle.g).toBeGreaterThan(gentle.r);
  const excessive = tensionGlow({ state: 'excessive', tautness: 1, demand: 0.8 });
  expect(excessive.r).toBeGreaterThan(excessive.g);
});

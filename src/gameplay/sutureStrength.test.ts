import { expect, it } from 'vitest';
import { BreakMonitor, describePull, resolveSize } from './sutureStrength';

it('snaps finer sutures sooner, only after the pull holds over the limit', () => {
  const fine = resolveSize('6-0');
  const monitor = new BreakMonitor();
  expect(monitor.update(0.6, 0.05, fine)).toBe(false);
  expect(monitor.update(0.6, 0.05, fine)).toBe(false);
  expect(monitor.update(0.6, 0.06, fine)).toBe(true);
  const thick = new BreakMonitor();
  for (let i = 0; i < 10; i++) expect(thick.update(0.6, 0.05, resolveSize('3-0'))).toBe(false);
  expect(describePull(thick.peakShare, resolveSize('3-0'))).toBe('Pull: peak 59% of 3-0 breaking point');
  expect(resolveSize('nope').id).toBe('3-0');
});

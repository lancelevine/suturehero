import { afterEach, expect, it, vi } from 'vitest';
import { visibilityFlag } from './visibilityFlag';

afterEach(() => vi.unstubAllGlobals());

it('follows the intersection observer, and is always on without one', () => {
  let report: (entries: Array<{ isIntersecting: boolean }>) => void = () => {};
  vi.stubGlobal('IntersectionObserver', class { constructor(callback: typeof report) { report = callback; } observe() {} });
  const visible = visibilityFlag({} as Element);
  expect(visible()).toBe(false);
  report([{ isIntersecting: true }]);
  expect(visible()).toBe(true);
  vi.unstubAllGlobals();
  expect(visibilityFlag({} as Element)()).toBe(true);
  expect(visibilityFlag(null)()).toBe(false);
});

import { expect, it } from 'vitest';
import { EdgePresentationCheck, gradePresentation } from './edgePresentation';

const edge = (held: boolean, ready: boolean, lift = 0.15, traction = 'gentle') => ({ held, ready, lift, traction });

it('grades the edge hold at each needle entry', () => {
  expect([gradePresentation(edge(false, false)), gradePresentation(edge(true, true)), gradePresentation(edge(true, false, 0.4)), gradePresentation(edge(true, false, 0.02))]).toEqual(['not held', 'everted', 'over-pulled', 'flat']);
  const check = new EdgePresentationCheck();
  check.update(true, edge(true, true));
  check.update(true, edge(false, false));
  check.update(false, edge(false, false));
  check.update(true, edge(false, false));
  expect([check.counts.everted, check.counts['not held'], check.total]).toEqual([1, 1, 2]);
});

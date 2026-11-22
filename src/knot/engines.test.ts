import { expect, it } from 'vitest';
import { FreeKnotPractice } from '../gameplay/FreeKnotPractice';
import { createKnotEngine, KNOT_ENGINES, knotEngineEntry } from './engines';

it('creates the chosen knot engine, falling back to the classic one', () => {
  expect(KNOT_ENGINES.map((e) => e.id)).toContain('classic');
  expect(createKnotEngine('classic')).toBeInstanceOf(FreeKnotPractice);
  expect(knotEngineEntry('no-such-engine').id).toBe('claude');
  expect(knotEngineEntry(null).id).toBe('claude');
});

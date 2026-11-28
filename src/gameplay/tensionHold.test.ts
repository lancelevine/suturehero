import { expect, it } from 'vitest';
import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';
import { describeTensionHold } from './tensionHold';

it('names running loops that went slack', () => {
  expect(describeTensionHold([])).toBe('');
  expect(describeTensionHold([0.5 / SCENE_MM_PER_UNIT])).toBe('Running loops: 1 snug · keep the thread taut between bites');
  expect(describeTensionHold([0, 4 / SCENE_MM_PER_UNIT])).toBe('Running loops: 1 snug · slack at loop 2 (+4.0 mm) · pull the thread taut before the next bite');
});

import { expect, it } from 'vitest';
import { depthVerdict, describeBiteDepths } from './biteDepth';

it('grades each bite by the deepest layer it reached', () => {
  expect([depthVerdict('epidermis'), depthVerdict('dermis'), depthVerdict('subcutaneous fat')]).toEqual(['too shallow', 'dermis', 'too deep']);
  expect(describeBiteDepths([{ deepestLayer: 'dermis', depthMm: 3 }, { deepestLayer: 'subcutaneous fat', depthMm: 6.2 }])).toBe('Bite depth: 1/2 in dermis · pass 2 too deep (6.2 mm)');
  expect(describeBiteDepths([])).toMatch(/make a pass/);
});

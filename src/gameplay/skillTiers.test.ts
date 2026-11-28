import { expect, it } from 'vitest';
import type { SkillReport } from './skillAnalysis';
import { skillTier } from './skillTiers';

const report = (over: Partial<SkillReport>): SkillReport => ({ seconds: 1, pathLengthCm: 0, smoothness: null, accuracyMm: null, jawsControl: null, path: [], ideal: null, speed: [], ...over });

it('awards gold, silver or bronze per skill, lower-is-better where it should', () => {
  expect(skillTier('Smoothness', report({ smoothness: 0.95 }))).toBe('gold');
  expect(skillTier('Smoothness', report({ smoothness: 0.7 }))).toBe('bronze');
  expect(skillTier('Accuracy', report({ accuracyMm: 0.8 }))).toBe('silver');
  expect(skillTier('Accuracy', report({ accuracyMm: 3 }))).toBeNull();
  expect(skillTier('Path length', report({}))).toBeNull();
});

import type { SkillReport } from './skillAnalysis';

/**
 * Skill tiers (roadmap, 2026-11-28): bronze, silver or gold per skill from the Skill Analysis
 * report. Thresholds are practice targets in this sim, not validated standards.
 */
export type Tier = 'gold' | 'silver' | 'bronze' | null;

/** [gold, silver, bronze] cut-offs; higher is better unless `lower`. */
const TIERS: Record<string, { cuts: [number, number, number]; lower?: boolean; value(r: SkillReport): number | null }> = {
  Smoothness: { cuts: [0.9, 0.8, 0.6], value: (r) => r.smoothness },
  Accuracy: { cuts: [0.5, 1, 1.5], lower: true, value: (r) => r.accuracyMm },
  'Jaws control': { cuts: [0.9, 0.8, 0.6], value: (r) => r.jawsControl },
  Tremor: { cuts: [0.05, 0.1, 0.2], lower: true, value: (r) => r.tremorMm ?? null },
};

export function skillTier(label: string, report: SkillReport): Tier {
  const rule = TIERS[label];
  if (!rule) return null;
  const value = rule.value(report);
  if (value === null || value === undefined) return null;
  const [gold, silver, bronze] = rule.cuts;
  const meets = (cut: number) => (rule.lower ? value <= cut : value >= cut);
  return meets(gold) ? 'gold' : meets(silver) ? 'silver' : meets(bronze) ? 'bronze' : null;
}

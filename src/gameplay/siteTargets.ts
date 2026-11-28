import { DEFAULT_TARGETS, type SandboxTargets } from './sandboxSummary';

/** Site-tuned scoring (roadmap). Bite size suited to the body site: finer bites on the face and
 * hand, larger on the scalp and back. Applied only while the bite targets are still the defaults,
 * so a trainer's own targets are kept. Multipliers are illustrative teaching values. */
export const SITE_BITE_SCALE: Record<string, number> = { face: 0.6, hand: 0.75, fragile: 1.1, forearm: 1, scalp: 1.2, back: 1.4 };

export function siteTunedTargets(targets: SandboxTargets, siteId: string | undefined): SandboxTargets {
  const scale = siteId ? SITE_BITE_SCALE[siteId] : undefined;
  const isDefault = targets.biteMinMm === DEFAULT_TARGETS.biteMinMm && targets.biteMaxMm === DEFAULT_TARGETS.biteMaxMm;
  if (!scale || scale === 1 || !isDefault) return targets;
  const round = (mm: number) => Math.round(mm * 2) / 2;
  return { ...targets, biteMinMm: round(targets.biteMinMm * scale), biteMaxMm: round(targets.biteMaxMm * scale) };
}

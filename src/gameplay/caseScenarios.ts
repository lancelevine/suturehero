/** Case-based scenarios (roadmap). A short patient story sets the body site and the goal; the
 * trainee chooses the closure. Fictional teaching cases; not clinical guidance. */
export interface CaseScenario { id: string; site: string; story: string; goal: string; stitches: number }

export const CASE_SCENARIOS: readonly CaseScenario[] = [
  { id: 'kitchen-knife', site: 'forearm', story: 'A 34-year-old cut their forearm on a kitchen knife; a clean 3 cm laceration.', goal: 'close with simple interrupted stitches, edges everted', stitches: 4 },
  { id: 'eyebrow-fall', site: 'face', story: 'A child fell against a table edge and split the skin by the eyebrow.', goal: 'fine bites close to the edge, line up the brow first (landmark)', stitches: 4 },
  { id: 'scalp-bleed', site: 'scalp', story: 'A cyclist has a bleeding scalp laceration after a fall.', goal: 'take wider bites; a running or locked running line controls bleeding', stitches: 5 },
  { id: 'elderly-skin-tear', site: 'fragile', story: 'An 88-year-old on long-term steroids tore the skin of their forearm on a door frame.', goal: 'wide, gentle bites and loose knots; do not cut through', stitches: 3 },
  { id: 'back-excision', site: 'back', story: 'A mole was excised from the upper back; the wound is under tension.', goal: 'start with a surgeon\'s knot, stitch the middle first, keep the spacing tight where the pull is highest', stitches: 5 },
];

export function caseById(id: string | null) {
  return CASE_SCENARIOS.find((c) => c.id === id) ?? null;
}

/** Picks a case other than `current` using `random` in [0, 1). */
export function nextCase(current: string | null, random: () => number) {
  const others = CASE_SCENARIOS.filter((c) => c.id !== current);
  return others[Math.min(others.length - 1, Math.floor(random() * others.length))];
}

export function caseUrl(scenario: CaseScenario, base: string) {
  const url = new URL(base);
  url.searchParams.set('site', scenario.site);
  url.searchParams.set('case', scenario.id);
  return url.toString();
}

export function describeCase(scenario: CaseScenario, tied: number) {
  return `Case: ${scenario.story} Goal: ${scenario.goal} (${Math.min(tied, scenario.stitches)}/${scenario.stitches} stitches)`;
}

import type { TargetResult } from './sandboxSummary';

/** Adaptive next drill (roadmap). Picks one drill aimed at the first missed Sandbox target, in the
 * order the targets are listed. The drills are existing exercises (URL `?exercise=`) or Sandbox
 * focus suggestions; a simple rule, not spaced repetition yet. */
export interface DrillSuggestion { title: string; why: string; href?: string }

const DRILLS: ReadonlyArray<{ match: RegExp; drill: Omit<DrillSuggestion, 'why'> }> = [
  { match: /^Bite /, drill: { title: 'Landmark drill', href: '?exercise=landmark' } },
  { match: /^Symmetric/, drill: { title: 'Landmark drill', href: '?exercise=landmark' } },
  { match: /^Entry angle/, drill: { title: 'Sandbox: five passes entering at 90°, watching the entry-angle readout' } },
  { match: /^Tears/, drill: { title: 'Sandbox: slow passes following the needle curve, forceps holding the edge' } },
  { match: /^Even spacing/, drill: { title: 'Unequal edges drill (spacing along the wound)', href: '?exercise=unequal' } },
  { match: /^Square to wound/, drill: { title: 'Landmark drill', href: '?exercise=landmark' } },
];

export function nextDrill(results: readonly TargetResult[]): DrillSuggestion | null {
  for (const result of results) {
    if (result.met !== false) continue;
    const entry = DRILLS.find((d) => d.match.test(result.label));
    if (entry) return { ...entry.drill, why: `${result.label} missed (${result.detail})` };
  }
  return null;
}

export function describeNextDrill(results: readonly TargetResult[]) {
  const drill = nextDrill(results);
  if (!drill) return results.some((r) => r.met === true) ? 'Next drill: all checked targets met · try the Endurance drill' : '';
  return `Next drill: ${drill.title} · because ${drill.why}`;
}

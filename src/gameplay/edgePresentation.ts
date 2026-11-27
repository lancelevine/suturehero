/**
 * Edge presentation (roadmap, 2026-11-27): how the forceps presented the skin edge at the moment
 * each needle pass entered the skin. Uses the eversion model's own "ready" test
 * (src/tissue/EdgeEversion.ts: held, lifted 0.09–0.3, gentle traction). Approximate.
 */
export type Presentation = 'everted' | 'flat' | 'over-pulled' | 'not held';

/** Lifts above this (scene units) pull the edge up too far. */
const MAX_LIFT = 0.3;

export function gradePresentation(edge: { held: boolean; ready: boolean; lift: number; traction: string }): Presentation {
  if (!edge.held) return 'not held';
  if (edge.ready) return 'everted';
  if (edge.lift > MAX_LIFT || ['stretching', 'slipping', 'slipped'].includes(edge.traction)) return 'over-pulled';
  return 'flat';
}

/** Grades each pass once, when the needle enters the skin. */
export class EdgePresentationCheck {
  readonly counts: Record<Presentation, number> = { everted: 0, flat: 0, 'over-pulled': 0, 'not held': 0 };
  private wasInTissue = false;

  update(inTissue: boolean, edge: { held: boolean; ready: boolean; lift: number; traction: string }) {
    if (inTissue && !this.wasInTissue) this.counts[gradePresentation(edge)]++;
    this.wasInTissue = inTissue;
  }

  get total() {
    return Object.values(this.counts).reduce((a, b) => a + b, 0);
  }

  reset() {
    for (const key of Object.keys(this.counts) as Presentation[]) this.counts[key] = 0;
    this.wasInTissue = false;
  }
}

import type { CrossingDiagram } from './crossingDiagram';

/**
 * Knot topology, step 2 (2026-11-15, shadow research): the Gauss code of a crossing
 * diagram and its simplification. The Gauss code lists the crossings in the order the
 * thread passes them, each pass marked over or under. Crossings a tug would undo are
 * removed until none are left:
 *  - a twist (Reidemeister I): a crossing whose two passes follow each other directly;
 *  - one strand lying across another (Reidemeister II): two crossings passed
 *    consecutively over-over along one stretch and under-under along another.
 * This does not always reach the fewest crossings, but removes the slack loops and
 * overlaps a loose thread makes.
 */

export interface Pass {
  crossing: number;
  over: boolean;
}

export interface GaussCode {
  passes: Pass[];
  /** Sign (+1 / −1) of each crossing id still present. */
  signs: Map<number, 1 | -1>;
}

export function gaussCode(diagram: CrossingDiagram): GaussCode {
  const passes = diagram.crossings
    .flatMap((c, id) => [
      { at: c.over, crossing: id, over: true },
      { at: c.under, crossing: id, over: false },
    ])
    .sort((a, b) => a.at - b.at)
    .map(({ crossing, over }) => ({ crossing, over }));
  return { passes, signs: new Map(diagram.crossings.map((c, id) => [id, c.sign])) };
}

const without = (code: GaussCode, ids: ReadonlySet<number>): GaussCode => ({
  passes: code.passes.filter((p) => !ids.has(p.crossing)),
  signs: new Map([...code.signs].filter(([id]) => !ids.has(id))),
});

/** One removable twist (R1), or null. */
function findTwist(passes: readonly Pass[]): number | null {
  const n = passes.length;
  for (let i = 0; i < n; i++) if (passes[i].crossing === passes[(i + 1) % n].crossing) return passes[i].crossing;
  return null;
}

/** One removable overlap pair (R2), or null. */
function findOverlap(passes: readonly Pass[]): [number, number] | null {
  const n = passes.length;
  const pairs = new Map<string, Array<{ over: boolean }>>();
  for (let i = 0; i < n; i++) {
    const a = passes[i], b = passes[(i + 1) % n];
    if (a.crossing === b.crossing || a.over !== b.over) continue;
    const key = a.crossing < b.crossing ? `${a.crossing},${b.crossing}` : `${b.crossing},${a.crossing}`;
    const seen = pairs.get(key) ?? [];
    if (seen.some((s) => s.over !== a.over)) return [a.crossing, b.crossing];
    seen.push({ over: a.over });
    pairs.set(key, seen);
  }
  return null;
}

/** Removes twists and overlaps until none remain. */
export function simplify(code: GaussCode): GaussCode {
  let current = code;
  for (;;) {
    const twist = findTwist(current.passes);
    if (twist !== null) {
      current = without(current, new Set([twist]));
      continue;
    }
    const overlap = findOverlap(current.passes);
    if (overlap) {
      current = without(current, new Set(overlap));
      continue;
    }
    return current;
  }
}

/** Number of crossings in a code. */
export const crossingCount = (code: GaussCode) => code.signs.size;

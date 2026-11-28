import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';

/**
 * Knot placement check (roadmap, 2026-11-27): skin knots should sit off the incision (not over the
 * wound line at x = 0) and on the same side every time. The knot is approximated as the midpoint of
 * the closest approach between the long and short strands (where they cross in the knot).
 * Approximate, from the thread simulation.
 */
export const OFF_INCISION_MM = 1.5;

type Point = { x: number; y: number; z: number };

export function knotPoint(long: readonly Point[], short: readonly Point[]): Point | null {
  let best: [Point, Point] | null = null;
  let bestDistance = Infinity;
  for (const a of long) {
    for (const b of short) {
      const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = [a, b];
      }
    }
  }
  if (!best) return null;
  return { x: (best[0].x + best[1].x) / 2, y: (best[0].y + best[1].y) / 2, z: (best[0].z + best[1].z) / 2 };
}

export type KnotSide = 'left' | 'right' | 'on the incision';

export function knotSide(x: number): KnotSide {
  if (Math.abs(x) * SCENE_MM_PER_UNIT < OFF_INCISION_MM) return 'on the incision';
  return x < 0 ? 'left' : 'right';
}

export function describeKnotPlacement(sides: readonly KnotSide[]) {
  if (!sides.length) return '';
  const on = sides.filter((s) => s === 'on the incision').length;
  const left = sides.filter((s) => s === 'left').length;
  const right = sides.filter((s) => s === 'right').length;
  const sameSide = left === 0 || right === 0;
  const parts = [`Knots: ${sides.length - on}/${sides.length} off the incision`];
  if (on) parts.push(`${on} on the wound line`);
  parts.push(sameSide ? (left || right ? `all on the ${left ? 'left' : 'right'}` : 'no side yet') : `${left} left, ${right} right · keep them on one side`);
  return parts.join(' · ');
}

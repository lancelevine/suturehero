import * as THREE from 'three';
import { crossingDiagram } from './crossingDiagram';
import { crossingCount, gaussCode, simplify } from './gaussCode';
import { formatPolynomial, jonesPolynomial, type Polynomial } from './jones';

/**
 * Knot topology, step 4 (2026-11-15, shadow research): the knot a suture thread forms.
 * The thread is open, so it is closed into a loop: from the short tail's free end along
 * the short strand to the entry, under the skin to the exit (the stitch's path through
 * the tissue), along the long strand to its free end, then far above everything and
 * back down to the short tail's free end. The Jones polynomial of that loop names
 * the knot: a single throw closes to a trefoil, a square knot to a trefoil plus a
 * mirror trefoil, a granny to two trefoils of the same hand.
 *
 * NOT YET VALIDATED (2026-11-15): free-tying fixture knots all read as the unknot, and so
 * did a synthetic overhand whose ends leave near the knot's middle. Either this closure
 * runs back through the knot, or the simulated strands pass through each other.
 */

/** How far below the skin the closing path through the tissue runs, and how high the outer closure arc goes (scene units). */
const UNDER_SKIN = 0.15;
const ABOVE_ALL = 20;
/** Every Nth thread point is used (the thread has ~100 points; fewer keep the diagram small). */
const STRIDE = 2;

export function closedThread(long: readonly THREE.Vector3[], short: readonly THREE.Vector3[], entry: THREE.Vector3, exit: THREE.Vector3): THREE.Vector3[] {
  const thin = (points: readonly THREE.Vector3[]) => points.filter((_, i) => i % STRIDE === 0 || i === points.length - 1);
  const shortFromTail = [...thin(short)].reverse();
  const tract = [entry.clone().add(new THREE.Vector3(0, -UNDER_SKIN, 0)), exit.clone().add(new THREE.Vector3(0, -UNDER_SKIN, 0))];
  const longEnd = long[long.length - 1], tailEnd = short[short.length - 1];
  const closure = [longEnd.clone().setY(ABOVE_ALL), tailEnd.clone().setY(ABOVE_ALL)];
  return [...shortFromTail, ...tract, ...thin(long), ...closure];
}

const p = (terms: Array<[number, number]>): Polynomial => new Map(terms);
const times = (a: Polynomial, b: Polynomial): Polynomial => {
  const out: Polynomial = new Map();
  for (const [ea, ca] of a) for (const [eb, cb] of b) out.set(ea + eb, (out.get(ea + eb) ?? 0) + ca * cb);
  for (const [e, c] of out) if (c === 0) out.delete(e);
  return out;
};
const mirror = (a: Polynomial): Polynomial => new Map([...a].map(([e, c]) => [-e, c]));
/** Jones polynomials (quarter powers of t). One handedness of each; mirrors are matched too. */
const TREFOIL = p([[4, 1], [12, 1], [16, -1]]);
const FIVE_TWO = p([[-4, 1], [-8, -1], [-12, 2], [-16, -1], [-20, 1], [-24, -1]]);
const NAMED: Array<[string, Polynomial]> = [
  ['unknot', p([[0, 1]])],
  ['trefoil (single throw)', TREFOIL],
  ['5₂ (double throw)', FIVE_TWO],
  ['square knot', times(TREFOIL, mirror(TREFOIL))],
  ['granny knot', times(TREFOIL, TREFOIL)],
  ['surgeon’s + opposing', times(FIVE_TWO, TREFOIL)],
  ['surgeon’s + same direction', times(FIVE_TWO, mirror(TREFOIL))],
];
const same = (a: Polynomial, b: Polynomial) => a.size === b.size && [...a].every(([e, c]) => b.get(e) === c);

export interface ThreadKnot {
  /** Crossings after simplification (before: in the raw view). */
  crossings: number;
  rawCrossings: number;
  jones: string | null;
  /** A recognised knot name, with "(mirror)" for the other handedness, or null. */
  name: string | null;
}

export function threadKnot(long: readonly THREE.Vector3[], short: readonly THREE.Vector3[], entry: THREE.Vector3, exit: THREE.Vector3): ThreadKnot {
  const code = gaussCode(crossingDiagram(closedThread(long, short, entry, exit)));
  const reduced = simplify(code);
  const jones = jonesPolynomial(reduced);
  let name: string | null = null;
  if (jones) {
    for (const [label, poly] of NAMED) {
      if (same(jones, poly)) name = label;
      else if (same(jones, mirror(poly))) name = `${label} (mirror)`;
      if (name) break;
    }
  }
  return { crossings: crossingCount(reduced), rawCrossings: crossingCount(code), jones: jones ? formatPolynomial(jones) : null, name };
}

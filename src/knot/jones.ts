import type { GaussCode } from './gaussCode';

/**
 * Knot topology, step 3 (2026-11-15, shadow research): the Jones polynomial of a knot
 * from its Gauss code, by the Kauffman bracket state sum. Unlike simpler measures it
 * tells a square knot (trefoil + mirror trefoil) from a granny (trefoil + trefoil).
 * Exponential in the number of crossings, so diagrams above MAX_CROSSINGS are not
 * evaluated (simplify first).
 *
 * Polynomials are maps exponent → coefficient. The bracket is in A; the Jones
 * polynomial is returned in powers of t^(1/4) (exponent k means t^(k/4)).
 */
export type Polynomial = Map<number, number>;

export const MAX_CROSSINGS = 18;

const add = (into: Polynomial, exponent: number, coefficient: number) => {
  const value = (into.get(exponent) ?? 0) + coefficient;
  if (value === 0) into.delete(exponent);
  else into.set(exponent, value);
};

const multiply = (a: Polynomial, b: Polynomial): Polynomial => {
  const out: Polynomial = new Map();
  for (const [ea, ca] of a) for (const [eb, cb] of b) add(out, ea + eb, ca * cb);
  return out;
};

/** (−A² − A⁻²)^k */
const loopFactor = (() => {
  const cache: Polynomial[] = [new Map([[0, 1]])];
  const d: Polynomial = new Map([[2, -1], [-2, -1]]);
  return (k: number) => {
    while (cache.length <= k) cache.push(multiply(cache[cache.length - 1], d));
    return cache[k];
  };
})();

/** Number of loops after smoothing every crossing (choice bit 1 = oriented smoothing). */
function loops(code: GaussCode, ids: readonly number[], choice: number): number {
  const n = code.passes.length;
  // Nodes: 2k = the end arriving at pass k, 2k+1 = the end leaving pass k.
  const parent = Array.from({ length: 2 * n }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const join = (a: number, b: number) => (parent[find(a)] = find(b));
  for (let k = 0; k < n; k++) join(2 * k + 1, 2 * ((k + 1) % n));
  const positions = new Map<number, { over: number; under: number }>();
  code.passes.forEach((p, k) => {
    const entry = positions.get(p.crossing) ?? { over: -1, under: -1 };
    if (p.over) entry.over = k;
    else entry.under = k;
    positions.set(p.crossing, entry);
  });
  ids.forEach((id, bit) => {
    const { over, under } = positions.get(id)!;
    if ((choice >> bit) & 1) {
      join(2 * over, 2 * under + 1);
      join(2 * under, 2 * over + 1);
    } else {
      join(2 * over, 2 * under);
      join(2 * over + 1, 2 * under + 1);
    }
  });
  const roots = new Set<number>();
  for (let i = 0; i < 2 * n; i++) roots.add(find(i));
  return roots.size;
}

/** Jones polynomial (exponents in quarter powers of t), or null if the diagram is too large. */
export function jonesPolynomial(code: GaussCode): Polynomial | null {
  const ids = [...code.signs.keys()];
  if (ids.length > MAX_CROSSINGS) return null;
  if (ids.length === 0) return new Map([[0, 1]]);
  const bracket: Polynomial = new Map();
  for (let choice = 0; choice < 1 << ids.length; choice++) {
    // For a positive crossing the oriented smoothing is the A-smoothing; for a negative one, the B-smoothing.
    let aCount = 0;
    ids.forEach((id, bit) => {
      const oriented = ((choice >> bit) & 1) === 1;
      if (oriented === (code.signs.get(id) === 1)) aCount++;
    });
    const exponent = aCount - (ids.length - aCount);
    for (const [e, c] of loopFactor(loops(code, ids, choice) - 1)) add(bracket, e + exponent, c);
  }
  const writhe = [...code.signs.values()].reduce<number>((sum, s) => sum + s, 0);
  // f = (−A³)^(−w) <K>, then A = t^(−1/4).
  const normalised = multiply(bracket, new Map([[-3 * writhe, writhe % 2 === 0 ? 1 : -1]]));
  return new Map([...normalised].map(([e, c]) => [-e, c]));
}

/** Readable form, e.g. "t^-4 + t^-3 - t^-1" (quarter powers shown as fractions). */
export function formatPolynomial(p: Polynomial): string {
  if (p.size === 0) return '0';
  return [...p]
    .sort((a, b) => a[0] - b[0])
    .map(([e, c], i) => {
      const power = e % 4 === 0 ? `${e / 4}` : `${e}/4`;
      const term = e === 0 ? `${Math.abs(c)}` : `${Math.abs(c) === 1 ? '' : Math.abs(c)}t^${power}`;
      return `${i === 0 ? (c < 0 ? '-' : '') : c < 0 ? ' - ' : ' + '}${term}`;
    })
    .join('');
}

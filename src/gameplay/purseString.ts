/** Purse-string stitch (roadmap: "Figure-of-eight and purse-string stitches"). A round defect is
 * marked on the pad (not cut); the purse-string is a series of bites around it. Each bite's entry
 * and exit should sit on the marked ring, going round in one direction, evenly spaced, covering
 * nearly all of the circle. Approximate: graded from the Sandbox passes; cinching is not simulated. */

/** Ring centre and radius (scene units): on the right half of the pad (inside the area the needle can bite), about 11 mm across. */
export const RING_CENTRE = { x: 0.75, z: 0 };
export const RING_RADIUS = 0.2;
/** Entry/exit within this of the ring counts as on it (scene units, about 2 mm). */
export const RING_TOLERANCE = 0.08;
/** Coverage needed for a closed purse-string (degrees). */
export const FULL_COVERAGE_DEG = 300;

type P = { x: number; z: number };
const angleOf = (p: P) => Math.atan2(p.z - RING_CENTRE.z, p.x - RING_CENTRE.x);
const onRing = (p: P) => Math.abs(Math.hypot(p.x - RING_CENTRE.x, p.z - RING_CENTRE.z) - RING_RADIUS) <= RING_TOLERANCE;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function gradePurseString(passes: ReadonlyArray<{ entry: P; exit: P }>) {
  const ringPasses = passes.filter((p) => onRing(p.entry) && onRing(p.exit));
  if (!ringPasses.length) return null;
  // Walk the bite points in order and sum the signed angle travelled around the ring.
  const points = ringPasses.flatMap((p) => [p.entry, p.exit]);
  let travelled = 0, reversals = 0, lastSign = 0;
  const steps: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const step = wrap(angleOf(points[i]) - angleOf(points[i - 1]));
    travelled += step;
    steps.push(Math.abs(step));
    const sign = Math.sign(step);
    if (sign && lastSign && sign !== lastSign) reversals++;
    if (sign) lastSign = sign;
  }
  const coverageDeg = Math.min(360, (Math.abs(travelled) * 180) / Math.PI);
  const mean = steps.reduce((a, b) => a + b, 0) / Math.max(1, steps.length);
  const unevenness = steps.length ? Math.max(...steps.map((s) => Math.abs(s - mean))) / Math.max(1e-6, mean) : 0;
  return { bites: ringPasses.length, offRing: passes.length - ringPasses.length, coverageDeg, reversals, even: unevenness <= 0.5 };
}

export function describePurseString(grade: ReturnType<typeof gradePurseString>) {
  if (!grade) return 'Purse-string: take small bites in and out along the purple ring, going round it in one direction';
  const notes = [`Purse-string: ${grade.bites} bite${grade.bites === 1 ? '' : 's'} on the ring · ${Math.round(grade.coverageDeg)}° covered`];
  notes.push(grade.coverageDeg >= FULL_COVERAGE_DEG ? 'ring closed · ready to cinch' : 'keep going round');
  if (grade.reversals) notes.push('keep going in one direction');
  if (!grade.even) notes.push('space the bites more evenly');
  if (grade.offRing) notes.push(`${grade.offRing} bite${grade.offRing === 1 ? '' : 's'} off the ring`);
  return notes.join(' · ');
}

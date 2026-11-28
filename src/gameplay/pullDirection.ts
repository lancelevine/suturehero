/** Pull direction when tying (roadmap). As each throw snugs down, the two strands should be pulled
 * straight across the wound, in line with the bite, and roughly flat to the skin. The pull line is
 * taken between the two instrument tips (the wound runs along z, so "across" is x). Approximate:
 * uses the tips, not the strands themselves. */
export type PullVerdict = 'across' | 'along the wound' | 'upward';

/** A pull more than this far off straight across (degrees, seen from above) counts as along the wound. */
export const MAX_OFF_ACROSS_DEG = 35;
/** A pull rising more steeply than this (degrees above the skin) counts as upward. */
export const MAX_RISE_DEG = 45;

export function classifyPull(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): PullVerdict {
  const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y), dz = Math.abs(b.z - a.z);
  const flat = Math.hypot(dx, dz);
  if (Math.atan2(dy, flat) * 180 / Math.PI > MAX_RISE_DEG) return 'upward';
  return Math.atan2(dz, dx) * 180 / Math.PI > MAX_OFF_ACROSS_DEG ? 'along the wound' : 'across';
}

export function describePulls(verdicts: readonly PullVerdict[]) {
  if (!verdicts.length) return '';
  const across = verdicts.filter((v) => v === 'across').length;
  const last = verdicts[verdicts.length - 1];
  const advice = last === 'across' ? 'good' : last === 'upward' ? 'pull flatter, along the skin' : 'pull straight across the wound, in line with the bite';
  return `Throw pull: ${across}/${verdicts.length} straight across · last ${last} · ${advice}`;
}

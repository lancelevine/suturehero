/** Edges that slide sideways (roadmap). A bite wider on one side pulls the wound line toward that
 * side when tied, so the edges shear along the wound. Estimated per pass as half the difference
 * between its entry and exit distances from the edge (mm); approximate, not a tissue simulation. */

/** A shift larger than this (mm) at one stitch is flagged. */
export const MAX_SHIFT_MM = 0.75;

export function edgeShiftMm(entryEdgeMm: number, exitEdgeMm: number) {
  return (entryEdgeMm - exitEdgeMm) / 2;
}

export function describeEdgeShear(passes: ReadonlyArray<{ entryEdgeMm: number; exitEdgeMm: number | null }>) {
  const shifts = passes.filter((p) => p.exitEdgeMm !== null).map((p) => edgeShiftMm(p.entryEdgeMm, p.exitEdgeMm!));
  if (!shifts.length) return '';
  const flagged = shifts.map((shift, i) => ({ pass: i + 1, shift })).filter((p) => Math.abs(p.shift) > MAX_SHIFT_MM);
  const worst = Math.max(...shifts.map(Math.abs));
  if (!flagged.length) return `Edge shear: wound line stays centred (largest shift ${worst.toFixed(1)} mm)`;
  return `Edge shear: ${flagged.slice(0, 3).map((p) => `pass ${p.pass} pulls the line ${Math.abs(p.shift).toFixed(1)} mm toward the ${p.shift > 0 ? 'entry' : 'exit'} side`).join(', ')} · take equal bites on both sides`;
}

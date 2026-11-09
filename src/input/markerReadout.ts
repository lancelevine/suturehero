/**
 * The tracking page's marker list ("Visible markers").
 *
 * Lists only markers decoded within MARKER_READOUT_DECODED_MS, the same rule
 * as the overlay outlines: optical flow can carry an outline for seconds after
 * its face has turned away (build 0.126), which made hidden faces look visible.
 */

/** Marker list: only IDs decoded within this time (ms). */
export const MARKER_READOUT_DECODED_MS = 650;

export function markerReadoutText(observedIds: readonly number[], lastDecodedAt: ReadonlyMap<number, number>, now: number): string {
  const decoded = observedIds.filter((id) => now - (lastDecodedAt.get(id) ?? -Infinity) <= MARKER_READOUT_DECODED_MS);
  const sorted = [...new Set(decoded)].sort((a, b) => a - b);
  return sorted.length ? sorted.join(', ') : 'None visible';
}

import { TISSUE_LAYERS } from '../tissue/anatomy';

/** Dead space check (roadmap: "Dead space check"). The practice wound runs through the full dermis;
 * a bite whose deepest point stays well above the dermis floor leaves the deep wound unclosed under
 * it, where fluid can collect. Approximate, from the pass's deepest point in the practice scene. */

/** A pass leaving more than this share of the dermis unclosed below it is flagged. */
export const DEAD_SPACE_SHARE = 0.35;

/** Depth of wound left open below a pass, in scene units (0 if the bite reached the dermis floor). */
export function deadSpaceBelow(depthBelowSurface: number) {
  const deepest = TISSUE_LAYERS.epidermis.top - depthBelowSurface;
  return Math.max(0, deepest - TISSUE_LAYERS.dermis.bottom);
}

export function leavesDeadSpace(depthBelowSurface: number) {
  const dermis = TISSUE_LAYERS.dermis.top - TISSUE_LAYERS.dermis.bottom;
  return deadSpaceBelow(depthBelowSurface) > DEAD_SPACE_SHARE * dermis;
}

export function describeDeadSpace(depths: readonly number[], mmPerUnit: number) {
  if (!depths.length) return '';
  const shallow = depths.map((d, i) => ({ pass: i + 1, gapMm: deadSpaceBelow(d) * mmPerUnit, flagged: leavesDeadSpace(d) })).filter((p) => p.flagged);
  if (!shallow.length) return 'Dead space: none · every bite reaches the deep dermis';
  return `Dead space under ${shallow.slice(0, 3).map((p) => `pass ${p.pass} (${p.gapMm.toFixed(1)} mm)`).join(', ')}${shallow.length > 3 ? ` +${shallow.length - 3}` : ''} · take those bites deeper`;
}

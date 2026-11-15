import * as THREE from 'three';
import { DERMAL_MIDPOINT } from './anatomy';
import { tractPoint, type FreeTract } from './FreeNeedlePass';

/**
 * Dermal "bites" of a free pass for the wound model (Stage B3, 2026-11-15):
 * where the pass's path through the tissue crosses the middle of the dermis
 * on each side of the wound. WoundApproximation.setDermalBites takes the
 * right side (x > 0) first and the left side (x < 0) second; a side the
 * pass does not reach at dermal depth is null, so the knot cannot close the
 * wound on that side.
 */

/** Samples along the tract when searching for the dermal crossings. */
const SAMPLES = 64;

export function freePassBites(tract: FreeTract): [THREE.Vector3 | null, THREE.Vector3 | null] {
  const end = tract.exitAngle;
  if (end === null) return [null, null];
  const crossings: THREE.Vector3[] = [];
  let previous = tractPoint(tract, 0);
  for (let i = 1; i <= SAMPLES; i++) {
    const point = tractPoint(tract, (end * i) / SAMPLES);
    const before = previous.y - DERMAL_MIDPOINT, after = point.y - DERMAL_MIDPOINT;
    if (before === 0 || Math.sign(before) !== Math.sign(after)) crossings.push(previous.clone().lerp(point, before / (before - after || 1)));
    previous = point;
  }
  const right = crossings.filter((p) => p.x > 0).sort((a, b) => b.x - a.x)[0] ?? null;
  const left = crossings.filter((p) => p.x < 0).sort((a, b) => a.x - b.x)[0] ?? null;
  return [right, left];
}

import * as THREE from 'three';
import { TISSUE_LAYERS } from '../tissue/anatomy';

/**
 * Sandbox (2026-11-15): a needle nobody holds falls and rests on the pad
 * (or the base around it) instead of hanging in the air. Only drops
 * straight down at FALL_SPEED; its orientation is kept.
 */

/** Pad top (skin surface) and the pad's half extents, scene units (TissuePatch box 2.62 × 3.35). */
const PAD_SURFACE_Y = TISSUE_LAYERS.epidermis.top;
const PAD_HALF_X = 1.31;
const PAD_HALF_Z = 1.675;
/** Height of the base plate around the pad. */
const BASE_Y = 0.04;
/** Gap kept between the needle's lowest point and the surface. */
export const REST_CLEARANCE = 0.006;
/** Falling speed, scene units per second (about 8 cm/s). */
export const FALL_SPEED = 3;

/** Surface height under a point: the pad top over the pad, else the base. */
export function surfaceBelow(x: number, z: number): number {
  return Math.abs(x) <= PAD_HALF_X && Math.abs(z) <= PAD_HALF_Z ? PAD_SURFACE_Y : BASE_Y;
}

/**
 * Lowers `root` toward resting on the surface under its lowest point
 * (`localPoints` in root coordinates). Returns how far it moved.
 */
export function settleNeedle(root: THREE.Object3D, localPoints: readonly THREE.Vector3[], dt: number): number {
  root.updateWorldMatrix(true, false);
  let gap = Infinity;
  for (const point of localPoints) {
    const world = point.clone().applyMatrix4(root.matrixWorld);
    gap = Math.min(gap, world.y - (surfaceBelow(world.x, world.z) + REST_CLEARANCE));
  }
  if (!(gap > 1e-6)) return 0;
  const drop = Math.min(gap, FALL_SPEED * Math.max(0, dt));
  root.position.y -= drop;
  root.updateWorldMatrix(true, false);
  return drop;
}

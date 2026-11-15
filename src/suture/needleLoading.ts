import type * as THREE from 'three';

/**
 * Needle loading check (2026-11-15): where along the needle the driver holds
 * it, as a fraction from the swage (0) to the tip (1). Teaching guidance is to
 * grip about a third to a half of the way from the swage: nearer the swage
 * bends the needle, nearer the tip makes it hard to drive and blunts it.
 */
export const LOADING_MIN = 0.2;
export const LOADING_MAX = 0.6;

/** Fraction from swage to tip for a point on the needle (needle-local, arc in XZ from angle 0). */
export function loadingFraction(localPoint: THREE.Vector3, arc: number): number {
  const angle = Math.atan2(localPoint.z, localPoint.x);
  return Math.min(1, Math.max(0, angle / arc));
}

export type LoadingVerdict = 'good' | 'near swage' | 'near tip';

export function loadingVerdict(fraction: number): LoadingVerdict {
  return fraction < LOADING_MIN ? 'near swage' : fraction > LOADING_MAX ? 'near tip' : 'good';
}

export function describeLoading(fraction: number): string {
  const percent = `${Math.round(fraction * 100)}% from the swage`;
  const verdict = loadingVerdict(fraction);
  if (verdict === 'near swage') return `Gripped ${percent} · too near the swage (bends the needle) · regrasp a third to half way along`;
  if (verdict === 'near tip') return `Gripped ${percent} · too near the tip (hard to drive) · regrasp a third to half way along`;
  return `Gripped ${percent} · good loading`;
}

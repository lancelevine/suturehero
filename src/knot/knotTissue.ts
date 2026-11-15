import type * as THREE from 'three';
import { createMicroEnvironment, environments } from '../environments/PracticeEnvironment';
import type { MicroTarget } from '../environments/MicroTargets';
import { retainedSurfaceLift, type TissueSite } from '../tissue/StitchField';

/**
 * The tissue under free tying, as plain data (2026-11-15) so it can be sent to a knot
 * engine in a worker, which rebuilds the same surface function from it. The practice
 * session describes the tissue with this each frame (the stitch field changes as the
 * wound closes).
 */
export interface KnotTissue {
  environment: 'skin' | 'microsurgery';
  microTarget?: MicroTarget;
  /** The current stitch site along the pad (pad z offset). */
  siteZ: number;
  /** Stitch sites shaping the skin (saved stitches plus the active one). */
  field: readonly TissueSite[];
}

/** Pad and tray extents used for the skin surface (scene units). */
const PAD_HALF_X = 2.68;
const PAD_HALF_Z = 1.68;
const TRAY_HALF_X = 3.5;
const TRAY_HALF_Z = 2.5;

const microEnvironments = new Map<MicroTarget, ReturnType<typeof createMicroEnvironment>>();
/** The microsurgery environment for a target (built once). */
export function microEnvironment(target: MicroTarget | undefined) {
  if (!target) return environments.microsurgery;
  let environment = microEnvironments.get(target);
  if (!environment) {
    environment = createMicroEnvironment(target);
    microEnvironments.set(target, environment);
  }
  return environment;
}

/** Skin surface (or the microsurgery environment's surface) under `p`, as the session computes it for free tying. */
export function knotSurfaceAt(tissue: KnotTissue, p: THREE.Vector3): number {
  if (tissue.environment !== 'skin') return microEnvironment(tissue.microTarget).surfaceAt(p);
  const z = p.z + tissue.siteZ;
  const onPad = Math.abs(p.x) <= PAD_HALF_X && Math.abs(z) <= PAD_HALF_Z;
  const base = onPad ? 0.423 : Math.abs(p.x) <= TRAY_HALF_X && Math.abs(p.z) <= TRAY_HALF_Z ? 0.055 : -0.075;
  return base + (onPad ? retainedSurfaceLift(p.x, z, tissue.field) : 0);
}

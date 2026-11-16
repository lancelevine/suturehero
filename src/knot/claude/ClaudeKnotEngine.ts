import * as THREE from 'three';
import { FreeKnotPractice } from '../../gameplay/FreeKnotPractice';
import type { Instrument } from '../../instruments/Instrument';
import type { ThreadStrand } from '../../suture/ThreadStrand';

/**
 * Claude's knot engine (2026-11-16). The classic model (its thread physics and throw
 * recognition are the best tested; topology cannot recognise suture knots, see the handoff
 * log) with fixes for failures found by the engine comparison (src/knot/engineTrials.test.ts):
 *
 * - Regrasping a free end: the classic grasp takes the nearest thread point, so a needle
 *   driver closing on the short tail's end could take the long strand lying beside it
 *   (and a 3-throw knot then lost its third throw). Here, when the jaws close within reach
 *   of the free end that instrument works with (driver: short tail, forceps: long strand),
 *   that end is taken.
 */

/** Grasp reach from the jaw surface (scene units), as the classic grasp. */
const REACH = 0.085;
/** Jaw point in the instrument's frame. */
const JAW = new THREE.Vector3(0, 0, 0.05);

export class ClaudeKnotEngine extends FreeKnotPractice {
  protected override grasp(tool: Instrument) {
    super.grasp(tool);
    const strand: ThreadStrand = tool.kind === 'needle-driver' ? this.short : this.long;
    const end = strand.count - 1;
    const current = this.grips.get(tool.id);
    if (current?.strand === strand && current.index >= end - 3) return;
    const jaw = tool.root.localToWorld(JAW.clone());
    const reach = Math.max(0, jaw.distanceTo(strand.points[end]) - (tool.kind === 'needle-driver' ? tool.jawRadius : 0));
    if (reach > REACH) return;
    if ([...this.grips.values()].some((g) => g.strand === strand && g.index === end)) return;
    const local = tool.root.worldToLocal(strand.points[end].clone());
    if (tool.kind === 'needle-driver') local.set(0, 0, THREE.MathUtils.clamp(local.z, JAW.z - 0.035, JAW.z + 0.035));
    this.grips.set(tool.id, { strand, index: end, local });
  }
}

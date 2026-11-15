import * as THREE from 'three';
import { TISSUE_LAYERS } from './anatomy';

/**
 * Free needle passes for the Sandbox (Stage B1, 2026-11-15): the needle can
 * enter the skin anywhere on the pad, at any angle. Once the tip is in, a
 * curved needle can only advance (or back out) along its own circle, so the
 * pose the holder wants is reduced to a rotation about the needle's arc
 * axis through its arc centre, both fixed at entry. The difference between
 * the wanted and the allowed pose is "forcing" (tissue trauma in reality).
 *
 * Needle geometry (src/suture/SutureModel.ts): an arc of radius `radius` in
 * the needle's local XZ plane around its local origin, swage at angle 0,
 * tip at `arc`. Advancing the tip is a rotation about local −Y.
 */

/** The skin surface (scene units) and the pad's extent. */
export const SKIN_SURFACE_Y = TISSUE_LAYERS.epidermis.top;
const PAD_HALF_X = 1.31;
const PAD_HALF_Z = 1.675;
/** The wound runs along z at x = 0. */
export const WOUND_X = 0;
/** Forcing warning thresholds: rotation off the curve (degrees) and arc-centre displacement (scene units, ≈ 3 mm). */
export const FORCING_DEGREES = 15;
export const FORCING_UNITS = 0.11;
/** The tip must emerge this far (scene units, ≈ 1 mm) from the entry to count as an exit. */
const MIN_EXIT_DISTANCE = 0.037;

export type PassLayer = 'epidermis' | 'dermis' | 'subcutaneous fat';

export interface FreePassRecord {
  entry: THREE.Vector3;
  exit: THREE.Vector3 | null;
  /** Deepest needle point below the skin surface (scene units). */
  depth: number;
  deepestLayer: PassLayer;
  /** Entry and exit on opposite sides of the wound. */
  crossesWound: boolean;
}

export function layerAtDepth(depth: number): PassLayer {
  const y = SKIN_SURFACE_Y - depth;
  return y >= TISSUE_LAYERS.dermis.top ? 'epidermis' : y >= TISSUE_LAYERS.dermis.bottom ? 'dermis' : 'subcutaneous fat';
}

const overPad = (p: THREE.Vector3) => Math.abs(p.x) <= PAD_HALF_X && Math.abs(p.z) <= PAD_HALF_Z;

interface Engagement {
  centre: THREE.Vector3;
  /** World axis whose positive rotation advances the tip. */
  axis: THREE.Vector3;
  baseQuaternion: THREE.Quaternion;
  basePosition: THREE.Vector3;
  angle: number;
  /** Advance angle at which the tip came out, or null before it has. */
  exitAngle: number | null;
  record: FreePassRecord;
}

export class FreeNeedlePass {
  private engagement: Engagement | null = null;
  private previousTip: THREE.Vector3 | null = null;
  /** Completed passes (tip in and out), oldest first. */
  readonly passes: FreePassRecord[] = [];
  /** How far the holder is forcing the needle off its curve this frame. */
  forcing = { degrees: 0, units: 0 };

  constructor(private readonly radius: number, private readonly arc: number) {}

  get inTissue() {
    return this.engagement !== null;
  }

  /** The pass in progress, or null. */
  get current(): FreePassRecord | null {
    return this.engagement?.record ?? null;
  }

  get forcingWarning() {
    return this.inTissue && (this.forcing.degrees > FORCING_DEGREES || this.forcing.units > FORCING_UNITS);
  }

  /** Needle tip (world) for a needle root pose. */
  private tip(position: THREE.Vector3, quaternion: THREE.Quaternion) {
    return new THREE.Vector3(Math.cos(this.arc) * this.radius, 0, Math.sin(this.arc) * this.radius).applyQuaternion(quaternion).add(position);
  }

  /**
   * One frame. `wanted` is the needle pose the holder would give it (null if
   * nobody holds it); `driverHolds` whether the needle driver holds it.
   * Returns the pose to give the needle (unchanged when not in tissue).
   */
  update(wanted: { position: THREE.Vector3; quaternion: THREE.Quaternion }, held: boolean, driverHolds: boolean): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
    const e = this.engagement;
    if (!e) {
      const tip = this.tip(wanted.position, wanted.quaternion);
      const previous = this.previousTip;
      this.previousTip = tip.clone();
      this.forcing = { degrees: 0, units: 0 };
      if (driverHolds && previous && previous.y >= SKIN_SURFACE_Y && tip.y < SKIN_SURFACE_Y && overPad(tip)) this.engage(wanted, previous, tip);
      return wanted;
    }
    if (held) {
      // The wanted pose as a rotation about the fixed arc axis, relative to entry.
      const delta = wanted.quaternion.clone().multiply(e.baseQuaternion.clone().invert()).normalize();
      if (delta.w < 0) delta.set(-delta.x, -delta.y, -delta.z, -delta.w);
      const wrapped = 2 * Math.atan2(delta.x * e.axis.x + delta.y * e.axis.y + delta.z * e.axis.z, delta.w);
      // A complete pass turns past 180°: take the equivalent angle nearest the previous one.
      const twist = wrapped + 2 * Math.PI * Math.round((e.angle - wrapped) / (2 * Math.PI));
      // Before the tip exits, the swage stops at the entry; after, the needle can travel until the swage leaves the exit.
      const limit = e.exitAngle === null ? this.arc : e.exitAngle + this.arc;
      e.angle = Math.min(Math.max(twist, -0.05), limit + 0.05);
    }
    const pose = this.poseAt(e, e.angle);
    if (held) {
      const allowedCentre = pose.position;
      this.forcing = { degrees: THREE.MathUtils.radToDeg(wanted.quaternion.angleTo(pose.quaternion)), units: wanted.position.distanceTo(allowedCentre) };
    } else this.forcing = { degrees: 0, units: 0 };
    this.observe(e, pose);
    if (e.angle < 0) {
      // Backed fully out: the pass is abandoned.
      this.engagement = null;
      this.previousTip = this.tip(pose.position, pose.quaternion);
    } else if (e.exitAngle !== null && e.angle >= e.exitAngle + this.arc) {
      // The swage has left the exit: the pass is complete and the needle is free again.
      this.finish(e);
    }
    return pose;
  }

  /** Needle pose after advancing `angle` along the curve from the entry pose. */
  private poseAt(e: Engagement, angle: number) {
    const turn = new THREE.Quaternion().setFromAxisAngle(e.axis, angle);
    const position = e.basePosition.clone().sub(e.centre).applyQuaternion(turn).add(e.centre);
    return { position, quaternion: turn.multiply(e.baseQuaternion).normalize() };
  }

  private engage(wanted: { position: THREE.Vector3; quaternion: THREE.Quaternion }, above: THREE.Vector3, below: THREE.Vector3) {
    const t = (above.y - SKIN_SURFACE_Y) / Math.max(1e-9, above.y - below.y);
    const entry = above.clone().lerp(below, t);
    entry.y = SKIN_SURFACE_Y;
    this.engagement = {
      centre: wanted.position.clone(),
      axis: new THREE.Vector3(0, -1, 0).applyQuaternion(wanted.quaternion).normalize(),
      baseQuaternion: wanted.quaternion.clone(),
      basePosition: wanted.position.clone(),
      angle: 0,
      exitAngle: null,
      record: { entry, exit: null, depth: Math.max(0, SKIN_SURFACE_Y - below.y), deepestLayer: layerAtDepth(Math.max(0, SKIN_SURFACE_Y - below.y)), crossesWound: false },
    };
  }

  /** Deepest point and exit from the current pose. */
  private observe(e: Engagement, pose: { position: THREE.Vector3; quaternion: THREE.Quaternion }) {
    const r = e.record;
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * this.arc;
      const p = new THREE.Vector3(Math.cos(a) * this.radius, 0, Math.sin(a) * this.radius).applyQuaternion(pose.quaternion).add(pose.position);
      if (overPad(p) && p.y < SKIN_SURFACE_Y) r.depth = Math.max(r.depth, SKIN_SURFACE_Y - p.y);
    }
    r.deepestLayer = layerAtDepth(r.depth);
    const tip = this.tip(pose.position, pose.quaternion);
    if (!r.exit && tip.y >= SKIN_SURFACE_Y && tip.distanceTo(r.entry) > MIN_EXIT_DISTANCE) {
      r.exit = tip.clone();
      r.exit.y = SKIN_SURFACE_Y;
      r.crossesWound = Math.sign(r.entry.x - WOUND_X) !== Math.sign(r.exit.x - WOUND_X);
      e.exitAngle = e.angle;
    }
  }

  private finish(e: Engagement) {
    if (e.record.exit) this.passes.push(e.record);
    this.engagement = null;
    this.previousTip = null;
  }

  /** Cancels the pass in progress (e.g. the needle was reset), keeping completed ones. */
  abortCurrent() {
    this.engagement = null;
    this.previousTip = null;
    this.forcing = { degrees: 0, units: 0 };
  }

  /** Ends any pass in progress and forgets completed ones. */
  reset() {
    this.engagement = null;
    this.previousTip = null;
    this.passes.length = 0;
    this.forcing = { degrees: 0, units: 0 };
  }
}

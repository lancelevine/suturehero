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
/**
 * Tearing (2026-11-15): forcing well past the warning (more than TEAR_DEGREES
 * off the curve, or the arc centre more than TEAR_UNITS ≈ 7 mm away) for
 * TEAR_SECONDS tears the needle out of the tissue. A brief flick does not.
 */
export const TEAR_DEGREES = 35;
export const TEAR_UNITS = 0.26;
export const TEAR_SECONDS = 0.4;
/** Tear limits per tissue (src/environments/SkinTypes.ts); the defaults are TEAR_*. */
export interface TearLimits {
  degrees: number;
  units: number;
  seconds: number;
}
export const DEFAULT_TEAR_LIMITS: TearLimits = { degrees: TEAR_DEGREES, units: TEAR_UNITS, seconds: TEAR_SECONDS };
/**
 * Tracking jitter (2026-11-15): forcing is low-passed with this time constant (s) so camera
 * noise on a held needle does not read as forcing or tear the tissue; twists smaller than
 * ANGLE_DEADBAND (rad, about 0.25 deg) are ignored while in tissue.
 */
export const FORCING_SMOOTHING_S = 0.12;
export const ANGLE_DEADBAND = 0.0045;
/** A skin tear (rent) runs this long at least / at most (scene units, about 1.4-5.4 mm). */
const RENT_MIN = 0.05;
const RENT_MAX = 0.2;
/** A needle entering within this distance (scene units, about 0.8 mm) of a rent finds no purchase. */
const RENT_CLEARANCE = 0.03;
/** Lifting the tip this far above the skin (scene units, ≈ 4 mm) clears a "no purchase" note. */
const REJECTION_CLEAR_HEIGHT = 0.15;
/** The tip must emerge this far (scene units, ≈ 1 mm) from the entry to count as an exit. */
const MIN_EXIT_DISTANCE = 0.037;

export type PassLayer = 'epidermis' | 'dermis' | 'subcutaneous fat';

export interface FreePassRecord {
  entry: THREE.Vector3;
  exit: THREE.Vector3 | null;
  /** Deepest needle point below the skin surface (scene units). */
  depth: number;
  deepestLayer: PassLayer;
  /** Distance (scene units) from the wound edge at entry / exit (the edge moves with the wound gap). */
  entryEdge: number;
  exitEdge: number | null;
  /** Needle path angle to the skin surface at entry (degrees; 90 = perpendicular). */
  entryAngleDeg: number;
  /** Entry and exit on opposite sides of the wound. */
  crossesWound: boolean;
  /** The needle was forced out of the tissue (torn) instead of completing the pass. */
  torn?: boolean;
  /** Sequence number among passes and tears (for undo). */
  order?: number;
  /** The path through the tissue (Stage B2 thread): the needle's circle from the entry. */
  tract: FreeTract;
}

/**
 * A pass's path through the tissue: the needle's circle (centre, advancing
 * axis) starting at `start` (centre → tip at entry). A point `angle` along
 * it is `start` turned by `angle` about `axis`, plus `centre`.
 */
export interface FreeTract {
  centre: THREE.Vector3;
  axis: THREE.Vector3;
  start: THREE.Vector3;
  /** Angle along the tract where the tip came out, or null before it has. */
  exitAngle: number | null;
}

/** A tear in the skin left by a forced needle: a split from `from` to `to` on the surface. */
export interface SkinRent {
  from: THREE.Vector3;
  to: THREE.Vector3;
}

/** Distance from `p` to the segment a-b, horizontally (x, z). */
export function horizontalSegmentDistance(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) {
  const ax = b.x - a.x, az = b.z - a.z;
  const t = THREE.MathUtils.clamp(((p.x - a.x) * ax + (p.z - a.z) * az) / Math.max(1e-12, ax * ax + az * az), 0, 1);
  return Math.hypot(p.x - (a.x + ax * t), p.z - (a.z + az * t));
}

/** The point `angle` along a tract (world). */
export function tractPoint(tract: FreeTract, angle: number): THREE.Vector3 {
  return tract.start.clone().applyAxisAngle(tract.axis, angle).add(tract.centre);
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
  /** Passes that tore out (forced off the curve), oldest first. */
  readonly torn: FreePassRecord[] = [];
  /** How long the needle has been forced hard (s). */
  private tearTime = 0;
  /** Counter for FreePassRecord.order. */
  private order = 0;
  /** Skin tears left by torn passes, oldest first. */
  readonly rents: SkinRent[] = [];
  /** Why the last attempted entry found no purchase (torn skin), or null. */
  rejection: string | null = null;
  /**
   * The skin surface height at (x, z), or null where there is no skin (the open wound gap).
   * Set by the session from the live tissue (edge eversion, stitch closure); flat by default.
   */
  surfaceAt: (x: number, z: number) => number | null = () => SKIN_SURFACE_Y;
  /** Half the wound gap at z (scene units), for distances from the wound edge. */
  halfGapAt: (z: number) => number = () => 0;
  /** Tear limits for the current tissue. */
  tearLimits: TearLimits = DEFAULT_TEAR_LIMITS;
  /** Raw (unsmoothed) forcing this frame. */
  rawForcing = { degrees: 0, units: 0 };
  /** Completed passes before this index no longer carry the thread (Reset needle). */
  private threadStart = 0;
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

  /**
   * Where the needle's eye is along the current pass's tract (the thread
   * trails behind it): tip angle minus the needle's arc; negative while the
   * eye is still outside the entry. Null when no pass is in progress.
   */
  get eyeAngle(): number | null {
    return this.engagement ? this.engagement.angle - this.arc : null;
  }

  get forcingWarning() {
    return this.inTissue && (this.forcing.degrees > FORCING_DEGREES || this.forcing.units > FORCING_UNITS);
  }

  /** Skin height under `p`, or null in the wound gap / off the pad. */
  private surface(p: THREE.Vector3): number | null {
    return overPad(p) ? this.surfaceAt(p.x, p.z) : null;
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
  update(wanted: { position: THREE.Vector3; quaternion: THREE.Quaternion }, held: boolean, driverHolds: boolean, dt = 1 / 60): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
    const e = this.engagement;
    if (!e) {
      this.tearTime = 0;
      const tip = this.tip(wanted.position, wanted.quaternion);
      const previous = this.previousTip;
      this.previousTip = tip.clone();
      this.forcing = { degrees: 0, units: 0 };
      this.rawForcing = { degrees: 0, units: 0 };
      const surfaceBelow = this.surface(tip);
      const surfaceAbove = previous ? this.surface(previous) ?? surfaceBelow : null;
      // The "no purchase" note lasts until the needle is lifted clear of the skin.
      if (surfaceBelow === null || tip.y > surfaceBelow + REJECTION_CLEAR_HEIGHT) this.rejection = null;
      if (driverHolds && previous && surfaceBelow !== null && surfaceAbove !== null && previous.y >= surfaceAbove && tip.y < surfaceBelow) {
        if (this.rents.some((rent) => horizontalSegmentDistance(tip, rent.from, rent.to) < RENT_CLEARANCE)) this.rejection = 'torn skin holds no stitch';
        else {
          this.rejection = null;
          this.engage(wanted, previous, tip, surfaceAbove, surfaceBelow);
        }
      }
      return wanted;
    }
    if (held) {
      // The wanted pose as a rotation about the fixed arc axis, relative to entry.
      const delta = wanted.quaternion.clone().multiply(e.baseQuaternion.clone().invert()).normalize();
      if (delta.w < 0) delta.set(-delta.x, -delta.y, -delta.z, -delta.w);
      const wrapped = 2 * Math.atan2(delta.x * e.axis.x + delta.y * e.axis.y + delta.z * e.axis.z, delta.w);
      // A complete pass turns past 180°: take the equivalent angle nearest the previous one.
      const unwrapped = wrapped + 2 * Math.PI * Math.round((e.angle - wrapped) / (2 * Math.PI));
      // Ignore tracking jitter: tiny twists keep the needle where it is.
      const twist = Math.abs(unwrapped - e.angle) < ANGLE_DEADBAND ? e.angle : unwrapped;
      // Before the tip exits, the swage stops at the entry; after, the needle can travel until the swage leaves the exit.
      const limit = e.exitAngle === null ? this.arc : e.exitAngle + this.arc;
      e.angle = Math.min(Math.max(twist, -0.05), limit + 0.05);
    }
    const pose = this.poseAt(e, e.angle);
    this.rawForcing = held ? { degrees: THREE.MathUtils.radToDeg(wanted.quaternion.angleTo(pose.quaternion)), units: wanted.position.distanceTo(pose.position) } : { degrees: 0, units: 0 };
    // Low-pass the forcing so tracking noise does not count; a sustained push still does.
    const blend = 1 - Math.exp(-Math.max(0, dt) / FORCING_SMOOTHING_S);
    this.forcing = {
      degrees: this.forcing.degrees + (this.rawForcing.degrees - this.forcing.degrees) * blend,
      units: this.forcing.units + (this.rawForcing.units - this.forcing.units) * blend,
    };
    // Sustained hard forcing tears the needle out: the pass ends, the skin splits, and the needle follows the hand again.
    const limits = this.tearLimits;
    const hard = this.forcing.degrees > limits.degrees || this.forcing.units > limits.units;
    this.tearTime = hard ? this.tearTime + Math.max(0, dt) : 0;
    if (this.tearTime >= limits.seconds) {
      e.record.torn = true;
      this.torn.push(e.record);
      this.rents.push(this.rentFor(e, wanted.position.clone().sub(pose.position)));
      this.engagement = null;
      this.previousTip = this.tip(wanted.position, wanted.quaternion);
      this.tearTime = 0;
      this.forcing = { degrees: 0, units: 0 };
      return wanted;
    }
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

  /** The split a torn pass leaves: from the entry along the forced direction (horizontal), longer the harder it was forced. */
  private rentFor(e: Engagement, push: THREE.Vector3): SkinRent {
    const from = e.record.entry.clone();
    const direction = new THREE.Vector3(push.x, 0, push.z);
    if (direction.lengthSq() < 1e-10) direction.set(e.axis.z, 0, -e.axis.x);
    if (direction.lengthSq() < 1e-10) direction.set(1, 0, 0);
    direction.normalize();
    const length = THREE.MathUtils.clamp(RENT_MIN + this.forcing.units * 0.5, RENT_MIN, RENT_MAX);
    const to = from.clone().addScaledVector(direction, length);
    to.y = this.surface(to) ?? from.y;
    return { from, to };
  }

  /** Needle pose after advancing `angle` along the curve from the entry pose. */
  private poseAt(e: Engagement, angle: number) {
    const turn = new THREE.Quaternion().setFromAxisAngle(e.axis, angle);
    const position = e.basePosition.clone().sub(e.centre).applyQuaternion(turn).add(e.centre);
    return { position, quaternion: turn.multiply(e.baseQuaternion).normalize() };
  }

  private engage(wanted: { position: THREE.Vector3; quaternion: THREE.Quaternion }, above: THREE.Vector3, below: THREE.Vector3, surfaceAbove: number, surfaceBelow: number) {
    // Where the tip path crosses the (locally linear) surface between the two frames.
    const t = THREE.MathUtils.clamp((above.y - surfaceAbove) / Math.max(1e-9, above.y - surfaceAbove - (below.y - surfaceBelow)), 0, 1);
    const entry = above.clone().lerp(below, t);
    entry.y = THREE.MathUtils.lerp(surfaceAbove, surfaceBelow, t);
    const depth = Math.max(0, surfaceBelow - below.y);
    // Angle of the needle path to the local surface (normal from the surface slope).
    const h = 0.01;
    const sx = (this.surfaceAt(entry.x + h, entry.z) ?? entry.y) - (this.surfaceAt(entry.x - h, entry.z) ?? entry.y);
    const sz = (this.surfaceAt(entry.x, entry.z + h) ?? entry.y) - (this.surfaceAt(entry.x, entry.z - h) ?? entry.y);
    const normal = new THREE.Vector3(-sx / (2 * h), 1, -sz / (2 * h)).normalize();
    // The path direction is the tip's tangent on the needle circle (frame-to-frame motion is too noisy).
    const circleAxis = new THREE.Vector3(0, -1, 0).applyQuaternion(wanted.quaternion).normalize();
    const tangent = new THREE.Vector3().crossVectors(circleAxis, below.clone().sub(wanted.position)).normalize();
    if (tangent.dot(below.clone().sub(above)) < 0) tangent.negate();
    const entryAngleDeg = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(-tangent.dot(normal), -1, 1)));
    this.order++;
    this.engagement = {
      centre: wanted.position.clone(),
      axis: new THREE.Vector3(0, -1, 0).applyQuaternion(wanted.quaternion).normalize(),
      baseQuaternion: wanted.quaternion.clone(),
      basePosition: wanted.position.clone(),
      angle: 0,
      exitAngle: null,
      record: { entry, exit: null, depth, deepestLayer: layerAtDepth(depth), crossesWound: false, order: this.order,
        entryEdge: Math.max(0, Math.abs(entry.x - WOUND_X) - this.halfGapAt(entry.z)), exitEdge: null, entryAngleDeg,
        tract: { centre: wanted.position.clone(), axis: new THREE.Vector3(0, -1, 0).applyQuaternion(wanted.quaternion).normalize(), start: below.clone().sub(wanted.position), exitAngle: null } },
    };
  }

  /** Deepest point and exit from the current pose. */
  private observe(e: Engagement, pose: { position: THREE.Vector3; quaternion: THREE.Quaternion }) {
    const r = e.record;
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * this.arc;
      const p = new THREE.Vector3(Math.cos(a) * this.radius, 0, Math.sin(a) * this.radius).applyQuaternion(pose.quaternion).add(pose.position);
      const top = this.surface(p);
      if (top !== null && p.y < top) r.depth = Math.max(r.depth, top - p.y);
    }
    r.deepestLayer = layerAtDepth(r.depth);
    const tip = this.tip(pose.position, pose.quaternion);
    const tipSurface = this.surface(tip);
    if (!r.exit && tipSurface !== null && tip.y >= tipSurface && tip.distanceTo(r.entry) > MIN_EXIT_DISTANCE) {
      r.exit = tip.clone();
      r.exit.y = tipSurface;
      r.exitEdge = Math.max(0, Math.abs(r.exit.x - WOUND_X) - this.halfGapAt(r.exit.z));
      r.crossesWound = Math.sign(r.entry.x - WOUND_X) !== Math.sign(r.exit.x - WOUND_X);
      e.exitAngle = e.angle;
      r.tract.exitAngle = e.angle;
    }
  }

  private finish(e: Engagement) {
    if (e.record.exit) this.passes.push(e.record);
    this.engagement = null;
    this.previousTip = null;
  }

  /**
   * The passes the thread runs through, newest first (src/suture/FreeThreadGuide.ts):
   * the pass in progress with its eye position, then completed passes (eye through).
   */
  threadedPasses(): Array<{ tract: FreeTract; eyeAngle: number }> {
    const chain: Array<{ tract: FreeTract; eyeAngle: number }> = [];
    if (this.engagement) chain.push({ tract: this.engagement.record.tract, eyeAngle: this.engagement.angle - this.arc });
    for (let i = this.passes.length - 1; i >= this.threadStart; i--) chain.push({ tract: this.passes[i].tract, eyeAngle: Infinity });
    return chain;
  }

  /** Takes the thread out of every completed pass (they keep their marks and feedback). */
  unthreadAll() {
    this.threadStart = this.passes.length;
  }

  /** Cancels the pass in progress (e.g. the needle was reset), keeping completed ones. */
  abortCurrent() {
    this.engagement = null;
    this.previousTip = null;
    this.forcing = { degrees: 0, units: 0 };
  }

  /**
   * Undo (2026-11-15): takes back the most recent pass, torn or completed (its marks,
   * thread and skin tear), or cancels a pass in progress. Returns whether anything was undone.
   */
  undoLast(): boolean {
    if (this.engagement) {
      this.abortCurrent();
      return true;
    }
    const lastPass = this.passes.length > this.threadStart ? this.passes[this.passes.length - 1] : undefined;
    const lastTorn = this.torn[this.torn.length - 1];
    if (!lastPass && !lastTorn) return false;
    if (lastTorn && (!lastPass || (lastTorn.order ?? 0) > (lastPass.order ?? 0))) {
      this.torn.pop();
      this.rents.pop();
    } else this.passes.pop();
    return true;
  }

  /** Ends any pass in progress and forgets completed ones. */
  reset() {
    this.engagement = null;
    this.previousTip = null;
    this.passes.length = 0;
    this.torn.length = 0;
    this.rents.length = 0;
    this.rejection = null;
    this.tearTime = 0;
    this.order = 0;
    this.threadStart = 0;
    this.forcing = { degrees: 0, units: 0 };
  }
}

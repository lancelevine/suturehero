import {RING_LAYOUT_REVISION,trackerGeometry} from '../input/prismPose';
import * as THREE from 'three';
import { brightSpotCentroid, findBrightBalls, maskFromQuads, type GrayImage } from './brightBalls';
import {
  bodyRay,
  nearestPointToRays,
  pathPosition,
  projectBodyPoint,
  type BodyPose,
  type Intrinsics,
  type Pixel,
  type Projection,
  type Ray,
} from './jawGeometry';

/**
 * Marker-relative jaw tracking with white balls.
 *
 * Calibration learns where each ball sits in the instrument tracker's 3D
 * frame with the jaws closed and with them open. At run time the tracker
 * pose (from the ArUco ring) predicts where each ball must appear for
 * "closed" and "open"; the ball found between those two points gives the
 * opening. Works for any ball placement. A ball that does not move relative
 * to the tracker (e.g. on the jaw the ring is mounted to) is ignored.
 *
 * Everything here is pure and testable; the tracking page supplies poses and
 * image regions.
 */

export const DEFAULT_BALL_DIAMETER_MM = 10;
/** Calibration needs this many frames per ball… */
export const MIN_CAPTURE_SAMPLES = 20;
/** …and this much instrument rotation, so viewing rays cross. */
export const MIN_CAPTURE_SPREAD_DEG = 12;
/** A ball must be found again within this time during capture. */
export const CAPTURE_LOSS_MS = 1200;
/**
 * Only record calibration samples while the instrument turns slower than
 * this. Marker poses come from a slightly earlier frame than the image the
 * balls are read from; slow motion keeps that mismatch negligible.
 */
export const MAX_CAPTURE_TURN_DEG_PER_S = 6;
/** Worst acceptable ray misfit for a calibrated ball position. */
export const MAX_CAPTURE_RMS_MM = 6;
/** Strength of the "near the tracker's depth" fallback when rays barely cross. */
export const PRIOR_WEIGHT_PER_RAY = 0.0001;
/** A ball must move at least this much between closed and open to measure opening. */
export const MIN_BALL_TRAVEL_MM = 2;
/** Projected closed→open paths shorter than this are too small to measure. */
export const MIN_TRAVEL_PX = 4;
/** Keep reporting the last opening for this long when the balls are briefly lost. */
export const HOLD_MS = 250;
/** Weight of each new reading in the smoothed opening (1 = no smoothing). */
export const SMOOTHING = 0.6;

export type JawPose = 'closed' | 'open';

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Grayscale pixels of a region; image pixel = (frame pixel − region origin) × scale. */
export interface SampledRegion {
  image: GrayImage;
  region: Region;
  scale: number;
}

export interface JawFrame {
  now: number;
  /** Tracker pose this frame, in the same pixel space as `intrinsics`. */
  pose: BodyPose;
  intrinsics: Intrinsics;
  sample(region: Region): SampledRegion | null;
  /** Frame pixels to ignore, e.g. inside visible markers. */
  ignore?: (x: number, y: number) => boolean;
  /** Areas to ignore as convex quads in frame pixels (much faster than `ignore`). */
  ignoreQuads?: ReadonlyArray<ReadonlyArray<Pixel>>;
}

/** Expected on-screen ball radius at a given depth. */
export function ballRadiusPx(diameterMm: number, depthMm: number, k: Intrinsics): number {
  return (k.fx * diameterMm) / 2 / Math.max(depthMm, 1);
}

/** Bright balls in a frame region, in frame pixel coordinates. */
/** Ignore mask for a sampled region: from quads when available, else the per-pixel function. */
function regionMask(frame: JawFrame, sampled: SampledRegion): Uint8Array | undefined {
  const { scale, region } = sampled;
  if (frame.ignoreQuads) {
    return maskFromQuads(sampled.image.width, sampled.image.height,
      frame.ignoreQuads.map((quad) => quad.map((p) => ({ x: (p.x - region.x) * scale, y: (p.y - region.y) * scale }))));
  }
  const ignore = frame.ignore;
  if (!ignore) return undefined;
  const mask = new Uint8Array(sampled.image.width * sampled.image.height);
  for (let y = 0; y < sampled.image.height; y++) for (let x = 0; x < sampled.image.width; x++) if (ignore(region.x + x / scale, region.y + y / scale)) mask[y * sampled.image.width + x] = 1;
  return mask;
}

function ballsInRegion(frame: JawFrame, center: Pixel, halfSize: number, radiusPx: number, sizeFactors: readonly number[] = [1]) {
  const region = {
    x: Math.floor(center.x - halfSize),
    y: Math.floor(center.y - halfSize),
    width: Math.ceil(halfSize * 2),
    height: Math.ceil(halfSize * 2),
  };
  const sampled = frame.sample(region);
  if (!sampled) return [];
  const { scale } = sampled;
  const origin = sampled.region;
  return findBrightBalls(sampled.image, radiusPx * scale, { mask: regionMask(frame, sampled), sizeFactors }).map((ball) => ({ x: origin.x + ball.x / scale, y: origin.y + ball.y / scale, radius: ball.radius / scale }));
}

// --- Calibration capture ----------------------------------------------------

export interface CaptureProgress {
  samples: number;
  spreadDeg: number;
  ready: boolean;
  /** Set when the capture can no longer succeed. */
  failed?: string;
}

/**
 * Follows the clicked balls while the user slowly turns the instrument with
 * the jaws held in one state, collecting a viewing ray per ball per frame.
 */
export class JawCapture {
  private readonly last: Pixel[];
  private readonly lastSeen: number[];
  private readonly rays: Ray[][];
  private firstQuaternion?: THREE.Quaternion;
  private previousPose?: { quaternion: THREE.Quaternion; at: number };
  private spread = 0;
  private failure?: string;
  private trackerDepth = 0;

  constructor(
    readonly jaw: JawPose,
    seeds: Pixel[],
    readonly ballDiameterMm = DEFAULT_BALL_DIAMETER_MM,
    startedAt = 0,
  ) {
    if (!seeds.length) throw new Error('Click at least one ball.');
    this.last = seeds.map((seed) => ({ ...seed }));
    this.lastSeen = seeds.map(() => startedAt);
    this.rays = seeds.map(() => []);
  }

  /** Current on-screen ball positions (for drawing). */
  get positions(): readonly Pixel[] {
    return this.last;
  }

  update(frame: JawFrame): CaptureProgress {
    if (this.failure) return this.progress;
    const depth = frame.pose.translation.z;
    this.trackerDepth = depth;
    const previous = this.previousPose;
    const elapsedS = previous ? (frame.now - previous.at) / 1000 : 0;
    const turnRate = previous && elapsedS > 0 ? THREE.MathUtils.radToDeg(previous.quaternion.angleTo(frame.pose.quaternion)) / elapsedS : 0;
    this.previousPose = { quaternion: frame.pose.quaternion.clone(), at: frame.now };
    const steady = turnRate <= MAX_CAPTURE_TURN_DEG_PER_S;
    const radius = ballRadiusPx(this.ballDiameterMm, depth, frame.intrinsics);
    // How far a ball may move between frames while turning slowly.
    const reach = radius * 1.5 + 8;
    // Each detected blob can belong to only one ball, nearest first, so a
    // lost ball's track cannot jump onto the other ball.
    const matches = this.last.flatMap((previous, ball) =>
      ballsInRegion(frame, previous, reach + radius * 2, radius)
        .map((candidate) => ({ ball, candidate, distance: Math.hypot(candidate.x - previous.x, candidate.y - previous.y) }))
        .filter(({ distance }) => distance <= reach),
    );
    matches.sort((a, b) => a.distance - b.distance);
    const assigned = new Set<number>();
    const taken: Pixel[] = [];
    for (const { ball, candidate } of matches) {
      if (assigned.has(ball) || taken.some((p) => Math.hypot(p.x - candidate.x, p.y - candidate.y) < radius)) continue;
      assigned.add(ball);
      taken.push(candidate);
      this.last[ball] = { x: candidate.x, y: candidate.y };
      this.lastSeen[ball] = frame.now;
      if (steady) this.rays[ball].push(bodyRay(frame.pose, this.last[ball], frame.intrinsics));
    }
    this.last.forEach((_, ball) => {
      if (!assigned.has(ball) && frame.now - this.lastSeen[ball] > CAPTURE_LOSS_MS) {
        this.failure = `Lost ball ${ball + 1}. Keep both balls visible and turn more slowly, then try again.`;
      }
    });
    // Rotation covered by recorded (steady) samples.
    if (steady && assigned.size === this.last.length) {
      if (!this.firstQuaternion) this.firstQuaternion = frame.pose.quaternion.clone();
      else this.spread = Math.max(this.spread, THREE.MathUtils.radToDeg(this.firstQuaternion.angleTo(frame.pose.quaternion)));
    }
    return this.progress;
  }

  get progress(): CaptureProgress {
    const samples = Math.min(...this.rays.map((rays) => rays.length));
    return {
      samples,
      spreadDeg: this.spread,
      ready: !this.failure && samples >= MIN_CAPTURE_SAMPLES && this.spread >= MIN_CAPTURE_SPREAD_DEG,
      failed: this.failure,
    };
  }

  /** Body-frame ball positions, or an explanation of why they can't be trusted. */
  solve(): { points: THREE.Vector3[] } | { error: string } {
    if (this.failure) return { error: this.failure };
    const points: THREE.Vector3[] = [];
    for (const [ball, rays] of this.rays.entries()) {
      if (rays.length < 3) return { error: `Ball ${ball + 1} was not seen enough.` };
      // Weak prior: where the rays pass the tracker's depth, so a capture with
      // little rotation still lands near the tracker instead of at infinity.
      const prior = new THREE.Vector3();
      for (const ray of rays) {
        prior.add(ray.origin.clone().add(ray.direction.clone().multiplyScalar(this.trackerDepth)));
      }
      prior.divideScalar(rays.length);
      // Kept very weak: a stronger prior measurably biases the result
      // (≈1.5 mm at weight 0.002 with a 12° turn) while 0.0001 adds ≈0.1 mm.
      const fit = nearestPointToRays(rays, prior, rays.length * PRIOR_WEIGHT_PER_RAY);
      if (!fit) return { error: `Ball ${ball + 1} could not be located.` };
      if (fit.rmsMm > MAX_CAPTURE_RMS_MM) {
        return { error: `Ball ${ball + 1} moved inconsistently (${fit.rmsMm.toFixed(1)} mm). Hold the jaws still while turning.` };
      }
      points.push(fit.point);
    }
    return { points };
  }
}

// --- Model -----------------------------------------------------------------

export interface JawBall {
  closed: THREE.Vector3;
  open: THREE.Vector3;
}

export interface JawModel {
  ballDiameterMm: number;
  balls: JawBall[];
  /** 3D ball-to-ball distances from both cameras, when calibrated in stereo. */
  stereo?: { closedMm: number; openMm: number };
}

/**
 * Pair closed and open ball positions (click order may differ) and check that
 * at least one ball actually moves with the jaws.
 */
export function buildJawModel(
  closed: THREE.Vector3[],
  open: THREE.Vector3[],
  ballDiameterMm = DEFAULT_BALL_DIAMETER_MM,
): JawModel | { error: string } {
  if (!closed.length || closed.length !== open.length) return { error: 'Use the same number of balls for closed and open.' };
  let order = open.map((_, i) => i);
  if (closed.length === 2) {
    const straight = closed[0].distanceTo(open[0]) + closed[1].distanceTo(open[1]);
    const swapped = closed[0].distanceTo(open[1]) + closed[1].distanceTo(open[0]);
    if (swapped < straight) order = [1, 0];
  }
  const balls = closed.map((point, i) => ({ closed: point.clone(), open: open[order[i]].clone() }));
  if (!balls.some((ball) => ball.closed.distanceTo(ball.open) >= MIN_BALL_TRAVEL_MM)) {
    return { error: 'The balls did not move between closed and open. Open the jaws fully for the open capture.' };
  }
  return { ballDiameterMm, balls };
}

// --- Run time ----------------------------------------------------------------

export interface BallView {
  closed: Projection;
  open: Projection;
  /** Whether this ball's closed→open path is long enough to measure. */
  moving: boolean;
  found: Pixel | null;
}

export interface JawReading {
  /** 0 closed … 1 open, smoothed; null when lost. */
  opening: number | null;
  /** Share of measurable balls found this frame (0–1). */
  confidence: number;
  balls: BallView[];
}

/** Per-ball lock: where along its closed→open path the ball was, and how fast it moved. */
interface BallLock {
  fraction: number;
  /** Fraction per ms. */
  velocity: number;
  at: number;
}

/** Keep following a locked ball for this long without any measurement. */
export const LOCK_TIMEOUT_MS = 300;
/** Sizes tried when detecting, relative to the calibrated ball size. */
const DETECT_SIZE_FACTORS = [1, 0.65, 1.5];

export class JawTracker {
  private smoothed: number | null = null;
  private lastFoundAt = -Infinity;
  private readonly locks: Array<BallLock | null>;

  constructor(readonly model: JawModel) {
    this.locks = model.balls.map(() => null);
  }

  reset() {
    this.smoothed = null;
    this.lastFoundAt = -Infinity;
    this.locks.fill(null);
  }

  update(frame: JawFrame): JawReading {
    const views: BallView[] = [];
    let weighted = 0;
    let weights = 0;
    let measurable = 0;
    let found = 0;
    this.model.balls.forEach((ball, index) => {
      const closed = projectBodyPoint(frame.pose, ball.closed, frame.intrinsics);
      const open = projectBodyPoint(frame.pose, ball.open, frame.intrinsics);
      if (!closed || !open) return;
      const travel = Math.hypot(open.x - closed.x, open.y - closed.y);
      const moving = travel >= MIN_TRAVEL_PX;
      const view: BallView = { closed, open, moving, found: null };
      views.push(view);
      if (!moving) return;
      measurable++;
      const radius = ballRadiusPx(this.model.ballDiameterMm, (closed.depth + open.depth) / 2, frame.intrinsics);
      const lock = this.locks[index];
      const locked = lock && frame.now - lock.at <= LOCK_TIMEOUT_MS ? lock : null;
      // Prediction along the path (the ring pose already accounts for instrument motion).
      const predicted = locked ? THREE.MathUtils.clamp(locked.fraction + locked.velocity * (frame.now - locked.at), -0.2, 1.2) : null;
      const at = (f: number) => ({ x: closed.x + (open.x - closed.x) * f, y: closed.y + (open.y - closed.y) * f });
      const pathTolerance = Math.max(radius * 2, 8) * (locked ? 1.5 : 1);
      const lockReach = radius * 3 + 10;

      // 1. Round-blob detection, over a range of sizes.
      const center = { x: (closed.x + open.x) / 2, y: (closed.y + open.y) / 2 };
      const halfSize = travel / 2 + radius * 4 + 6;
      let best: { point: Pixel; fraction: number; cost: number } | null = null;
      {
        for (const candidate of ballsInRegion(frame, center, halfSize, radius, DETECT_SIZE_FACTORS)) {
          const path = pathPosition(candidate, closed, open);
          if (path.offsetPx > pathTolerance || path.fraction < -0.35 || path.fraction > 1.35) continue;
          if (predicted !== null && Math.hypot(candidate.x - at(predicted).x, candidate.y - at(predicted).y) > lockReach + travel * 0.25) continue;
          const cost = path.offsetPx + (predicted === null ? 0 : Math.abs(path.fraction - predicted) * travel);
          if (!best || cost < best.cost) best = { point: { x: candidate.x, y: candidate.y }, fraction: path.fraction, cost };
        }
      }

      // 2. Locked but no round blob: follow the bright spot at the prediction.
      if (!best && predicted !== null) {
        const p = at(predicted);
        const half = radius * 2 + 6;
        const size = Math.ceil(half * 2);
        const sampled = frame.sample({ x: Math.floor(p.x - half), y: Math.floor(p.y - half), width: size, height: size });
        if (sampled) {
          const { scale, region } = sampled;
          const spot = brightSpotCentroid(sampled.image, Math.PI * (radius * scale) ** 2 * 0.15, regionMask(frame, sampled));
          if (spot) {
            const point = { x: region.x + spot.x / scale, y: region.y + spot.y / scale };
            const path = pathPosition(point, closed, open);
            if (path.offsetPx <= pathTolerance * 1.5) best = { point, fraction: path.fraction, cost: 0 };
          }
        }
      }

      if (!best) return;
      found++;
      const fraction = THREE.MathUtils.clamp(best.fraction, 0, 1);
      const elapsed = locked ? Math.max(1, frame.now - locked.at) : 0;
      const velocity = locked ? THREE.MathUtils.clamp((fraction - locked.fraction) / elapsed, -0.01, 0.01) * 0.5 + locked.velocity * 0.5 : 0;
      this.locks[index] = { fraction, velocity, at: frame.now };
      view.found = best.point;
      weighted += fraction * travel;
      weights += travel;
    });

    if (weights > 0) {
      const raw = weighted / weights;
      this.smoothed = this.smoothed === null ? raw : this.smoothed + (raw - this.smoothed) * SMOOTHING;
      this.lastFoundAt = frame.now;
    } else if (frame.now - this.lastFoundAt > HOLD_MS) {
      this.smoothed = null;
      this.locks.fill(null);
    }
    return { opening: this.smoothed, confidence: measurable ? found / measurable : 0, balls: views };
  }
}

// --- Saving ----------------------------------------------------------------

export interface SavedJawModel {
  version: 1;
  trackerType: string;
  markerSizeMm?:number;
  /** Ring face layout revision the model was learned with (absent = 1). */
  ringLayout?:number;
  ballDiameterMm: number;
  balls: Array<{ closed: [number, number, number]; open: [number, number, number] }>;
  stereo?: { closedMm: number; openMm: number };
}

export function serializeJawModel(model: JawModel, trackerType: string): SavedJawModel {
  return {
    version: 1,
    trackerType,
    markerSizeMm:trackerGeometry(trackerType==='ring6'||trackerType==='ring8'?trackerType:'prism').markerSizeMm,
    ringLayout:RING_LAYOUT_REVISION,
    ballDiameterMm: model.ballDiameterMm,
    balls: model.balls.map((ball) => ({ closed: ball.closed.toArray(), open: ball.open.toArray() })),
    ...(model.stereo ? { stereo: { ...model.stereo } } : {}),
  };
}

const vector = (value: unknown): THREE.Vector3 | null =>
  Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 2000)
    ? new THREE.Vector3(...(value as [number, number, number]))
    : null;

/** A saved model, if valid and made with the same tracker geometry. */
export function parseJawModel(value: unknown, trackerType: string): JawModel | null {
  if (!value || typeof value !== 'object') return null;
  const saved = value as Partial<SavedJawModel>;
  if (saved.version !== 1 || saved.trackerType !== trackerType) return null;
  const ring=trackerType==='ring6'||trackerType==='ring8';
  const currentMarkerSize=trackerGeometry(ring?trackerType:'prism').markerSizeMm;
  // Older ring models were learned with the incorrect 16 mm black-square assumption.
  if((saved.markerSizeMm??(ring?16:12))!==currentMarkerSize)return null;
  // Ball positions are stored in the ring's body frame, which moved with the layout correction.
  if(ring&&(saved.ringLayout??1)!==RING_LAYOUT_REVISION)return null;
  const diameter = saved.ballDiameterMm;
  if (typeof diameter !== 'number' || !(diameter > 0 && diameter < 100) || !Array.isArray(saved.balls)) return null;
  const balls: JawBall[] = [];
  for (const ball of saved.balls) {
    const closed = vector(ball?.closed);
    const open = vector(ball?.open);
    if (!closed || !open) return null;
    balls.push({ closed, open });
  }
  if (!balls.length) return null;
  const stereo = (saved as { stereo?: { closedMm?: unknown; openMm?: unknown } }).stereo;
  const valid = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 200;
  return stereo && valid(stereo.closedMm) && valid(stereo.openMm)
    ? { ballDiameterMm: diameter, balls, stereo: { closedMm: stereo.closedMm, openMm: stereo.openMm } }
    : { ballDiameterMm: diameter, balls };
}

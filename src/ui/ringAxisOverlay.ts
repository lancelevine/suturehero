import { Vector3 } from 'three';
import type { MarkerObservation } from '../input/arucoTracking';
import { solvePrismPose, type PrismPose, type TrackerType } from '../input/prismPose';
import { defaultIntrinsics, projectBodyPoint, type Pixel } from '../input/bodyGeometry';

/** Half-length of the drawn axis on each side of the ring centre, mm. */
export const RING_AXIS_HALF_LENGTH_MM = 60;
/** Ring fits worse than this are not drawn (px). */
const MAX_AXIS_POSE_ERROR_PX = 4;
const AXIS_LINE_WIDTH_PX = 3;
/** White since 2026-11-14 (black was hard to see on the dark instruments). */
const AXIS_COLOR = '#fff';

/**
 * End points (overlay px) of the ring tracker's shaft axis (local Y): the
 * reference the handle prism's rotation is compared against for jaw opening.
 * Approximate: uses the same single-camera ring solve as jaw tracking.
 */
export function ringAxisSegment(markers: MarkerObservation[], firstId: number, type: TrackerType, width: number, height: number, previous?: PrismPose): { a: Pixel; b: Pixel; pose: PrismPose } | null {
  if (!markers.length || !width || !height) return null;
  const pose = solvePrismPose(markers, firstId, width, height, previous, undefined, type);
  if (!pose || pose.error > MAX_AXIS_POSE_ERROR_PX) return null;
  const k = defaultIntrinsics(width, height);
  const a = projectBodyPoint(pose, new Vector3(0, -RING_AXIS_HALF_LENGTH_MM, 0), k);
  const b = projectBodyPoint(pose, new Vector3(0, RING_AXIS_HALF_LENGTH_MM, 0), k);
  return a && b ? { a, b, pose } : null;
}

export function drawRingAxis(context: CanvasRenderingContext2D, segment: { a: Pixel; b: Pixel }) {
  context.save();
  context.strokeStyle = AXIS_COLOR;
  context.lineWidth = AXIS_LINE_WIDTH_PX;
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(segment.a.x, segment.a.y);
  context.lineTo(segment.b.x, segment.b.y);
  context.stroke();
  context.restore();
}

/** Calibrated-tip dot in the camera views: radius (px) and outline. */
const TIP_DOT_RADIUS_PX = 5;
/** Instrument colours, as in the 3D view. */
export const TIP_DOT_COLORS: Record<string, string> = { forceps: '#65d8c1', needleDriver: '#e65353', scissors: '#8d9cf2' };

/** A filled dot with a white outline at a calibrated tip (src/input/stereoProjection.ts gives the pixel). */
export function drawTipDot(context: CanvasRenderingContext2D, at: Pixel, color: string) {
  context.save();
  context.setLineDash([]);
  context.beginPath();
  context.arc(at.x, at.y, TIP_DOT_RADIUS_PX, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = '#fff';
  context.stroke();
  context.restore();
}

/** Where two image lines (each through two points) cross, or null if (nearly) parallel. */
export function lineIntersection(p: { a: Pixel; b: Pixel }, q: { a: Pixel; b: Pixel }): Pixel | null {
  const d1x = p.b.x - p.a.x, d1y = p.b.y - p.a.y, d2x = q.b.x - q.a.x, d2y = q.b.y - q.a.y;
  const denominator = d1x * d2y - d1y * d2x;
  const lengths = Math.hypot(d1x, d1y) * Math.hypot(d2x, d2y);
  // Lines within ~3° of parallel have no meaningful crossing point.
  if (!lengths || Math.abs(denominator) / lengths < Math.sin((3 * Math.PI) / 180)) return null;
  const t = ((q.a.x - p.a.x) * d2y - (q.a.y - p.a.y) * d2x) / denominator;
  return { x: p.a.x + t * d1x, y: p.a.y + t * d1y };
}

/** A decoded marker counts for the axis this long after its last decode (ms). */
export const RING_AXIS_DECODE_MS = 650;

/**
 * Draw each instrument's ring axis (moved out of src/tracking.ts, 2026-11-27), keeping each
 * ring's last pose in `poses` to seed the next fit. On the 8-face ring the side faces are
 * preferred over the inclined end faces.
 */
export function drawRingAxes<Name extends string>(context: CanvasRenderingContext2D, groups: Readonly<Record<Name, readonly number[]>>, markers: readonly MarkerObservation[], decodedAgeMs: (id: number) => number, type: TrackerType, width: number, height: number, poses: Map<Name, PrismPose>) {
  for (const [name, ids] of Object.entries(groups) as Array<[Name, readonly number[]]>) {
    const visible = markers.filter((m) => ids.includes(m.id) && decodedAgeMs(m.id) <= RING_AXIS_DECODE_MS);
    const side = type === 'ring8' ? visible.filter((m) => m.id - ids[0] < 6) : visible;
    const segment = ringAxisSegment(side.length ? side : visible, ids[0], type, width, height, poses.get(name));
    if (!segment) {
      poses.delete(name);
      continue;
    }
    poses.set(name, segment.pose);
    drawRingAxis(context, segment);
  }
}

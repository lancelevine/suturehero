import { Vector3 } from 'three';
import type { MarkerObservation } from '../input/arucoTracking';
import { solvePrismPose, type PrismPose, type TrackerType } from '../input/prismPose';
import { defaultIntrinsics, projectBodyPoint, type Pixel } from '../jaw/jawGeometry';

/** Half-length of the drawn axis on each side of the ring centre, mm. */
export const RING_AXIS_HALF_LENGTH_MM = 60;
/** Ring fits worse than this are not drawn (px). */
const MAX_AXIS_POSE_ERROR_PX = 4;
const AXIS_LINE_WIDTH_PX = 3;
const AXIS_COLOR = '#000';

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

/** Half-length of the drawn handle axis on each side of the prism centre, mm. */
export const HANDLE_AXIS_HALF_LENGTH_MM = 50;
const HANDLE_COLOR = '#ff8a00';
/** Hinge triangle size, px. */
const HINGE_MARK_PX = 9;

/** End points (overlay px) of the handle prism's long axis (local Y of the 3-face prism model). */
export function handleAxisSegment(pose: PrismPose, width: number, height: number): { a: Pixel; b: Pixel } | null {
  const k = defaultIntrinsics(width, height);
  const a = projectBodyPoint(pose, new Vector3(0, -HANDLE_AXIS_HALF_LENGTH_MM, 0), k);
  const b = projectBodyPoint(pose, new Vector3(0, HANDLE_AXIS_HALF_LENGTH_MM, 0), k);
  return a && b ? { a, b } : null;
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

/** Orange handle axis, and an orange triangle where it crosses the ring axis (approximate hinge). */
export function drawHandleAxis(context: CanvasRenderingContext2D, handle: { a: Pixel; b: Pixel }, ring: { a: Pixel; b: Pixel } | null) {
  context.save();
  context.strokeStyle = HANDLE_COLOR;
  context.lineWidth = AXIS_LINE_WIDTH_PX;
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(handle.a.x, handle.a.y);
  context.lineTo(handle.b.x, handle.b.y);
  context.stroke();
  const hinge = ring ? lineIntersection(ring, handle) : null;
  const { width, height } = context.canvas;
  if (hinge && hinge.x >= 0 && hinge.y >= 0 && hinge.x <= width && hinge.y <= height) {
    context.fillStyle = HANDLE_COLOR;
    context.beginPath();
    context.moveTo(hinge.x, hinge.y - HINGE_MARK_PX);
    context.lineTo(hinge.x + HINGE_MARK_PX, hinge.y + HINGE_MARK_PX * 0.7);
    context.lineTo(hinge.x - HINGE_MARK_PX, hinge.y + HINGE_MARK_PX * 0.7);
    context.closePath();
    context.fill();
  }
  context.restore();
}

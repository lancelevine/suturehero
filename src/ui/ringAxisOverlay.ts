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

import type { MarkerObservation } from '../input/arucoTracking';

/** Colour of a recognised marker's outline and ID label. */
export const DETECTED_MARKER_COLOUR = '#18e89d';

/** Green outline and "ID n" label for one recognised marker (camera view overlay). */
export function drawDetectedMarker(context: CanvasRenderingContext2D, marker: MarkerObservation) {
  const corners = marker.corners;
  context.beginPath();
  context.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) context.lineTo(corners[i].x, corners[i].y);
  context.closePath();
  context.strokeStyle = DETECTED_MARKER_COLOUR;
  context.lineWidth = 3;
  context.stroke();
  context.font = 'bold 20px sans-serif';
  context.fillStyle = DETECTED_MARKER_COLOUR;
  context.fillText('ID ' + marker.id, corners[0].x, Math.max(22, corners[0].y - 8));
}

/** Camera status line: frame size, tracked marker IDs, and decode / flow rates over the last `seconds`. */
export function cameraStatusText(label: string, width: number, height: number, trackedIds: readonly number[], decodes: number, flows: number, seconds: number) {
  const ids = trackedIds.join(', ') || 'none';
  return `${label}: ${width} × ${height} · ${trackedIds.length} tracked · IDs ${ids} · ${(decodes / seconds).toFixed(1)} decode FPS · ${(flows / seconds).toFixed(1)} flow FPS`;
}

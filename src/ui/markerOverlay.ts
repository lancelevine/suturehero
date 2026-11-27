import type { MarkerObservation } from '../input/arucoTracking';

/** Colour of a recognised marker's outline and ID label. */
export const DETECTED_MARKER_COLOUR = '#18e89d';
/** Colour when another face of the same instrument is also verified (face overlap). */
export const OVERLAP_MARKER_COLOUR = '#ffc14d';

/** Green outline and "ID n" label for one recognised marker (camera view overlay); amber "OVERLAP ID n" when `overlap`. */
export function drawDetectedMarker(context: CanvasRenderingContext2D, marker: MarkerObservation, overlap = false) {
  const colour = overlap ? OVERLAP_MARKER_COLOUR : DETECTED_MARKER_COLOUR;
  const corners = marker.corners;
  context.beginPath();
  context.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) context.lineTo(corners[i].x, corners[i].y);
  context.closePath();
  context.strokeStyle = colour;
  context.lineWidth = 3;
  context.stroke();
  context.font = 'bold 20px sans-serif';
  context.fillStyle = colour;
  context.fillText((overlap ? 'OVERLAP ' : '') + 'ID ' + marker.id, corners[0].x, Math.max(22, corners[0].y - 8));
}

/** Camera status line: frame size, tracked marker IDs, and decode / flow rates over the last `seconds`. */
export function cameraStatusText(label: string, width: number, height: number, trackedIds: readonly number[], decodes: number, flows: number, seconds: number) {
  const ids = trackedIds.join(', ') || 'none';
  return `${label}: ${width} × ${height} · ${trackedIds.length} tracked · IDs ${ids} · ${(decodes / seconds).toFixed(1)} decode FPS · ${(flows / seconds).toFixed(1)} flow FPS`;
}

/** Corner-debug view: a marker's outline and corner dots, or only larger dots (`pointsOnly`). */
export function drawCornerMarks(context: CanvasRenderingContext2D, corners: MarkerObservation['corners'], color: string, pointsOnly = false) {
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 2;
  if (!pointsOnly) {
    context.beginPath();
    context.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i++) context.lineTo(corners[i].x, corners[i].y);
    context.closePath();
    context.stroke();
  }
  for (const p of corners) {
    context.beginPath();
    context.arc(p.x, p.y, pointsOnly ? 4 : 3, 0, Math.PI * 2);
    context.fill();
  }
}

/** A marker's green outline is drawn only this long after its ID was last decoded (ms). */
export const DECODED_OUTLINE_MS = 650;

/**
 * Clear a camera overlay and outline its recently decoded markers (both cameras; moved out of
 * src/tracking.ts, 2026-11-27). `overlapping(id)` marks face overlaps amber (camera 1). An optical-flow prediction of an old marker is not outlined.
 */
export function drawDecodedMarkers(context: CanvasRenderingContext2D, markers: readonly MarkerObservation[], decodedAgeMs: (id: number) => number, width: number, height: number, overlapping: (id: number) => boolean = () => false) {
  context.clearRect(0, 0, width, height);
  for (const marker of markers) if (decodedAgeMs(marker.id) <= DECODED_OUTLINE_MS) drawDetectedMarker(context, marker, overlapping(marker.id));
}

/** Raw decoded corners stay in the corner-debug view this long after they arrive (ms). */
export const CORNER_DEBUG_KEEP_MS = 650;
const RAW_CORNER_COLOUR = '#00e5ff';
const LIVE_CORNER_COLOUR = '#ffe34d';

/**
 * Corner-debug view (moved out of src/tracking.ts, 2026-11-27): raw decoded corners from earlier
 * captured frames in cyan (older entries are removed from `raw`), and the live corners passed to
 * the pose solver as yellow dots. Returns the status line.
 */
export function drawCornerDebug(
  context: CanvasRenderingContext2D,
  raw: Map<number, { marker: MarkerObservation; receivedAt: number }>,
  live: readonly MarkerObservation[],
  now: number,
) {
  let recent = 0;
  for (const [id, entry] of raw) {
    if (now - entry.receivedAt > CORNER_DEBUG_KEEP_MS) {
      raw.delete(id);
      continue;
    }
    recent++;
    drawCornerMarks(context, entry.marker.corners, RAW_CORNER_COLOUR);
  }
  for (const marker of live) drawCornerMarks(context, marker.corners, LIVE_CORNER_COLOUR, true);
  return recent + ' decoded marker(s) · cyan is from an earlier captured frame; compare while held still';
}

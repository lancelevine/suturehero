import type { MarkerObservation } from './arucoTracking';

/**
 * Optical-flow frame size and marker-coordinate conversion, shared by both
 * cameras (was duplicated in src/tracking.ts until 2026-11-09). Flow runs on
 * frames at most MAX_FLOW_WIDTH_PX wide; decoding uses native pixels.
 */
export const MAX_FLOW_WIDTH_PX = 960;

export function flowFrameScale(nativeWidth: number, nativeHeight: number) {
  const scale = Math.min(1, MAX_FLOW_WIDTH_PX / nativeWidth);
  const width = Math.round(nativeWidth * scale);
  const height = Math.round(nativeHeight * scale);
  const scaleX = nativeWidth / width;
  const scaleY = nativeHeight / height;
  return {
    width,
    height,
    /** Flow-frame corners → native camera pixels. */
    toNative: (markers: MarkerObservation[]): MarkerObservation[] => markers.map((m) => ({ id: m.id, corners: m.corners.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY })) })),
    /** Native camera pixels → flow-frame corners. */
    toFlow: (markers: MarkerObservation[]): MarkerObservation[] => markers.map((m) => ({ id: m.id, corners: m.corners.map((p) => ({ x: p.x / scaleX, y: p.y / scaleY })) })),
  };
}

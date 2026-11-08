/**
 * Optical-flow frames without main-thread pixel copies.
 *
 * Instead of drawing each frame into a canvas and reading it back with
 * getImageData on the main thread (~4 ms per frame per camera in the
 * 2026-11-08 profile), the main thread asks the browser for a scaled
 * ImageBitmap and transfers it to the flow worker, which reads the pixels
 * itself. When a marker decode needs the same image to re-anchor optical flow,
 * the worker keeps that frame under a key, so it is never copied twice.
 *
 * The previous ImageData path stays as the fallback (Lab replay, browsers
 * without createImageBitmap/OffscreenCanvas, or after a bitmap error).
 */

/** A frame the flow worker already holds, for seeding after a decode. */
export interface FlowSeedRef {
  key: number;
  /** Resolves once the message that stores this frame has been posted to the worker. */
  ready: Promise<unknown>;
}

export function isFlowSeedRef(value: unknown): value is FlowSeedRef {
  return !!value && typeof value === 'object' && typeof (value as FlowSeedRef).key === 'number' && (value as FlowSeedRef).ready instanceof Promise;
}

/** Whether this browser can create scaled bitmaps on the main thread and read them in a worker. */
export function flowBitmapsSupported(): boolean {
  return typeof createImageBitmap === 'function' && typeof OffscreenCanvas !== 'undefined';
}

/**
 * A flow-sized bitmap of the current frame. A VideoFrame snapshot is cloned so
 * the caller may close its own handle immediately (both refer to one frame).
 */
export function requestFlowBitmap(source: CanvasImageSource | VideoFrame, width: number, height: number): Promise<ImageBitmap> {
  const isVideoFrame = typeof VideoFrame !== 'undefined' && source instanceof VideoFrame;
  const image = isVideoFrame ? (source as VideoFrame).clone() : source;
  // 'low' matches the canvas drawImage scaling previously used for flow frames.
  const bitmap = createImageBitmap(image as ImageBitmapSource, { resizeWidth: width, resizeHeight: height, resizeQuality: 'low' });
  return isVideoFrame ? bitmap.finally(() => (image as VideoFrame).close()) : bitmap;
}

/** Frames kept per worker for seeding (a decode result is normally seeded within one or two flow frames). */
export const MAX_KEPT_FLOW_FRAMES = 4;

/** Small keyed cache of processed frames in the flow worker; the oldest entry is dropped first. */
export class KeptFrames<T> {
  private frames = new Map<number, T>();
  constructor(private limit = MAX_KEPT_FLOW_FRAMES) {}
  keep(key: number, frame: T) {
    this.frames.delete(key);
    this.frames.set(key, frame);
    while (this.frames.size > this.limit) this.frames.delete(this.frames.keys().next().value as number);
  }
  /** The frame, removed from the cache (each seed uses its frame once). */
  take(key: number): T | undefined {
    const frame = this.frames.get(key);
    this.frames.delete(key);
    return frame;
  }
  get size() {
    return this.frames.size;
  }
}

/** Browser-storage key for the A/B switch in Diagnostics → Performance ('off' disables the bitmap path). */
export const FLOW_BITMAPS_STORAGE_KEY = 'suturehero.flowBitmaps.v1';

/** Live switch read on every frame, so the profiler can compare both paths without a reload. */
export const flowFrameSettings = {
  useBitmaps: (() => {
    try {
      return localStorage.getItem(FLOW_BITMAPS_STORAGE_KEY) !== 'off';
    } catch {
      return true;
    }
  })(),
};

export function setFlowBitmaps(enabled: boolean) {
  flowFrameSettings.useBitmaps = enabled;
  try {
    localStorage.setItem(FLOW_BITMAPS_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Storage blocked: the switch still applies until reload.
  }
}

let nextKey = 0;
/** Unique key for a kept flow frame (per page). */
export const nextFlowFrameKey = () => ++nextKey;

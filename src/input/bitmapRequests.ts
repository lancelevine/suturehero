import { trackingPerformance as perf } from '../diagnostics/TrackingPerformance';
import type { MarkerObservation } from './arucoTracking';
import { nextFlowFrameKey, requestCropBitmap, requestFlowBitmap, type FlowSeedRef } from './flowFrames';

/** The two calls a detector worker takes bitmaps through (WorkerDetector). */
export interface BitmapDetector {
  detectBitmap(bitmap: ImageBitmap, keep?: number, origin?: { x: number; y: number }): Promise<MarkerObservation[]>;
  store(bitmap: ImageBitmap, keep: number): void;
}

/**
 * Camera frames sent to the flow and decode workers as transferred bitmaps (moved out of
 * src/tracking.ts, 2026-11-27). `onError` is called after any bitmap failure, so the caller
 * falls back to canvas readback.
 */
export function bitmapRequests(onError: () => void) {
  function postFlowBitmap(tracker: BitmapDetector, label: string, source: CanvasImageSource | VideoFrame, w: number, h: number, detect: boolean, keepForSeed: boolean) {
    const key = keepForSeed ? nextFlowFrameKey() : undefined;
    const requested = performance.now();
    // Half the flow resolution: the worker's pyramid starts at half scale anyway, so the GPU does that
    // downscale and the worker reads a quarter of the pixels (src/input/markerFlow.ts halfScalePyramid).
    const bitmap = perf.measure(label + ' flow bitmap request', () => requestFlowBitmap(source, Math.ceil(w / 2), Math.ceil(h / 2)));
    const posted = bitmap.then((image) => {
      perf.sample(label + ' flow bitmap wait', performance.now() - requested);
      if (detect) return { result: tracker.detectBitmap(image, key) };
      tracker.store(image, key!);
      return { result: null };
    });
    posted.catch((error) => {
      onError();
      perf.count(label + ' flow bitmap errors');
      console.warn('Flow bitmaps unavailable; using canvas readback.', error);
    });
    return {
      result: detect ? posted.then((p) => p.result!) : undefined,
      seed: key !== undefined ? ({ key, ready: posted.catch(() => null) } as FlowSeedRef) : undefined,
    };
  }

  /**
   * ArUco decode region as a cropped bitmap read by the marker worker (build 0.121),
   * instead of a main-thread canvas draw + getImageData (~4 ms, p95 15 ms per decode
   * in the 0.116 profile). Same fallbacks as the flow path; the threshold/crop debug
   * views need the pixels on the main thread, so they keep the previous path.
   */
  function decodeViaBitmap(detector: BitmapDetector, label: string, source: CanvasImageSource | VideoFrame, left: number, top: number, w: number, h: number): Promise<MarkerObservation[]> {
    const requested = performance.now();
    const bitmap = perf.measure(label + ' decode bitmap request', () => requestCropBitmap(source, left, top, w, h));
    return bitmap.then(
      (image) => {
        perf.sample(label + ' decode bitmap wait', performance.now() - requested);
        return detector.detectBitmap(image, undefined, { x: left, y: top });
      },
      (error) => {
        onError();
        perf.count(label + ' decode bitmap errors');
        throw error;
      },
    );
  }

  return { postFlowBitmap, decodeViaBitmap };
}

import { trackingPerformance as perf } from '../diagnostics/TrackingPerformance';
import { recordDecodeSearch } from '../diagnostics/DecodeSearchMetrics';
import { cameraImage } from '../trackingLab/runtime';
import type { MarkerObservation } from './arucoTracking';
import type { BitmapDetector, bitmapRequests } from './bitmapRequests';
import { frameClock, pairingTime } from './CameraFrameClock';
import { captureDue } from './captureScheduling';
import { FlowBudget } from './flowBudget';
import { flowFrameSettings, type FlowSeedRef } from './flowFrames';
import { flowFrameScale } from './flowScale';
import { copyFlowSeed } from './flowSeed';
import { PredictiveDecodeSearch } from './PredictiveDecodeSearch';
import { videoSnapshot } from './videoSnapshot';

/** A marker worker as the capture pipeline uses it (WorkerDetector). */
export interface CaptureDetector extends BitmapDetector {
  detect(frame: ImageData, origin?: { x: number; y: number }): Promise<MarkerObservation[]>;
}

type BitmapSenders = ReturnType<typeof bitmapRequests>;

/** Page-level settings and the bitmap senders (src/input/bitmapRequests.ts) shared by both cameras. */
export interface CaptureEnvironment {
  useBitmapFlow(): boolean;
  trackFramesActive(): boolean;
  flowMinIntervalMs(): number;
  roiDecode(): boolean;
  decodeSearchGroups(): number[][];
  postFlowBitmap: BitmapSenders['postFlowBitmap'];
  decodeViaBitmap: BitmapSenders['decodeViaBitmap'];
}

/** Threshold/crop previews that need the decoded pixels on the main thread (camera 1 only). */
export interface DecodePreview {
  readonly needsFrames: boolean;
  render(frame: ImageData): void;
}

/** One captured camera frame, ready for the flow and decode requests. Call `close()` when done. */
export interface CaptureFrame {
  doFlow: boolean;
  doDecode: boolean;
  clock: ReturnType<typeof frameClock>;
  nativeW: number;
  nativeH: number;
  /** Flow-frame size (px). */
  w: number;
  h: number;
  toNative: ReturnType<typeof flowFrameScale>['toNative'];
  toFlow: ReturnType<typeof flowFrameScale>['toFlow'];
  snapshot: ReturnType<typeof videoSnapshot> | null;
  /** performance.now() when the frame was read, and the time used to pair it with the other camera. */
  capturedAt: number;
  pairAt: number;
  flowPost: ReturnType<CaptureEnvironment['postFlowBitmap']> | null;
  /** Flow-seed image (or bitmap key) kept for the decoder's seed, when one was prepared. */
  preparedSeed: ImageData | FlowSeedRef | undefined;
  flowRequestStartedAt: number;
  close(): void;
}

function readFrame(context: CanvasRenderingContext2D, name: string, x: number, y: number, w: number, h: number) {
  return perf.measure(name, () => context.getImageData(x, y, w, h));
}

function canvas2d() {
  const canvas = document.createElement('canvas');
  return { canvas, context: canvas.getContext('2d', { willReadFrequently: true })! };
}

/**
 * One camera's capture pipeline (moved out of src/tracking.ts, 2026-11-27; it was written out
 * twice, once per camera): when a flow or decode frame is due, the video snapshot, the
 * flow-frame resize, and the flow and decode requests to the workers, with the same profiler
 * names as before ("Camera 1 …"). What each camera does with the results stays in tracking.ts.
 */
export class CameraCapture {
  lastFlowAt = 0;
  lastDecodeAt = 0;
  flowBusy = false;
  decodeBusy = false;
  lastCaptureTime = -1;
  lastDecodeTime = -1;
  /** When the last frame was read (performance.now()), for the cameras' capture skew. */
  capturedAt = 0;
  snapshotBackend = 'unknown';
  readonly budget = new FlowBudget();
  readonly search = new PredictiveDecodeSearch();
  private readonly flow = canvas2d();
  private readonly capture = canvas2d();
  private readonly decode = canvas2d();

  constructor(
    readonly index: 1 | 2,
    private readonly video: HTMLVideoElement,
    private readonly overlay: HTMLCanvasElement,
    private readonly flowTracker: CaptureDetector,
    private readonly decoder: CaptureDetector,
    private readonly env: CaptureEnvironment,
  ) {}

  /** Camera stopped: forget the flow request and the flow/decode timing (an in-flight decode keeps `decodeBusy`). */
  stopRequests() {
    this.flowBusy = false;
    this.lastFlowAt = 0;
    this.lastDecodeAt = 0;
  }

  get label() {
    return 'Camera ' + this.index;
  }

  /** The frame to process now, or null when neither flow nor decode is due. */
  begin(now: number, recovering: boolean): CaptureFrame | null {
    const label = this.label;
    const video = this.video;
    const clock = frameClock(video);
    const { doFlow, doDecode, skippedDuplicate } = captureDue({ now, lastFlowAt: this.lastFlowAt, lastDecodeAt: this.lastDecodeAt, flowBusy: this.flowBusy, decodeBusy: this.decodeBusy, clock, flowIntervalMs: this.budget.intervalMs(this.env.flowMinIntervalMs()), fastDecode: recovering || this.env.roiDecode() });
    if (skippedDuplicate) perf.count(label + ' duplicate flow requests skipped');
    if (this.decodeBusy) perf.count(label + ' decode busy checks');
    if (!doFlow && !doDecode) return null;
    perf.tick(label + ' capture attempts');
    if (video.currentTime === this.lastCaptureTime) perf.count(label + ' duplicate captures');
    this.lastCaptureTime = video.currentTime;
    if (doDecode) {
      if (video.currentTime === this.lastDecodeTime) perf.count(label + ' duplicate decodes');
      this.lastDecodeTime = video.currentTime;
    }
    const nativeW = video.videoWidth;
    const nativeH = video.videoHeight;
    const { width: w, height: h, toNative, toFlow } = flowFrameScale(nativeW, nativeH);
    if (this.flow.canvas.width !== w || this.flow.canvas.height !== h) {
      this.flow.canvas.width = w;
      this.flow.canvas.height = h;
      this.overlay.width = w;
      this.overlay.height = h;
    }
    // Frames read from the camera track exist only as the snapshot, so flow takes one too (src/input/trackFrames.ts).
    const snapshot = doDecode || this.env.trackFramesActive() ? perf.measure(label + ' video snapshot', () => videoSnapshot(video, this.capture.canvas, this.capture.context)) : null;
    if (snapshot) {
      this.snapshotBackend = snapshot.direct ? 'VideoFrame' : 'canvas fallback';
      if (!snapshot.direct) perf.count(label + ' snapshot fallback');
    }
    try {
      const bitmapFlow = this.env.useBitmapFlow();
      if (!bitmapFlow) perf.measure(label + ' flow resize', () => this.flow.context.drawImage(snapshot?.source ?? cameraImage(video), 0, 0, w, h));
      const capturedAt = performance.now();
      this.capturedAt = capturedAt;
      // Stereo pairing uses the camera's capture time when reported (src/input/CameraFrameClock.ts pairingTime).
      const pairAt = pairingTime(clock, capturedAt);
      if (pairAt !== capturedAt) perf.sample(label + ' capture to read', capturedAt - pairAt);
      const flowRequestStartedAt = performance.now();
      const flowPost = bitmapFlow ? this.env.postFlowBitmap(this.flowTracker, label, snapshot?.source ?? cameraImage(video), w, h, doFlow, doDecode) : null;
      return { doFlow, doDecode, clock, nativeW, nativeH, w, h, toNative, toFlow, snapshot, capturedAt, pairAt, flowPost, preparedSeed: flowPost?.seed, flowRequestStartedAt, close: () => snapshot?.close() };
    } catch (error) {
      snapshot?.close();
      throw error;
    }
  }

  /** Send the frame to the flow worker (bitmap, else canvas readback). The caller clears `flowBusy` when it settles. */
  requestFlow(frame: CaptureFrame, now: number): Promise<MarkerObservation[]> {
    this.flowBusy = true;
    this.lastFlowAt = now;
    frame.clock?.consume();
    const result =
      frame.flowPost?.result ??
      (() => {
        const image = readFrame(this.flow.context, this.label + ' flow readback', 0, 0, frame.w, frame.h);
        if (frame.doDecode) frame.preparedSeed = perf.measure(this.label + ' flow seed copy', () => copyFlowSeed(image));
        return this.flowTracker.detect(image);
      })();
    this.budget.record(performance.now() - frame.flowRequestStartedAt);
    return result;
  }

  /**
   * Send the planned decode region to the marker worker (bitmap, else crop and readback).
   * `liveNative` are the live markers in native pixels, for the region search. The caller clears
   * `decodeBusy` when the request settles.
   */
  requestDecode(frame: CaptureFrame, now: number, liveNative: MarkerObservation[], preview?: DecodePreview) {
    this.decodeBusy = true;
    this.lastDecodeAt = now;
    const label = this.label;
    const flowSeedFrame = frame.preparedSeed ?? readFrame(this.flow.context, label + ' flow readback', 0, 0, frame.w, frame.h);
    const region = this.search.plan(liveNative, now, frame.nativeW, frame.nativeH, this.env.roiDecode(), this.env.decodeSearchGroups());
    const { left, top, width: regionW, height: regionH } = region;
    recordDecodeSearch(perf, this.index, region);
    if (this.decode.canvas.width !== regionW || this.decode.canvas.height !== regionH) {
      this.decode.canvas.width = regionW;
      this.decode.canvas.height = regionH;
    }
    const source = frame.snapshot!.source;
    const request =
      this.env.useBitmapFlow() && flowFrameSettings.useDecodeBitmaps && !preview?.needsFrames
        ? this.env.decodeViaBitmap(this.decoder, label, source, left, top, regionW, regionH)
        : (() => {
            perf.measure(label + ' decode crop', () => this.decode.context.drawImage(source, left, top, regionW, regionH, 0, 0, regionW, regionH));
            const image = readFrame(this.decode.context, label + ' decode readback', 0, 0, regionW, regionH);
            preview?.render(image);
            return this.decoder.detect(image, { x: left, y: top });
          })();
    return { request, region, flowSeedFrame };
  }
}

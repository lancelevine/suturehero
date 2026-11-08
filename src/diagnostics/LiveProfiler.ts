import { CAMERA_REQUEST } from '../input/cameraDevices';
import { FrameCadence, type CadenceReport, type FrameMetadata } from './frameCadence';
import { breakdown, classifyStage, RollingSamples, type Breakdown, type StageInfo, type StageStats } from './profilerStats';
import type { TrackingPerformance } from './TrackingPerformance';

/**
 * Live camera/tracking profiler. Off by default: while disabled it holds no
 * hook in the timing code (TrackingPerformance.listener is null) and runs
 * no frame callbacks. Measurement only; it never changes tracking.
 */

export interface ProfiledCamera {
  /** 1 or 2. */
  index: 1 | 2;
  video: HTMLVideoElement;
}

/** Camera settings safe to export: no device IDs, group IDs or labels. */
const SAFE_SETTINGS = ['width', 'height', 'frameRate', 'aspectRatio', 'resizeMode', 'facingMode'] as const;

export interface CameraProfile {
  index: 1 | 2;
  running: boolean;
  requested: { width: number; height: number; frameRate: number };
  /** What the browser reports for the live track (MediaStreamTrack.getSettings). */
  settings: Partial<Record<(typeof SAFE_SETTINGS)[number], unknown>>;
  video: { width: number; height: number };
  cadence: CadenceReport;
  /** Tracking results per second from this camera's frames (worker results applied). */
  processed: { markerDecodesPerSec: number | null; opticalFlowPerSec: number | null };
  /** Frame age when its result was ready, from the app's capture time (excludes camera/browser buffering). */
  decodeFrameAge: StageStats | null;
  flowFrameAge: StageStats | null;
  /** Counters since the profiler was enabled: skipped or discarded work. */
  skipped: Record<string, number>;
  /** HTMLVideoElement.getVideoPlaybackQuality, where the browser fills it for camera streams. */
  playbackQuality: { totalVideoFrames: number; droppedVideoFrames: number } | null;
}

export interface ProfilerStage extends StageStats {
  name: string;
  info: StageInfo;
}

export interface ProfilerSnapshot {
  enabledForSeconds: number;
  cameras: CameraProfile[];
  stages: ProfilerStage[];
  breakdown: Breakdown;
}

export class LiveProfiler {
  private stats = new Map<string, RollingSamples>();
  private cadences = new Map<1 | 2, FrameCadence>();
  private stops: Array<() => void> = [];
  private counterBase: Record<string, number> = {};
  private enabledAt = 0;
  enabled = false;

  constructor(private perf: TrackingPerformance, private cameras: ProfiledCamera[], private clock = () => performance.now()) {}

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.enabledAt = this.clock();
    this.stats.clear();
    this.counterBase = { ...this.perf.snapshot().counters };
    // Hot path: one Map lookup and a ring-buffer write per sample; statistics are computed only when the UI asks.
    this.perf.listener = (name, ms, weight, at) => {
      let samples = this.stats.get(name);
      if (!samples) {
        samples = new RollingSamples();
        this.stats.set(name, samples);
      }
      samples.push(at, ms, weight);
    };
    for (const camera of this.cameras) this.stops.push(this.watchFrames(camera));
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    this.perf.listener = null;
    for (const stop of this.stops) stop();
    this.stops = [];
  }

  /** Delivered-frame cadence: requestVideoFrameCallback where supported, else currentTime polling. */
  private watchFrames(camera: ProfiledCamera): () => void {
    const { video, index } = camera;
    const supported = typeof video.requestVideoFrameCallback === 'function';
    const cadence = new FrameCadence(supported ? 'requestVideoFrameCallback' : 'currentTime polling');
    this.cadences.set(index, cadence);
    let source: MediaProvider | null = video.srcObject;
    let stopped = false;
    const restartIfNewStream = () => {
      if (video.srcObject !== source) {
        source = video.srcObject;
        cadence.reset();
      }
    };
    if (supported) {
      let id = 0;
      const onFrame: VideoFrameRequestCallback = (now, metadata) => {
        if (stopped) return;
        restartIfNewStream();
        cadence.frame(now, metadata as FrameMetadata);
        id = video.requestVideoFrameCallback(onFrame);
      };
      id = video.requestVideoFrameCallback(onFrame);
      return () => {
        stopped = true;
        video.cancelVideoFrameCallback(id);
      };
    }
    // Fallback: a new currentTime means a new frame reached the element (approximate cadence, no metadata).
    let last = video.currentTime;
    let raf = 0;
    const poll = (now: number) => {
      if (stopped) return;
      restartIfNewStream();
      if (video.currentTime !== last) {
        last = video.currentTime;
        cadence.frame(now, { width: video.videoWidth, height: video.videoHeight });
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }

  snapshot(): ProfilerSnapshot {
    const now = this.clock();
    const stats = new Map<string, StageStats>();
    for (const [name, samples] of this.stats) {
      const s = samples.stats(now);
      if (s) stats.set(name, s);
    }
    const counters = this.perf.snapshot().counters;
    const stages = [...stats].map(([name, s]) => ({ name, info: classifyStage(name), ...s }));
    return {
      enabledForSeconds: this.enabled ? (now - this.enabledAt) / 1000 : 0,
      cameras: this.cameras.map((camera) => this.cameraProfile(camera, now, stats, counters)),
      stages,
      breakdown: breakdown(stats),
    };
  }

  private cameraProfile(camera: ProfiledCamera, now: number, stats: Map<string, StageStats>, counters: Record<string, number>): CameraProfile {
    const { video, index } = camera;
    const track = video.srcObject instanceof MediaStream ? video.srcObject.getVideoTracks()[0] : undefined;
    const raw = track?.getSettings?.() ?? {};
    const settings: CameraProfile['settings'] = {};
    for (const key of SAFE_SETTINGS) if (key in raw) settings[key] = (raw as Record<string, unknown>)[key];
    const prefix = `Camera ${index} `;
    const skipped: Record<string, number> = {};
    for (const [name, value] of Object.entries(counters)) {
      if (!name.startsWith(prefix) || !/skipped|stale|duplicate|busy|fallback/.test(name)) continue;
      const delta = value - (this.counterBase[name] ?? 0);
      if (delta) skipped[name.slice(prefix.length)] = delta;
    }
    const quality = typeof video.getVideoPlaybackQuality === 'function' ? video.getVideoPlaybackQuality() : null;
    return {
      index,
      running: !!track && track.readyState === 'live',
      requested: { ...CAMERA_REQUEST },
      settings,
      video: { width: video.videoWidth, height: video.videoHeight },
      cadence: this.cadences.get(index)?.report(now) ?? new FrameCadence('none').report(now),
      processed: {
        markerDecodesPerSec: stats.get(`${prefix}decode worker`)?.ratePerSec ?? null,
        opticalFlowPerSec: stats.get(`${prefix}flow worker`)?.ratePerSec ?? null,
      },
      decodeFrameAge: stats.get(`${prefix}decode frame age`) ?? null,
      flowFrameAge: stats.get(`${prefix}flow frame age`) ?? null,
      skipped,
      playbackQuality: quality && quality.totalVideoFrames > 0 ? { totalVideoFrames: quality.totalVideoFrames, droppedVideoFrames: quality.droppedVideoFrames } : null,
    };
  }

  /** Exportable report: browser, camera settings, mode, statistics. No images or personal data. */
  report(context: Record<string, unknown>) {
    return {
      type: 'suturehero-live-profile',
      version: 1,
      collectedAt: new Date().toISOString(),
      browser: { userAgent: navigator.userAgent, logicalCores: navigator.hardwareConcurrency },
      trackingContext: context,
      ...this.snapshot(),
    };
  }
}

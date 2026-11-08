import { RollingSamples, type StageStats } from './profilerStats';

/**
 * Delivered-frame cadence for one camera, from requestVideoFrameCallback
 * metadata where the browser supports it (or a currentTime fallback).
 *
 * This measures frames as they reach the page. It cannot see the camera's or
 * browser's internal MJPEG decoding, only when decoded frames are presented.
 */

/** The parts of VideoFrameCallbackMetadata used here (all optional across browsers). */
export interface FrameMetadata {
  presentedFrames?: number;
  /** Camera capture time on the performance.now() clock (Chrome, for camera streams). */
  captureTime?: number;
  /** When the frame was received by the browser (Chrome, for camera/WebRTC streams). */
  receiveTime?: number;
  width?: number;
  height?: number;
}

export interface CadenceReport {
  source: 'requestVideoFrameCallback' | 'currentTime polling' | 'none';
  /** Frames presented to the page per second. */
  arrivalFps: number | null;
  interval: StageStats | null;
  /** Frames the browser presented but this page's callback did not see (presentedFrames gaps). */
  missedPresentations: number;
  /** Capture → frame callback, ms, where captureTime is reported. */
  captureToCallback: StageStats | null;
  /** Dimensions of the last delivered frame. */
  frameWidth: number | null;
  frameHeight: number | null;
}

export class FrameCadence {
  private intervals = new RollingSamples();
  private ages = new RollingSamples();
  private lastAt: number | null = null;
  private lastPresented: number | null = null;
  private missed = 0;
  private width: number | null = null;
  private height: number | null = null;

  constructor(public source: CadenceReport['source'] = 'requestVideoFrameCallback') {}

  /** One delivered frame at `now` (performance.now() clock). */
  frame(now: number, metadata: FrameMetadata = {}) {
    if (this.lastAt !== null) this.intervals.push(now, now - this.lastAt);
    this.lastAt = now;
    if (metadata.presentedFrames !== undefined) {
      if (this.lastPresented !== null && metadata.presentedFrames > this.lastPresented + 1) this.missed += metadata.presentedFrames - this.lastPresented - 1;
      // A smaller count means the stream restarted.
      this.lastPresented = metadata.presentedFrames;
    }
    if (metadata.captureTime !== undefined && Number.isFinite(metadata.captureTime) && metadata.captureTime > 0 && metadata.captureTime <= now) {
      this.ages.push(now, now - metadata.captureTime);
    }
    if (metadata.width) this.width = metadata.width;
    if (metadata.height) this.height = metadata.height;
  }

  report(now: number): CadenceReport {
    const interval = this.intervals.stats(now);
    // Frames per second from the mean interval between delivered frames.
    const arrivalFps = interval && interval.meanMs > 0 ? 1000 / interval.meanMs : null;
    return {
      source: this.source,
      arrivalFps,
      interval,
      missedPresentations: this.missed,
      captureToCallback: this.ages.stats(now),
      frameWidth: this.width,
      frameHeight: this.height,
    };
  }

  reset() {
    this.intervals.clear();
    this.ages.clear();
    this.lastAt = null;
    this.lastPresented = null;
    this.missed = 0;
  }
}

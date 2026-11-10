/**
 * Camera frames read straight from the camera track (Chrome's
 * MediaStreamTrackProcessor) instead of through the <video> element.
 *
 * Why: requestVideoFrameCallback and drawing the <video> only see frames when
 * the page is rendered, and Lance's browser renders at 30 Hz, so a 120 fps
 * OV9281 delivered 30 usable frames a second (build 0.134 profile). The track
 * processor delivers every camera frame as it arrives, independent of the
 * display. The <video> element keeps its own track for display; the
 * processor reads a clone.
 *
 * Holds only the newest frame per camera; callers take a clone (cheap,
 * reference-counted) and must close it.
 */

/** The parts of a VideoFrame used here (VideoFrame in the browser). */
export interface FrameLike {
  clone(): FrameLike;
  close(): void;
}

export interface FrameReader<F extends FrameLike> {
  read(): Promise<{ done: boolean; value?: F }>;
  cancel(): Promise<void>;
}

/** Starts reading a cloned track; returns the reader and a function that stops the clone. */
export type OpenTrack<F extends FrameLike> = () => { reader: FrameReader<F>; stop: () => void } | null;

export class TrackFrames<F extends FrameLike> {
  private latest: F | null = null;
  private stopCurrent: (() => void) | null = null;
  private generation = 0;

  /** Whether frames are being read. */
  get active() {
    return this.stopCurrent !== null;
  }

  /** Starts reading (stopping any previous reader). `onFrame` runs once per arriving frame. */
  start(open: OpenTrack<F>, onFrame: () => void): boolean {
    this.stop();
    const opened = open();
    if (!opened) return false;
    const generation = ++this.generation;
    const { reader, stop } = opened;
    this.stopCurrent = () => {
      void reader.cancel().catch(() => undefined);
      stop();
    };
    const pump = async () => {
      try {
        while (generation === this.generation) {
          const { done, value } = await reader.read();
          if (done || !value) break;
          if (generation !== this.generation) {
            value.close();
            break;
          }
          this.latest?.close();
          this.latest = value;
          onFrame();
        }
      } catch {
        // Track ended or reader cancelled: fall back to the <video> element.
      }
      if (generation === this.generation) this.stop();
    };
    void pump();
    return true;
  }

  /** A clone of the newest frame (caller closes it), or null. */
  takeLatest(): F | null {
    return (this.latest?.clone() as F | undefined) ?? null;
  }

  stop() {
    this.generation++;
    this.stopCurrent?.();
    this.stopCurrent = null;
    this.latest?.close();
    this.latest = null;
  }
}

interface ProcessorConstructor {
  new (init: { track: MediaStreamTrack; maxBufferSize?: number }): { readable: ReadableStream<VideoFrame> };
}

/** Chrome's MediaStreamTrackProcessor on the page, if available. */
export function trackProcessor(): ProcessorConstructor | null {
  const candidate = (globalThis as { MediaStreamTrackProcessor?: ProcessorConstructor }).MediaStreamTrackProcessor;
  return typeof candidate === 'function' ? candidate : null;
}

/** Keep at most this many unread frames queued (older ones are dropped by the browser). */
const PROCESSOR_BUFFER_FRAMES = 1;

/** Opener for a <video> element's current camera stream (a clone of its video track). */
export function openVideoTrack(video: HTMLVideoElement): OpenTrack<VideoFrame> {
  return () => {
    const Processor = trackProcessor();
    const stream = video.srcObject;
    if (!Processor || !(stream instanceof MediaStream)) return null;
    const track = stream.getVideoTracks()[0];
    if (!track || track.readyState !== 'live') return null;
    const clone = track.clone();
    try {
      const processor = new Processor({ track: clone, maxBufferSize: PROCESSOR_BUFFER_FRAMES });
      return { reader: processor.readable.getReader(), stop: () => clone.stop() };
    } catch {
      clone.stop();
      return null;
    }
  };
}

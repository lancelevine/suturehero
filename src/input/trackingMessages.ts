import {recordedInput} from '../trackingLab/runtime';
/**
 * Messages from the camera tracking code (`src/tracking.ts`) to the practice
 * scene (`src/main.ts`) and the calibration preview.
 *
 * When tracking runs inside the practice page, messages are window
 * CustomEvents named after their `type`. When it runs as its own page
 * (`tracking.html`), they are sent with `postMessage` to the parent window
 * (or to itself when there is no parent), restricted to the same origin.
 *
 * Receivers must validate everything: use the `parse…` functions below.
 */

export const TRACKED_INSTRUMENTS = ['needleDriver', 'forceps', 'scissors'] as const;
export type TrackedInstrument = (typeof TRACKED_INSTRUMENTS)[number];

export const TRACKING_MESSAGE = {
  pose: 'suturehero:tracking-pose',
  jawOpening: 'suturehero:jaw-opening',
  status: 'suturehero:tracking-status',
  fps: 'suturehero:tracking-fps',
} as const;

/** Instrument pose in practice-scene units, as last rendered by tracking. */
export interface TrackingPoseMessage {
  type: typeof TRACKING_MESSAGE.pose;
  instrument: TrackedInstrument;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  /** Date.now() when sent. */
  seenAt: number;
}

/** Jaw opening from 0 (closed) to 1 (open). */
export interface JawOpeningMessage {
  type: typeof TRACKING_MESSAGE.jawOpening;
  instrument: TrackedInstrument;
  opening: number;
  /** 1-based camera numbers that contributed. */
  cameras: number[];
  seenAt: number;
}

/** Overall tracking state for the status badge (validated by the badge). */
export interface TrackingStatusMessage {
  type: typeof TRACKING_MESSAGE.status;
  state: string;
  label: string | null;
  sources: Record<string, unknown>;
}

/** Tracking loop frame rate. */
export interface TrackingFpsMessage {
  type: typeof TRACKING_MESSAGE.fps;
  fps: number;
}

export type TrackingMessage = TrackingPoseMessage | JawOpeningMessage | TrackingStatusMessage | TrackingFpsMessage;

/**
 * Send a message. `inPage` selects a window CustomEvent (tracking embedded in
 * the practice page) instead of `postMessage` to the parent window.
 */
export function publishTrackingMessage(message: TrackingMessage, inPage: boolean): void {
  if(recordedInput())return; // Replay observations never drive the live practice scene.
  if (inPage) window.dispatchEvent(new CustomEvent(message.type, { detail: message }));
  else window.parent.postMessage(message, location.origin);
}

const isInstrument = (value: unknown): value is TrackedInstrument =>
  (TRACKED_INSTRUMENTS as readonly unknown[]).includes(value);

const finiteArray = (value: unknown, length: number): value is number[] =>
  Array.isArray(value) &&
  value.length === length &&
  value.every((item) => typeof item === 'number' && Number.isFinite(item));

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';

/** A valid pose message, or null. */
export function parseTrackingPose(data: unknown): TrackingPoseMessage | null {
  if (!record(data) || data.type !== TRACKING_MESSAGE.pose || !isInstrument(data.instrument)) return null;
  if (!finiteArray(data.position, 3) || !finiteArray(data.quaternion, 4)) return null;
  return data as unknown as TrackingPoseMessage;
}

/** A valid jaw-opening message with the opening clamped to 0–1, or null. */
export function parseJawOpening(data: unknown): { instrument: TrackedInstrument; opening: number } | null {
  if (!record(data) || data.type !== TRACKING_MESSAGE.jawOpening || !isInstrument(data.instrument)) return null;
  if (typeof data.opening !== 'number' || !Number.isFinite(data.opening)) return null;
  return { instrument: data.instrument, opening: Math.min(1, Math.max(0, data.opening)) };
}

/** The frame rate from an fps message, or null. */
export function parseTrackingFps(data: unknown): number | null {
  if (!record(data) || data.type !== TRACKING_MESSAGE.fps || typeof data.fps !== 'number') return null;
  return data.fps;
}

export function isTrackingStatus(data: unknown): boolean {
  return record(data) && data.type === TRACKING_MESSAGE.status;
}

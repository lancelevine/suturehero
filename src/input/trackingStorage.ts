import type { TrackerType } from './prismPose';

/**
 * Browser-storage keys and parsers for the tracking page's saved settings.
 *
 * Everything is stored in this browser only (localStorage). Reading or
 * writing can throw when the browser blocks site storage, so all access goes
 * through the safe helpers below: a blocked or corrupt value means "use the
 * default", never a broken page.
 *
 * Existing key names are kept exactly so users keep their saved setup.
 * New keys should follow `suturehero.<name>.v<n>`.
 */
export const TRACKING_STORAGE_KEYS = {
  trackerType: 'suturehero.trackerType',
  stereoCalibration: 'suturehero.stereoCalibration.v1',
  depthCalibration: 'suturehero.depthCalibration.v2',
  needleJawPattern: 'suturehero.needleJawPattern.v1',
  jawTrackingCamera1: 'suturehero.jaw-tracking.v1',
  jawTrackingCamera2: 'suturehero.jaw-tracking.camera2.v1',
} as const;

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** The page's localStorage, or undefined if the browser blocks it. */
export function browserStorage(): KeyValueStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function readStored(key: string, storage = browserStorage()): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Returns false if the value could not be saved. */
export function writeStored(key: string, value: string, storage = browserStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStored(key: string, storage = browserStorage()): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

/** Parsed JSON for a key, or undefined if missing, blocked or not valid JSON. */
export function readStoredJson(key: string, storage = browserStorage()): unknown {
  const raw = readStored(key, storage);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// --- Tracker geometry -------------------------------------------------------

/** Unknown values fall back to the original prism tracker. */
export function parseTrackerType(value: unknown): TrackerType {
  return value === 'ring8' || value === 'ring6' ? value : 'prism';
}

// --- Needle-driver jaw ball pattern -----------------------------------------

export const NEEDLE_JAW_PATTERNS = ['color', 'striped10', 'white10'] as const;
export type NeedleJawPattern = (typeof NEEDLE_JAW_PATTERNS)[number];

export function parseNeedleJawPattern(value: unknown): NeedleJawPattern {
  return (NEEDLE_JAW_PATTERNS as readonly unknown[]).includes(value) ? (value as NeedleJawPattern) : 'color';
}

/** Saved colored-ball jaw setup for camera 0 (first) or 1 (second). */
export function jawStorageKey(camera: number): string {
  return camera ? TRACKING_STORAGE_KEYS.jawTrackingCamera2 : TRACKING_STORAGE_KEYS.jawTrackingCamera1;
}

/** Saved needle-driver setup for the white or striped ball patterns. */
export function patternJawStorageKey(camera: number, pattern: NeedleJawPattern): string {
  return jawStorageKey(camera) + (pattern === 'white10' ? '.white10' : '.striped10');
}

// --- Single-camera depth calibration ----------------------------------------

/** Allowed working depth range, in mm. */
export const WORKING_DEPTH_MIN_MM = 50;
export const WORKING_DEPTH_MAX_MM = 1500;
export const DEFAULT_WORKING_DEPTH_MM = 400;
/** Far must be at least this much beyond Near, in mm. */
export const MIN_NEAR_FAR_SEPARATION_MM = 20;

export interface SavedDepthCalibration {
  near: number | null;
  far: number | null;
  range: number;
  size: unknown;
}

export interface ParsedDepthCalibration {
  /** Valid working depth range, if saved. */
  range?: number;
  /** Size-based calibration data, validated by SizeDepthCalibration.restore. */
  size?: unknown;
  /** Near depth, if valid. */
  near?: number;
  /** Far depth, only if Near is valid and Far is far enough beyond it. */
  far?: number;
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Validate a saved depth calibration. Invalid parts are left out. */
export function parseDepthCalibration(value: unknown): ParsedDepthCalibration {
  if (!value || typeof value !== 'object') return {};
  const saved = value as Record<string, unknown>;
  const parsed: ParsedDepthCalibration = { size: saved.size };
  if (finite(saved.range) && saved.range >= WORKING_DEPTH_MIN_MM && saved.range <= WORKING_DEPTH_MAX_MM) {
    parsed.range = saved.range;
  }
  if (finite(saved.near) && saved.near > 0) {
    parsed.near = saved.near;
    if (finite(saved.far) && saved.far > saved.near + MIN_NEAR_FAR_SEPARATION_MM) parsed.far = saved.far;
  }
  return parsed;
}

import { Quaternion, Vector3 } from 'three';
import { solvePivot, type PivotSample } from './pivotCalibration';

/**
 * Stereo tip calibration sessions and saved tip offsets (2026-11-14).
 * Calibrate → "Calibrate tip": rest the tip on one spot and rock the
 * instrument; stereo poses are collected for CAPTURE_MS and solved with
 * solvePivot. The tip offset is a property of the tracker and instrument,
 * not of the cameras, so it is saved per tracker type and survives a new
 * stereo calibration.
 */

export const STEREO_TIPS_STORAGE_KEY = 'suturehero.stereoTips.v1';
/** How long one tip capture collects poses (ms). */
export const CAPTURE_MS = 8000;

export interface SavedTip {
  tip: [number, number, number];
  rmsMm: number;
  at: string;
  /** Tracker body → model rotation from "Set jaw orientation" (src/input/jawRoll.ts), [x, y, z, w]. */
  bodyToModel?: [number, number, number, number];
}
type SavedTips = Record<string, Record<string, SavedTip>>;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class StereoTipCalibration {
  private capture: { instrument: string; trackerType: string; startedAt: number; samples: PivotSample[] } | null = null;
  private message = '';
  private jawRequest: { instrument: string; trackerType: string } | null = null;

  constructor(private readonly storage: StorageLike | null) {}

  private read(): SavedTips {
    try {
      const value = JSON.parse(this.storage?.getItem(STEREO_TIPS_STORAGE_KEY) ?? '{}');
      return value && typeof value === 'object' ? (value as SavedTips) : {};
    } catch {
      return {};
    }
  }

  /** Calibrated tip in the tracker body frame (mm), or null. */
  tip(instrument: string, trackerType: string): Vector3 | null {
    const saved = this.read()[trackerType]?.[instrument];
    if (!saved || !Array.isArray(saved.tip) || saved.tip.length !== 3 || !saved.tip.every(Number.isFinite)) return null;
    return new Vector3(...saved.tip);
  }

  saved(instrument: string, trackerType: string): SavedTip | null {
    return this.read()[trackerType]?.[instrument] ?? null;
  }

  /** Saved jaw orientation (body → model), or null. */
  jawOrientation(instrument: string, trackerType: string): Quaternion | null {
    const q = this.saved(instrument, trackerType)?.bodyToModel;
    return Array.isArray(q) && q.length === 4 && q.every(Number.isFinite) ? new Quaternion(...q).normalize() : null;
  }

  /** Asks tracking to capture the jaw orientation from the next stereo pose of `instrument`. */
  requestJawOrientation(instrument: string, trackerType: string) {
    if (!this.saved(instrument, trackerType)) {
      this.message = 'Calibrate the tip first; the jaw orientation is stored with it.';
      return;
    }
    this.jawRequest = { instrument, trackerType };
    this.message = 'Hold the jaws opening sideways (finger rings level)…';
  }

  /** Whether a jaw orientation capture is waiting for `instrument` (taken once by tracking). */
  takeJawRequest(instrument: string): string | null {
    if (this.jawRequest?.instrument !== instrument) return null;
    const trackerType = this.jawRequest.trackerType;
    this.jawRequest = null;
    return trackerType;
  }

  /** Saves a captured jaw orientation (or reports why there is none). */
  saveJawOrientation(instrument: string, trackerType: string, bodyToModel: Quaternion | null) {
    const all = this.read();
    const entry = all[trackerType]?.[instrument];
    if (!entry || !bodyToModel) {
      this.message = 'Jaw orientation not set: point the shaft less steeply (not straight up or down) and try again.';
      return;
    }
    entry.bodyToModel = bodyToModel.toArray() as [number, number, number, number];
    this.write(all);
    this.message = 'Jaw orientation set: the model now rolls with the real instrument.';
  }

  remove(instrument: string, trackerType: string) {
    const all = this.read();
    if (all[trackerType]) delete all[trackerType][instrument];
    this.write(all);
  }

  private write(all: SavedTips) {
    try {
      this.storage?.setItem(STEREO_TIPS_STORAGE_KEY, JSON.stringify(all));
    } catch {
      // Blocked storage: the tip lasts until reload.
    }
  }

  /** Starts collecting stereo poses for one instrument. */
  start(instrument: string, trackerType: string, now: number) {
    this.capture = { instrument, trackerType, startedAt: now, samples: [] };
    this.message = 'Rest the tip on one spot and rock the instrument slowly in all directions…';
  }

  cancel() {
    this.capture = null;
    this.message = 'Tip calibration cancelled.';
  }

  /** Whether `instrument`'s tip is being captured. */
  capturing(instrument?: string): boolean {
    return !!this.capture && (instrument === undefined || this.capture.instrument === instrument);
  }

  /** Feeds one stereo pose; finishes (solves and saves) when the capture time is over. */
  feed(instrument: string, pose: PivotSample, now: number) {
    const c = this.capture;
    if (!c || c.instrument !== instrument) return;
    c.samples.push({ position: pose.position.clone(), quaternion: pose.quaternion.clone() });
    const left = Math.max(0, CAPTURE_MS - (now - c.startedAt));
    this.message = `Rocking… ${c.samples.length} poses · ${(left / 1000).toFixed(0)} s left`;
    if (left > 0) return;
    this.capture = null;
    const result = solvePivot(c.samples);
    if ('error' in result) {
      this.message = `Tip not calibrated: ${result.error}`;
      return;
    }
    const all = this.read();
    all[c.trackerType] = { ...(all[c.trackerType] ?? {}), [c.instrument]: { tip: result.tipInBody.toArray() as [number, number, number], rmsMm: result.rmsMm, at: new Date().toISOString() } };
    this.write(all);
    this.message = `Tip calibrated: ${result.tipInBody.length().toFixed(0)} mm from the ring centre · ±${result.rmsMm.toFixed(1)} mm over ${result.samples} poses.`;
  }

  status(): string {
    return this.message;
  }
}

/** Latest calibrated tip per instrument in camera-1 mm (set by tracking), for the "tips apart" readout. */
export const latestStereoTips = new Map<string, { mm: Vector3; at: number }>();

/** A tip older than this (ms) is not shown in the readout. */
export const TIP_READOUT_MAX_AGE_MS = 500;

/** Distance (mm) between the forceps and needle driver tips, or null if either is not current. */
export function tipsApartMm(now: number): number | null {
  const a = latestStereoTips.get('forceps');
  const b = latestStereoTips.get('needleDriver');
  if (!a || !b || now - a.at > TIP_READOUT_MAX_AGE_MS || now - b.at > TIP_READOUT_MAX_AGE_MS) return null;
  return a.mm.distanceTo(b.mm);
}

const browserStorage = (): StorageLike | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

export const stereoTipCalibration = new StereoTipCalibration(browserStorage());

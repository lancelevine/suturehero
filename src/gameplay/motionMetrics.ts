import { Vector3 } from 'three';

/**
 * Motion metrics from measured stereo tips (2026-11-14), the standard
 * motion-analysis measures of surgical-skills research: time, path length,
 * speed, idle time, number of movements, and how much the two hands move
 * at once. Computed from the calibrated tip positions in real millimetres
 * (src/input/stereoTipCalibration.ts). Approximate and not validated for
 * this setup: for comparing attempts, not for assessment.
 */

/** Below this tip speed (mm/s) the instrument counts as idle. */
export const IDLE_SPEED_MM_S = 5;
/** A movement starts when the speed rises above this (mm/s) and ends when it falls below IDLE_SPEED_MM_S. */
export const MOVEMENT_SPEED_MM_S = 20;
/** Samples further apart than this (ms) are a tracking gap: no path or time is counted across it. */
export const MAX_SAMPLE_GAP_MS = 250;
/** Speed is averaged over this window (ms) so single-frame jitter is not counted as movement. */
export const SPEED_WINDOW_MS = 100;

export interface MotionSample {
  instrument: string;
  /** ms */
  at: number;
  /** Tip position, camera-1 mm. */
  x: number;
  y: number;
  z: number;
}

export interface InstrumentMetrics {
  instrument: string;
  /** Tracked time (s), excluding gaps. */
  trackedSeconds: number;
  pathLengthMm: number;
  meanSpeedMmS: number;
  idleSeconds: number;
  /** Separate movements (speed rising above MOVEMENT_SPEED_MM_S). */
  movements: number;
}

export interface MotionSummary {
  /** Wall time from first to last sample (s). */
  durationSeconds: number;
  instruments: InstrumentMetrics[];
  /** Share of the time both instruments were moving (0–1), or null with fewer than two instruments. */
  bimanualFraction: number | null;
}

/** Per-sample speeds (mm/s) over SPEED_WINDOW_MS, and whether each step crosses a gap. */
function speeds(samples: readonly MotionSample[]): number[] {
  const result: number[] = [];
  let start = 0;
  for (let i = 0; i < samples.length; i++) {
    if (i > 0 && samples[i].at - samples[i - 1].at > MAX_SAMPLE_GAP_MS) start = i;
    while (start < i && samples[i].at - samples[start].at > SPEED_WINDOW_MS) start++;
    const a = samples[start], b = samples[i];
    const dt = (b.at - a.at) / 1000;
    result.push(dt > 0 ? Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / dt : 0);
  }
  return result;
}

export function instrumentMetrics(instrument: string, samples: readonly MotionSample[]): InstrumentMetrics {
  const speed = speeds(samples);
  let tracked = 0, path = 0, idle = 0, movements = 0, moving = false;
  for (let i = 1; i < samples.length; i++) {
    const dtMs = samples[i].at - samples[i - 1].at;
    if (dtMs <= 0 || dtMs > MAX_SAMPLE_GAP_MS) continue;
    const dt = dtMs / 1000;
    tracked += dt;
    path += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y, samples[i].z - samples[i - 1].z);
    if (speed[i] < IDLE_SPEED_MM_S) idle += dt;
    if (!moving && speed[i] > MOVEMENT_SPEED_MM_S) {
      moving = true;
      movements++;
    } else if (moving && speed[i] < IDLE_SPEED_MM_S) moving = false;
  }
  return { instrument, trackedSeconds: tracked, pathLengthMm: path, meanSpeedMmS: tracked > 0 ? path / tracked : 0, idleSeconds: idle, movements };
}

/** Time-ordered speed lookup: the speed of the latest sample at or before `at`, or null if none within a gap. */
function speedAt(samples: readonly MotionSample[], speed: readonly number[], at: number): number | null {
  let lo = 0, hi = samples.length - 1, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].at <= at) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found >= 0 && at - samples[found].at <= MAX_SAMPLE_GAP_MS ? speed[found] : null;
}

export function summarize(samples: readonly MotionSample[]): MotionSummary {
  const byInstrument = new Map<string, MotionSample[]>();
  for (const sample of samples) {
    const list = byInstrument.get(sample.instrument) ?? [];
    list.push(sample);
    byInstrument.set(sample.instrument, list);
  }
  for (const list of byInstrument.values()) list.sort((a, b) => a.at - b.at);
  const instruments = [...byInstrument].map(([name, list]) => instrumentMetrics(name, list));
  const times = samples.map((s) => s.at);
  const duration = times.length ? (Math.max(...times) - Math.min(...times)) / 1000 : 0;
  let bimanualFraction: number | null = null;
  if (byInstrument.size >= 2) {
    const [a, b] = [...byInstrument.values()];
    const [speedA, speedB] = [speeds(a), speeds(b)];
    let both = 0, counted = 0;
    for (let i = 0; i < a.length; i++) {
      const other = speedAt(b, speedB, a[i].at);
      if (other === null) continue;
      counted++;
      if (speedA[i] >= IDLE_SPEED_MM_S && other >= IDLE_SPEED_MM_S) both++;
    }
    bimanualFraction = counted ? both / counted : null;
  }
  return { durationSeconds: duration, instruments, bimanualFraction };
}

/** Records tip samples between start() and stop(). */
export class MotionRecorder {
  private samples: MotionSample[] = [];
  private recording = false;
  private startedAt: string | null = null;

  start() {
    this.samples = [];
    this.recording = true;
    this.startedAt = new Date().toISOString();
  }

  stop() {
    this.recording = false;
  }

  get active() {
    return this.recording;
  }

  get count() {
    return this.samples.length;
  }

  add(instrument: string, tipMm: Vector3, at: number) {
    if (!this.recording) return;
    this.samples.push({ instrument, at, x: tipMm.x, y: tipMm.y, z: tipMm.z });
  }

  summary(): MotionSummary {
    return summarize(this.samples);
  }

  /** Everything for export: summary, settings and raw samples. */
  exportData(build: string) {
    return {
      format: 'suturehero-motion-metrics-v1',
      build,
      startedAt: this.startedAt,
      note: 'Approximate motion metrics from stereo-tracked tips; not validated for assessment.',
      thresholds: { idleSpeedMmS: IDLE_SPEED_MM_S, movementSpeedMmS: MOVEMENT_SPEED_MM_S, maxSampleGapMs: MAX_SAMPLE_GAP_MS, speedWindowMs: SPEED_WINDOW_MS },
      summary: this.summary(),
      samples: this.samples,
    };
  }
}

export const motionRecorder = new MotionRecorder();

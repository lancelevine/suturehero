/**
 * Rolling statistics and stage classification for the live performance
 * profiler. Pure functions only, so they can be unit tested; the browser
 * wiring is in LiveProfiler.ts and the UI in src/ui/ProfilerPanel.ts.
 *
 * Measurement only: nothing here changes tracking.
 */

/** Samples kept per stage (rolling window). */
export const ROLLING_SAMPLES = 120;
/** Samples older than this are dropped, so a stage that stopped running does not keep stale numbers (ms). */
export const MAX_SAMPLE_AGE_MS = 10_000;

export interface StageStats {
  count: number;
  meanMs: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
  /** Samples (or weighted events) per second over the window. */
  ratePerSec: number;
  /** Summed duration per second of wall time: how busy this stage keeps its thread (ms/s, 1000 = fully busy). */
  busyMsPerSec: number;
}

/** Fixed-size ring buffer of (time, duration, weight) samples. */
export class RollingSamples {
  private at = new Float64Array(ROLLING_SAMPLES);
  private ms = new Float64Array(ROLLING_SAMPLES);
  private weight = new Float64Array(ROLLING_SAMPLES);
  private next = 0;
  private size = 0;

  push(at: number, ms: number, weight = 1) {
    this.at[this.next] = at;
    this.ms[this.next] = ms;
    this.weight[this.next] = weight;
    this.next = (this.next + 1) % ROLLING_SAMPLES;
    this.size = Math.min(ROLLING_SAMPLES, this.size + 1);
  }

  /** Statistics over samples newer than now − MAX_SAMPLE_AGE_MS, or null if none. */
  stats(now: number): StageStats | null {
    const durations: number[] = [];
    let first = Infinity;
    let last = -Infinity;
    let weights = 0;
    let firstWeight = 0;
    let total = 0;
    for (let i = 0; i < this.size; i++) {
      const at = this.at[i];
      if (at < now - MAX_SAMPLE_AGE_MS) continue;
      durations.push(this.ms[i]);
      total += this.ms[i];
      weights += this.weight[i];
      if (at < first) {
        first = at;
        firstWeight = this.weight[i];
      }
      if (at > last) last = at;
    }
    if (!durations.length) return null;
    durations.sort((a, b) => a - b);
    // Rate from the span between the first and last sample: events after the first ÷ time between them.
    const spanSec = (last - first) / 1000;
    const ratePerSec = spanSec > 0 ? (weights - firstWeight) / spanSec : 0;
    // Busy time: mean duration × samples per second (unweighted: every sample is one run of the stage).
    const samplesPerSec = spanSec > 0 ? (durations.length - 1) / spanSec : 0;
    const busyMsPerSec = (total / durations.length) * samplesPerSec;
    return {
      count: durations.length,
      meanMs: total / durations.length,
      medianMs: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
      maxMs: durations[durations.length - 1],
      ratePerSec,
      busyMsPerSec,
    };
  }

  clear() {
    this.next = 0;
    this.size = 0;
  }
}

/** Nearest-rank percentile of an ascending array. */
export function percentile(sorted: readonly number[], fraction: number): number {
  if (!sorted.length) return NaN;
  const rank = Math.ceil(fraction * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank))];
}

export type StageCategory =
  | 'acquisition'
  | 'readback'
  | 'preprocessing'
  | 'aruco'
  | 'flow'
  | 'pose'
  | 'sphere'
  | 'stereo'
  | 'render'
  | 'ui'
  | 'latency'
  | 'loop'
  | 'other';

export interface StageInfo {
  /** 1 or 2 for per-camera work, 'shared' for work on both cameras' results. */
  camera: 1 | 2 | 'shared';
  category: StageCategory;
  /** Where the time is spent. 'latency' rows are elapsed time, not work. */
  thread: 'main' | 'worker' | 'latency' | 'event';
  /** A parent row that already contains this row's time (not counted again in breakdowns). */
  nestedIn?: string;
  /** Short plain-language description for the panel. */
  label: string;
}

const WORKER_SUBSTAGES: Record<string, string> = {
  grayscale: 'ArUco: grayscale conversion',
  thresholding: 'ArUco: adaptive threshold',
  'contour detection': 'ArUco: contour detection',
  'quadrilateral candidates': 'ArUco: square candidates',
  'dictionary decoding': 'ArUco: marker ID decoding',
  'corner refinement': 'ArUco: corner refinement',
};

/**
 * Map an existing TrackingPerformance row name to what it measures. Names
 * come from src/tracking.ts, src/main.ts and src/jaw; unknown names are
 * reported as 'other' rather than guessed.
 */
export function classifyStage(name: string): StageInfo {
  const cameraMatch = /^Camera ([12]) (.*)$/.exec(name);
  if (cameraMatch) {
    const camera = Number(cameraMatch[1]) as 1 | 2;
    const rest = cameraMatch[2];
    const parent = (stage: string) => `Camera ${camera} ${stage}`;
    if (rest === 'presented frames') return { camera, category: 'acquisition', thread: 'event', label: 'Frames presented to the page (requestVideoFrameCallback)' };
    if (rest === 'capture attempts') return { camera, category: 'acquisition', thread: 'event', label: 'Tracking frame capture attempts' };
    if (rest === 'video snapshot') return { camera, category: 'acquisition', thread: 'main', label: 'Video frame snapshot (VideoFrame or canvas)' };
    if (rest === 'flow resize' || rest === 'decode crop') return { camera, category: 'acquisition', thread: 'main', label: rest === 'flow resize' ? 'Canvas draw: downscale for optical flow' : 'Canvas draw: crop for marker decode' };
    if (rest === 'flow readback' || rest === 'decode readback') return { camera, category: 'readback', thread: 'main', label: `Pixel readback (getImageData) for ${rest.startsWith('flow') ? 'optical flow' : 'marker decode'}` };
    if (rest === 'flow seed copy') return { camera, category: 'readback', thread: 'main', label: 'Pixel copy: optical-flow seed frame' };
    if (rest === 'jaw frame copy') return { camera, category: 'readback', thread: 'main', nestedIn: 'Jaw tracking', label: 'Pixel readback for jaw ball search' };
    if (rest === 'decode worker') return { camera, category: 'aruco', thread: 'worker', label: 'ArUco marker detection (worker, total)' };
    if (/^(predicted|expanded|full) decode worker$/.test(rest)) return { camera, category: 'aruco', thread: 'worker', nestedIn: parent('decode worker'), label: `ArUco detection, ${rest.split(' ')[0]} search region` };
    if (rest.startsWith('decode ') && WORKER_SUBSTAGES[rest.slice(7)]) return { camera, category: rest.slice(7) === 'grayscale' ? 'preprocessing' : 'aruco', thread: 'worker', nestedIn: parent('decode worker'), label: WORKER_SUBSTAGES[rest.slice(7)] };
    if (rest === 'flow worker') return { camera, category: 'flow', thread: 'worker', label: 'Marker corner optical flow (worker)' };
    if (rest.startsWith('flow ') && WORKER_SUBSTAGES[rest.slice(5)]) return { camera, category: 'flow', thread: 'worker', nestedIn: parent('flow worker'), label: WORKER_SUBSTAGES[rest.slice(5)] };
    if (/(round trip|transfer\/callback|frame age|applied image age)$/.test(rest)) return { camera, category: 'latency', thread: 'latency', label: latencyLabel(rest) };
    if (rest.startsWith('jaw ')) return { camera, category: 'sphere', thread: 'main', label: 'Classic colored-ball jaw scan' };
    return { camera, category: 'other', thread: 'main', label: name };
  }
  const shared = (category: StageCategory, label: string, nestedIn?: string, thread: StageInfo['thread'] = 'main'): StageInfo => ({ camera: 'shared', category, thread, nestedIn, label });
  switch (name) {
    case 'Pose estimation + filtering': return shared('pose', 'Marker pose estimation + filtering (all instruments)');
    case 'Rigid pose solve': return shared('pose', 'Single-camera rigid pose solve', 'Pose estimation + filtering');
    case 'Stereo pose/synchronization': return shared('stereo', 'Stereo pairing + joint stereo pose solve', 'Pose estimation + filtering');
    case 'Stereo fusion (render loop)': return shared('stereo', 'Stereo/single-camera fusion per rendered frame');
    case 'Jaw tracking': return shared('sphere', 'Jaw tracking (white balls or handle prism), total');
    case 'Jaw ball detection': return shared('sphere', 'Jaw: bright-ball detection', 'Jaw tracking');
    case 'Jaw stereo ball detection': return shared('sphere', 'Jaw: stereo ball search', 'Jaw tracking');
    case 'Striped jaw search': return shared('sphere', 'Classic striped-ball jaw search');
    case 'Striped full-frame reacquisition': return shared('sphere', 'Classic striped-ball full-frame search');
    case 'Jaw color scan + calibration': return shared('sphere', 'Classic colored-ball jaw scan');
    case 'Simulator render submission': return shared('render', '3D render submission, practice scene (CPU side)');
    case 'Tracking render submission': return shared('render', '3D render submission, tracking preview (CPU side)');
    case 'Marker overlay drawing': return shared('render', 'Camera overlay drawing (markers, axis)');
    case 'Tracking status UI': return shared('ui', 'Tracking status text updates');
    case 'Tracking CPU frame': return shared('loop', 'Tracking loop, synchronous part (total)', undefined, 'main');
    case 'Simulator CPU frame': return shared('loop', 'Practice scene frame (total)', undefined, 'main');
    case 'Tracking frame interval': case 'Simulator frame interval': return shared('latency', 'Time between animation frames', undefined, 'latency');
    case 'Camera capture skew': case 'Camera accepted-update skew': return shared('latency', 'Time offset between Camera 1 and Camera 2 frames', undefined, 'latency');
    case 'Main-thread long task': return shared('other', 'Browser-reported long tasks (> 50 ms)', undefined, 'latency');
    case 'Tracking loop': return shared('loop', 'Tracking loop iterations', undefined, 'event');
    default: return shared('other', name);
  }
}

function latencyLabel(rest: string): string {
  if (rest.endsWith('round trip')) return 'Worker round trip (queue + transfer + work)';
  if (rest.endsWith('transfer/callback')) return 'Worker transfer + callback (round trip − worker time)';
  if (rest.endsWith('applied image age')) return 'Age of the image behind the current pose';
  return 'Frame age at result (from app capture, excludes camera buffering)';
}

/** Loop totals contain most main-thread stages; they are shown, never added. */
const isTotal = (info: StageInfo) => info.category === 'loop';

export interface BreakdownRow {
  name: string;
  info: StageInfo;
  busyMsPerSec: number;
  /** Share of the summed top-level time on the same thread (main, or that camera's worker). */
  percent: number;
}

export interface Breakdown {
  /** Top-level main-thread stages; percentages are of their sum (they may still overlap slightly). */
  main: BreakdownRow[];
  /** Per-camera worker stages (ArUco, optical flow); each runs on its own worker in parallel. */
  workers: BreakdownRow[];
  /** Busiest measured stage on any thread. */
  bottleneck: BreakdownRow | null;
}

/**
 * Where the measured time goes, without double counting: nested rows are
 * left out (their parent contains them), loop totals and latency rows are
 * left out, and worker time is kept apart from main-thread time because it
 * runs in parallel.
 */
export function breakdown(stats: ReadonlyMap<string, StageStats>): Breakdown {
  const rows: BreakdownRow[] = [];
  for (const [name, s] of stats) {
    const info = classifyStage(name);
    if (info.nestedIn || isTotal(info) || info.thread === 'latency' || info.thread === 'event' || s.busyMsPerSec <= 0) continue;
    rows.push({ name, info, busyMsPerSec: s.busyMsPerSec, percent: 0 });
  }
  const main = rows.filter((r) => r.info.thread === 'main');
  const workers = rows.filter((r) => r.info.thread === 'worker');
  const mainTotal = main.reduce((sum, r) => sum + r.busyMsPerSec, 0);
  for (const r of main) r.percent = mainTotal > 0 ? (100 * r.busyMsPerSec) / mainTotal : 0;
  // Each camera has its own decode and flow workers; a worker's share is of 1000 ms/s (fully busy).
  for (const r of workers) r.percent = Math.min(100, r.busyMsPerSec / 10);
  main.sort((a, b) => b.busyMsPerSec - a.busyMsPerSec);
  workers.sort((a, b) => b.busyMsPerSec - a.busyMsPerSec);
  const all = [...main, ...workers].sort((a, b) => b.busyMsPerSec - a.busyMsPerSec);
  return { main, workers, bottleneck: all[0] ?? null };
}

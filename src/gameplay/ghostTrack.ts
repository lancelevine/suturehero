/** Expert ghost replay (roadmap). The Demo's instrument motion is recorded (time, and per instrument
 * position, rotation and jaw opening) and can be played back on see-through ghost instruments for
 * the trainee to follow. Kept in this browser; values rounded to keep it small. */
export const GHOST_KEY = 'suturehero.ghostTrack.v1';
/** Samples per second recorded. */
export const GHOST_RATE = 10;

/** One sample: t, then for each instrument px, py, pz, qx, qy, qz, qw, openness. */
export type GhostSample = number[];
export const VALUES_PER_TOOL = 8;

type Pose = { position: { x: number; y: number; z: number }; quaternion: { x: number; y: number; z: number; w: number }; openness: number };
const round = (v: number) => Math.round(v * 1000) / 1000 || 0;

export class GhostRecorder {
  samples: GhostSample[] = [];
  private lastT = -Infinity;
  add(t: number, tools: readonly Pose[]) {
    if (t - this.lastT < 1 / GHOST_RATE) return;
    this.lastT = t;
    this.samples.push([round(t), ...tools.flatMap((p) => [p.position.x, p.position.y, p.position.z, p.quaternion.x, p.quaternion.y, p.quaternion.z, p.quaternion.w, p.openness].map(round))]);
  }
  reset() { this.samples = []; this.lastT = -Infinity; }
}

/** Interpolated values for each instrument at time `t` (clamped to the track), or null if empty. */
export function sampleGhost(track: readonly GhostSample[], t: number): number[][] | null {
  if (!track.length) return null;
  const start = track[0][0];
  const time = start + Math.max(0, t);
  let i = 1;
  while (i < track.length && track[i][0] < time) i++;
  const a = track[Math.max(0, i - 1)], b = track[Math.min(track.length - 1, i)];
  const span = b[0] - a[0];
  const k = span > 0 ? Math.min(1, Math.max(0, (time - a[0]) / span)) : 0;
  const tools = (a.length - 1) / VALUES_PER_TOOL;
  return Array.from({ length: tools }, (_, tool) => Array.from({ length: VALUES_PER_TOOL }, (_, v) => {
    const index = 1 + tool * VALUES_PER_TOOL + v;
    return a[index] + (b[index] - a[index]) * k;
  }));
}

export function ghostDuration(track: readonly GhostSample[]) {
  return track.length ? track[track.length - 1][0] - track[0][0] : 0;
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
export function saveGhost(storage: Storage | null, track: readonly GhostSample[]) {
  try { storage?.setItem(GHOST_KEY, JSON.stringify(track)); return true; } catch { return false; }
}
export function loadGhost(storage: Storage | null): GhostSample[] {
  try { const v = JSON.parse(storage?.getItem(GHOST_KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}

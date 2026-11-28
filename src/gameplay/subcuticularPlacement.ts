import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';

/** Subcuticular bite placement (roadmap). In a running subcuticular line each new bite should start
 * level with, or just behind, the last exit on the other side (measured along the wound in the
 * direction of travel). Starting ahead leaves a gap; starting far behind zig-zags back. */
export const AHEAD_LIMIT_MM = 0.5;
export const BEHIND_LIMIT_MM = 2;

type P = { entry: { z: number }; exit: { z: number } | null };

/** Offsets (mm) of each bite's entry from the previous exit, positive = ahead in the direction of travel. */
export function placementOffsets(run: readonly P[]) {
  if (run.length < 2) return [];
  const direction = Math.sign(run[run.length - 1].entry.z - run[0].entry.z) || 1;
  const offsets: number[] = [];
  for (let i = 1; i < run.length; i++) {
    const previous = run[i - 1].exit;
    if (previous) offsets.push((run[i].entry.z - previous.z) * direction * SCENE_MM_PER_UNIT);
  }
  return offsets;
}

export function placementCheck(run: readonly P[]) {
  const offsets = placementOffsets(run);
  const ahead = offsets.filter((o) => o > AHEAD_LIMIT_MM).length;
  const behind = offsets.filter((o) => o < -BEHIND_LIMIT_MM).length;
  const notes = [ahead ? `${ahead} started ahead (gap)` : '', behind ? `${behind} started far behind (zig-zag)` : ''].filter(Boolean).join(', ');
  return { label: `each bite starts level with or just behind the last exit${notes ? ` · ${notes}` : ''}`, met: offsets.length > 0 && !ahead && !behind };
}

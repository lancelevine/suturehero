/**
 * The practice scene's real scale (2026-11-14): about 27 mm per scene unit.
 * The scene's needles and pad are modelled at this size (PS-2: 3/8 circle,
 * 19 mm long, radius 0.30; CT-1: 1/2 circle, 36 mm, radius 0.43; pad about
 * 70 × 90 mm). Stereo-tracked instruments are placed at this scale
 * (src/input/stereoWorkspace.ts), and feedback reports distances in mm.
 */
export const SCENE_MM_PER_UNIT = 27;

/** A scene distance as real millimetres, e.g. "4.2 mm". */
export function formatMm(units: number, digits = 1): string {
  return `${(units * SCENE_MM_PER_UNIT).toFixed(digits)} mm`;
}

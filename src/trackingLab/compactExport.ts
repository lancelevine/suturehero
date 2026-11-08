import type { Frame } from './model';

/**
 * Smaller Tracking Lab exports for sharing (e.g. uploading to an assistant
 * with a 30 MB limit). Each frame's JPEG is re-encoded at a lower resolution
 * and quality. Frame metadata (width/height) keeps the recorded camera size,
 * and replay scales images back up to it, so coordinates, calibrations and
 * the tracking pipeline are unchanged — only image detail is reduced.
 */

export interface CompactPreset {
  /** Longest image side after re-encoding, px. */
  maxWidth: number;
  /** JPEG quality, 0–1. */
  quality: number;
}

/** Tried in order; the first whose estimated size fits the target is used. */
export const COMPACT_PRESETS: readonly CompactPreset[] = [
  { maxWidth: 1280, quality: 0.8 },
  { maxWidth: 960, quality: 0.75 },
  { maxWidth: 800, quality: 0.65 },
];

/** Stay below a 30 MB upload limit with room for the manifest. */
export const COMPACT_TARGET_BYTES = 28 * 1024 * 1024;
/** Frames encoded per preset to estimate the full export size. */
export const ESTIMATE_SAMPLE_FRAMES = 8;

/** Estimated total bytes from a sample of encoded frame sizes. */
export function estimateTotalBytes(sampleBytes: readonly number[], totalFrames: number): number {
  if (!sampleBytes.length) return 0;
  const mean = sampleBytes.reduce((sum, bytes) => sum + bytes, 0) / sampleBytes.length;
  return Math.round(mean * totalFrames);
}

/** Evenly spaced frame indices for size estimation. */
export function sampleIndices(total: number, count = ESTIMATE_SAMPLE_FRAMES): number[] {
  if (total <= count) return Array.from({ length: total }, (_, i) => i);
  return Array.from({ length: count }, (_, i) => Math.floor(((i + 0.5) * total) / count));
}

async function encode(image: Blob, preset: CompactPreset): Promise<Blob> {
  const bitmap = await createImageBitmap(image);
  try {
    const scale = Math.min(1, preset.maxWidth / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d')!;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    return await canvas.convertToBlob({ type: 'image/jpeg', quality: preset.quality });
  } finally {
    bitmap.close();
  }
}

export interface CompactResult {
  frames: Frame[];
  preset: CompactPreset;
  bytes: number;
  /** False when even the smallest preset is estimated above the target. */
  fitsTarget: boolean;
}

/** Re-encode frames with the largest preset expected to fit the target size. */
export async function compactFrames(
  frames: readonly Frame[],
  onProgress?: (done: number, total: number) => void,
  target = COMPACT_TARGET_BYTES,
): Promise<CompactResult> {
  const samples = sampleIndices(frames.length);
  let chosen = COMPACT_PRESETS[COMPACT_PRESETS.length - 1];
  let fitsTarget = false;
  for (const preset of COMPACT_PRESETS) {
    const sizes = await Promise.all(samples.map(async (i) => (await encode(frames[i].image, preset)).size));
    if (estimateTotalBytes(sizes, frames.length) <= target) {
      chosen = preset;
      fitsTarget = true;
      break;
    }
  }
  const out: Frame[] = [];
  let bytes = 0;
  for (const [i, frame] of frames.entries()) {
    const image = await encode(frame.image, chosen);
    bytes += image.size;
    out.push({ ...frame, image });
    onProgress?.(i + 1, frames.length);
  }
  return { frames: out, preset: chosen, bytes, fitsTarget: fitsTarget && bytes <= target };
}

/**
 * Pixel maths for the tracking page's diagnostic previews ("Detector crop"
 * and "Threshold preview"). Moved out of src/tracking.ts on 2026-11-09
 * without changing behaviour; the canvas drawing stays in tracking.ts.
 * These previews only visualise the image; they do not affect tracking.
 */

/** Pixels are RGBA, 4 bytes each (ImageData layout). */
type Pixels = { data: Uint8ClampedArray; width: number; height: number };

/** Rec. 601 luma, rounded, as used by the detector previews. */
export function luma(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

/** Half-size of the local mean window for the adaptive preview (px). */
export const ADAPTIVE_RADIUS_PX = 12;
/** A pixel is white when brighter than its local mean minus this. */
export const ADAPTIVE_OFFSET = 7;

/**
 * In place: black/white by comparing each pixel to the mean of its
 * (2·ADAPTIVE_RADIUS_PX+1)² neighbourhood (integral image), like ArUco's
 * adaptive threshold.
 */
export function adaptiveThresholdInPlace(image: Pixels): void {
  const { width, height, data } = image;
  const gray = new Uint8Array(width * height);
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      const value = luma(data[p], data[p + 1], data[p + 2]);
      gray[y * width + x] = value;
      row += value;
      integral[(y + 1) * (width + 1) + x + 1] = integral[y * (width + 1) + x + 1] + row;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - ADAPTIVE_RADIUS_PX);
      const x1 = Math.min(width, x + ADAPTIVE_RADIUS_PX + 1);
      const y0 = Math.max(0, y - ADAPTIVE_RADIUS_PX);
      const y1 = Math.min(height, y + ADAPTIVE_RADIUS_PX + 1);
      const sum = integral[y1 * (width + 1) + x1] - integral[y0 * (width + 1) + x1] - integral[y1 * (width + 1) + x0] + integral[y0 * (width + 1) + x0];
      const value = gray[y * width + x] > sum / ((x1 - x0) * (y1 - y0)) - ADAPTIVE_OFFSET ? 255 : 0;
      const p = (y * width + x) * 4;
      data[p] = value;
      data[p + 1] = value;
      data[p + 2] = value;
      data[p + 3] = 255;
    }
  }
}

/** Otsu's global threshold (0–255) for 8-bit gray values. */
export function otsuThreshold(gray: Uint8Array): number {
  const histogram = new Uint32Array(256);
  for (const value of gray) histogram[value]++;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  let back = 0;
  let weightedBack = 0;
  let best = -1;
  let threshold = 127;
  for (let i = 0; i < 256; i++) {
    back += histogram[i];
    if (!back) continue;
    const front = gray.length - back;
    if (!front) break;
    weightedBack += i * histogram[i];
    const delta = weightedBack / back - (sum - weightedBack) / front;
    const variance = back * front * delta * delta;
    if (variance > best) {
      best = variance;
      threshold = i;
    }
  }
  return threshold;
}

/** In place: black/white at the image's Otsu threshold. */
export function otsuThresholdInPlace(image: Pixels): void {
  const { data } = image;
  const gray = new Uint8Array(image.width * image.height);
  for (let i = 0; i < gray.length; i++) gray[i] = luma(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  const threshold = otsuThreshold(gray);
  for (let i = 0; i < gray.length; i++) {
    const value = gray[i] > threshold ? 255 : 0;
    data[i * 4] = value;
    data[i * 4 + 1] = value;
    data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }
}

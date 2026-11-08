/**
 * Finds small bright round blobs (white jaw balls) in a grayscale image.
 * Uses brightness only, so it works with monochrome cameras.
 */

export interface GrayImage {
  width: number;
  height: number;
  /** One luminance byte per pixel, row-major. */
  data: Uint8Array | Uint8ClampedArray;
}

/** Convert RGBA pixels (e.g. from getImageData) to luminance. */
export function grayFromRGBA(rgba: Uint8ClampedArray, width: number, height: number): GrayImage {
  const data = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i++, p += 4) {
    // Rec. 601 luma, integer approximation.
    data[i] = (rgba[p] * 77 + rgba[p + 1] * 150 + rgba[p + 2] * 29) >> 8;
  }
  return { width, height, data };
}

export interface BallCandidate {
  x: number;
  y: number;
  /** Equivalent radius from blob area, px. */
  radius: number;
  /** Mean brightness inside minus mean in a ring around it. */
  contrast: number;
}

export interface BallSearchOptions {
  /** Pixels to ignore, e.g. inside visible ArUco markers (white borders). */
  ignore?: (x: number, y: number) => boolean;
  /** Minimum inside-minus-surround brightness difference. */
  minContrast?: number;
}

/** Accepted blob area relative to a disc of the expected radius. */
export const AREA_RATIO_MIN = 0.3;
export const AREA_RATIO_MAX = 2.4;
/** Blob must fill at least this much of its bounding box (a disc fills ~0.785). */
export const MIN_FILL = 0.5;
export const MAX_ASPECT = 1.8;
export const DEFAULT_MIN_CONTRAST = 25;

/** Otsu's threshold over the non-ignored pixels. */
function otsuThreshold(image: GrayImage, ignore?: (x: number, y: number) => boolean): number {
  const histogram = new Array<number>(256).fill(0);
  let total = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (ignore?.(x, y)) continue;
      histogram[image.data[y * image.width + x]]++;
      total++;
    }
  }
  if (!total) return 255;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  let backgroundSum = 0;
  let backgroundCount = 0;
  let best = 0;
  let threshold = 127;
  for (let i = 0; i < 256; i++) {
    backgroundCount += histogram[i];
    if (!backgroundCount) continue;
    const foregroundCount = total - backgroundCount;
    if (!foregroundCount) break;
    backgroundSum += i * histogram[i];
    const meanBackground = backgroundSum / backgroundCount;
    const meanForeground = (sum - backgroundSum) / foregroundCount;
    const between = backgroundCount * foregroundCount * (meanBackground - meanForeground) ** 2;
    if (between > best) {
      best = between;
      threshold = i;
    }
  }
  return threshold;
}

function ringMean(image: GrayImage, cx: number, cy: number, inner: number, outer: number): number | null {
  let sum = 0;
  let count = 0;
  const x0 = Math.max(0, Math.floor(cx - outer));
  const x1 = Math.min(image.width - 1, Math.ceil(cx + outer));
  const y0 = Math.max(0, Math.floor(cy - outer));
  const y1 = Math.min(image.height - 1, Math.ceil(cy + outer));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const distance = Math.hypot(x - cx, y - cy);
      if (distance < inner || distance > outer) continue;
      sum += image.data[y * image.width + x];
      count++;
    }
  }
  return count ? sum / count : null;
}

/**
 * Bright, round blobs of roughly the expected radius, best first.
 * Coordinates are in the image's own pixels.
 */
export function findBrightBalls(
  image: GrayImage,
  expectedRadius: number,
  options: BallSearchOptions = {},
): BallCandidate[] {
  const { width, height, data } = image;
  if (!width || !height || expectedRadius <= 0) return [];
  const ignore = options.ignore;
  const minContrast = options.minContrast ?? DEFAULT_MIN_CONTRAST;
  const threshold = Math.max(otsuThreshold(image, ignore), 40);
  const expectedArea = Math.PI * expectedRadius * expectedRadius;
  const label = new Int32Array(width * height);
  const stack: number[] = [];
  const candidates: Array<BallCandidate & { score: number }> = [];
  let next = 0;

  for (let start = 0; start < label.length; start++) {
    if (label[start] || data[start] <= threshold) continue;
    const sx = start % width;
    const sy = (start - sx) / width;
    if (ignore?.(sx, sy)) continue;
    next++;
    label[start] = next;
    stack.push(start);
    let area = 0;
    let sumX = 0;
    let sumY = 0;
    let sumLum = 0;
    let minX = sx;
    let maxX = sx;
    let minY = sy;
    let maxY = sy;
    let touchesEdge = false;
    while (stack.length) {
      const index = stack.pop()!;
      const x = index % width;
      const y = (index - x) / width;
      area++;
      sumX += x;
      sumY += y;
      sumLum += data[index];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;
      const neighbors = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1];
      for (const n of neighbors) {
        if (n < 0 || label[n] || data[n] <= threshold) continue;
        const nx = n % width;
        if (ignore?.(nx, (n - nx) / width)) continue;
        label[n] = next;
        stack.push(n);
      }
    }
    // A blob cut off by the search window cannot be measured reliably.
    if (touchesEdge) continue;
    const areaRatio = area / expectedArea;
    if (areaRatio < AREA_RATIO_MIN || areaRatio > AREA_RATIO_MAX) continue;
    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    if (area / (boxWidth * boxHeight) < MIN_FILL) continue;
    if (Math.max(boxWidth, boxHeight) / Math.min(boxWidth, boxHeight) > MAX_ASPECT) continue;
    // Pixel (i, j) covers [i, i+1) × [j, j+1); report centers in that convention.
    const x = sumX / area + 0.5;
    const y = sumY / area + 0.5;
    const radius = Math.sqrt(area / Math.PI);
    const surround = ringMean(image, x - 0.5, y - 0.5, radius * 1.4, radius * 2.2);
    if (surround === null) continue;
    const contrast = sumLum / area - surround;
    if (contrast < minContrast) continue;
    // Prefer the expected size and stronger contrast.
    const score = Math.abs(Math.log(areaRatio)) - contrast / 255;
    candidates.push({ x, y, radius, contrast, score });
  }
  return candidates
    .sort((a, b) => a.score - b.score)
    .map(({ x, y, radius, contrast }) => ({ x, y, radius, contrast }));
}

export interface BrightSpot {
  x: number;
  y: number;
  /** Bright pixels used. */
  pixels: number;
  /** Brightest minus median brightness in the window. */
  contrast: number;
}

/** Minimum brightest-minus-median difference for a spot to count. */
export const SPOT_MIN_CONTRAST = 45;

/**
 * Brightness-weighted centre of the bright pixels in an image — a looser
 * fallback than findBrightBalls for following an already-locked ball through
 * blur, partial blocking or odd lighting. The caller supplies a small window
 * around the predicted position.
 */
export function brightSpotCentroid(image: GrayImage, minPixels: number, ignore?: (x: number, y: number) => boolean): BrightSpot | null {
  const values: number[] = [];
  let max = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (ignore?.(x, y)) continue;
      const v = image.data[y * image.width + x];
      values.push(v);
      if (v > max) max = v;
    }
  }
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  const median = values[values.length >> 1];
  const contrast = max - median;
  if (contrast < SPOT_MIN_CONTRAST) return null;
  // Pixels in the top part of the window's brightness range.
  const threshold = median + contrast * 0.55;
  let sx = 0;
  let sy = 0;
  let sw = 0;
  let pixels = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (ignore?.(x, y)) continue;
      const v = image.data[y * image.width + x];
      if (v < threshold) continue;
      const w = v - threshold + 1;
      sx += (x + 0.5) * w;
      sy += (y + 0.5) * w;
      sw += w;
      pixels++;
    }
  }
  if (pixels < minPixels) return null;
  return { x: sx / sw, y: sy / sw, pixels, contrast };
}

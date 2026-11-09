import { expect, it } from 'vitest';
import { adaptiveThresholdInPlace, otsuThreshold, otsuThresholdInPlace } from './frameDiagnostics';

const randomImage = (width: number, height: number, seed: number) => {
  let state = seed;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i++) {
    state = (state * 16807) % 2147483647;
    data[i] = state % 256;
  }
  return { width, height, data };
};

// The previous inline code from src/tracking.ts (renderCrop / renderThreshold), kept here as the reference.
function oldAdaptive(data: Uint8ClampedArray, side: number) {
  const g = new Uint8Array(side * side), ii = new Float64Array((side + 1) * (side + 1));
  for (let y = 0; y < side; y++) { let row = 0; for (let x = 0; x < side; x++) { const p = (y * side + x) * 4, v = Math.round(.299 * data[p] + .587 * data[p + 1] + .114 * data[p + 2]); g[y * side + x] = v; row += v; ii[(y + 1) * (side + 1) + x + 1] = ii[y * (side + 1) + x + 1] + row; } }
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const x0 = Math.max(0, x - 12), x1 = Math.min(side, x + 13), y0 = Math.max(0, y - 12), y1 = Math.min(side, y + 13);
    const sum = ii[y1 * (side + 1) + x1] - ii[y0 * (side + 1) + x1] - ii[y1 * (side + 1) + x0] + ii[y0 * (side + 1) + x0];
    const v = g[y * side + x] > sum / ((x1 - x0) * (y1 - y0)) - 7 ? 255 : 0, p = (y * side + x) * 4;
    data[p] = v; data[p + 1] = v; data[p + 2] = v; data[p + 3] = 255;
  }
}
function oldOtsu(data: Uint8ClampedArray, w: number, h: number) {
  const hist = new Uint32Array(256), gray = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) { const j = i * 4; const v = Math.round(.299 * data[j] + .587 * data[j + 1] + .114 * data[j + 2]); gray[i] = v; hist[v]++; }
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i]; let back = 0, weightedBack = 0, best = -1, threshold = 127;
  for (let i = 0; i < 256; i++) { back += hist[i]; if (!back) continue; const front = gray.length - back; if (!front) break; weightedBack += i * hist[i]; const delta = weightedBack / back - (sum - weightedBack) / front; const variance = back * front * delta * delta; if (variance > best) { best = variance; threshold = i; } }
  for (let i = 0; i < gray.length; i++) { const v = gray[i] > threshold ? 255 : 0; const j = i * 4; data[j] = v; data[j + 1] = v; data[j + 2] = v; data[j + 3] = 255; }
}

it('matches the previous adaptive-threshold preview exactly', () => {
  for (const seed of [1, 7, 99]) {
    const image = randomImage(40, 40, seed);
    const reference = new Uint8ClampedArray(image.data);
    oldAdaptive(reference, 40);
    adaptiveThresholdInPlace(image);
    expect(image.data).toEqual(reference);
  }
});

it('matches the previous Otsu preview exactly', () => {
  for (const seed of [3, 11]) {
    const image = randomImage(37, 23, seed);
    const reference = new Uint8ClampedArray(image.data);
    oldOtsu(reference, 37, 23);
    otsuThresholdInPlace(image);
    expect(image.data).toEqual(reference);
  }
});

it('splits a two-level image between its levels', () => {
  const gray = new Uint8Array([...new Array(50).fill(30), ...new Array(50).fill(200)]);
  const threshold = otsuThreshold(gray);
  expect(threshold).toBeGreaterThanOrEqual(30);
  expect(threshold).toBeLessThan(200);
});

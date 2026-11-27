import { expect, it } from 'vitest';
import { cameraStatusText, drawCornerDebug, drawDetectedMarker } from './markerOverlay';

it('outlines the marker and labels its ID above the first corner', () => {
  const calls: string[] = [];
  const context = new Proxy({} as Record<string, unknown>, {
    get: (target, key: string) => (key in target ? target[key] : (...args: unknown[]) => calls.push(`${key}(${args.join(',')})`)),
    set: (target, key: string, value) => { target[key] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
  drawDetectedMarker(context, { id: 7, corners: [{ x: 10, y: 40 }, { x: 30, y: 40 }, { x: 30, y: 60 }, { x: 10, y: 60 }] });
  expect(calls).toEqual(['beginPath()', 'moveTo(10,40)', 'lineTo(30,40)', 'lineTo(30,60)', 'lineTo(10,60)', 'closePath()', 'stroke()', 'fillText(ID 7,10,32)']);
  expect(context.strokeStyle).toBe('#18e89d');
});

it('formats the camera status line', () => {
  expect(cameraStatusText('Camera 2', 960, 540, [3, 4], 12, 30, 1.2)).toBe('Camera 2: 960 × 540 · 2 tracked · IDs 3, 4 · 10.0 decode FPS · 25.0 flow FPS');
  expect(cameraStatusText('Camera 2', 960, 540, [], 0, 0, 1)).toBe('Camera 2: 960 × 540 · 0 tracked · IDs none · 0.0 decode FPS · 0.0 flow FPS');
});

it('labels and colours an overlapping face amber', () => {
  const texts: string[] = [];
  const context = { beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {}, fillText: (text: string) => texts.push(text) } as unknown as CanvasRenderingContext2D;
  drawDetectedMarker(context, { id: 3, corners: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] }, true);
  expect(texts).toEqual(['OVERLAP ID 3']);
  expect(context.strokeStyle).toBe('#ffc14d');
});

it('drops stale raw corners from the corner-debug view', () => {
  const context = { beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {}, arc() {}, fill() {} } as unknown as CanvasRenderingContext2D;
  const marker = { id: 1, corners: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] };
  const raw = new Map([[1, { marker, receivedAt: 0 }], [2, { marker, receivedAt: 900 }]]);
  expect(drawCornerDebug(context, raw, [marker], 1000)).toMatch(/^1 decoded marker/);
  expect([...raw.keys()]).toEqual([2]);
});

import { expect, it } from 'vitest';
import { drawDetectedMarker } from './markerOverlay';

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

import { expect, it, vi } from 'vitest';
import { drawCornerMarks } from './markerOverlay';
import { drawRingAxes } from './ringAxisOverlay';

const fakeContext = () => ({ beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fill: vi.fn(), save: vi.fn(), restore: vi.fn(), strokeStyle: '', fillStyle: '', lineWidth: 0 }) as unknown as CanvasRenderingContext2D & Record<string, ReturnType<typeof vi.fn>>;
const corners = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];

it('draws a corner outline with dots, or larger dots only', () => {
  const outlined = fakeContext();
  drawCornerMarks(outlined, corners, '#00e5ff');
  expect(outlined.stroke).toHaveBeenCalledOnce();
  expect(outlined.arc).toHaveBeenCalledTimes(4);
  expect(outlined.arc.mock.calls[0][2]).toBe(3);
  const dots = fakeContext();
  drawCornerMarks(dots, corners, '#ffe34d', true);
  expect(dots.stroke).not.toHaveBeenCalled();
  expect(dots.arc.mock.calls[0][2]).toBe(4);
});

it('forgets a ring axis pose when its markers are no longer decoded', () => {
  const poses = new Map([['forceps', {} as never]]);
  drawRingAxes(fakeContext(), { forceps: [10, 11] }, [{ id: 10, corners }], () => 1000, 'ring8', 1280, 800, poses);
  expect(poses.has('forceps')).toBe(false);
});

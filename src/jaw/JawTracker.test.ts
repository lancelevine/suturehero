import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { findBrightBalls, grayFromRGBA, type GrayImage } from './brightBalls';
import { defaultIntrinsics, projectBodyPoint, type BodyPose } from './jawGeometry';
import {
  buildJawModel,
  JawCapture,
  JawTracker,
  MIN_CAPTURE_SAMPLES,
  parseJawModel,
  serializeJawModel,
  type JawFrame,
  type Region,
} from './JawTracker';

const WIDTH = 960;
const HEIGHT = 540;
const k = defaultIntrinsics(WIDTH, HEIGHT);
const DIAMETER = 10;

function pose(eulerDeg: [number, number, number], translation: [number, number, number] = [0, 0, 400]): BodyPose {
  return {
    quaternion: new THREE.Quaternion().setFromEuler(
      new THREE.Euler(...(eulerDeg.map(THREE.MathUtils.degToRad) as [number, number, number])),
    ),
    translation: new THREE.Vector3(...translation),
  };
}

/** A gray frame with white discs for each body-frame ball, plus extra bright spots. */
function render(p: BodyPose, balls: THREE.Vector3[], extras: Array<{ x: number; y: number; r: number }> = []): GrayImage {
  const data = new Uint8Array(WIDTH * HEIGHT).fill(60);
  const discs = [
    ...balls.map((ball) => {
      const projected = projectBodyPoint(p, ball, k)!;
      return { x: projected.x, y: projected.y, r: (k.fx * DIAMETER) / 2 / projected.depth };
    }),
    ...extras,
  ];
  for (const { x, y, r } of discs) {
    for (let yy = Math.floor(y - r - 1); yy <= Math.ceil(y + r + 1); yy++) {
      for (let xx = Math.floor(x - r - 1); xx <= Math.ceil(x + r + 1); xx++) {
        if (xx < 0 || yy < 0 || xx >= WIDTH || yy >= HEIGHT) continue;
        if (Math.hypot(xx + 0.5 - x, yy + 0.5 - y) <= r) data[yy * WIDTH + xx] = 235;
      }
    }
  }
  return { width: WIDTH, height: HEIGHT, data };
}

function frame(image: GrayImage, p: BodyPose, now: number): JawFrame {
  return {
    now,
    pose: p,
    intrinsics: k,
    sample(region: Region) {
      const x0 = Math.max(0, region.x);
      const y0 = Math.max(0, region.y);
      const x1 = Math.min(WIDTH, region.x + region.width);
      const y1 = Math.min(HEIGHT, region.y + region.height);
      if (x1 <= x0 || y1 <= y0) return null;
      const data = new Uint8Array((x1 - x0) * (y1 - y0));
      for (let y = y0; y < y1; y++) data.set(image.data.subarray(y * WIDTH + x0, y * WIDTH + x1), (y - y0) * (x1 - x0));
      return { image: { width: x1 - x0, height: y1 - y0, data }, region: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, scale: 1 };
    },
  };
}

// Ball A rides on the jaw the tracker is mounted to (does not move);
// ball B swings outward by 18 mm when the jaws open.
const closedBalls = [new THREE.Vector3(-6, 45, 10), new THREE.Vector3(6, 45, 10)];
const openBalls = [new THREE.Vector3(-6, 45, 10), new THREE.Vector3(22, 41, 10)];
const ballsAt = (opening: number) => closedBalls.map((closed, i) => closed.clone().lerp(openBalls[i], opening));

/** A turn in small steps: the pose changes every third frame and pauses between. */
const turn = (i: number) => {
  const step = Math.floor(i / 3);
  return pose([-20 + step * 2.4, 10 - step * 1.5, step * 0.9], [5, -20, 380 + step]);
};

function capture(balls: THREE.Vector3[]) {
  const first = turn(0);
  const seeds = balls.map((ball) => projectBodyPoint(first, ball, k)!);
  const run = new JawCapture('closed', seeds, DIAMETER, 0);
  let progress = run.progress;
  for (let i = 0; i < 60; i++) {
    const p = turn(i);
    progress = run.update(frame(render(p, balls), p, i * 33));
  }
  return { run, progress };
}

describe('bright ball detection', () => {
  it('finds a white disc and rejects shapes of the wrong size or form', () => {
    const image = render(pose([0, 0, 0]), [new THREE.Vector3(0, 0, 0)], [
      { x: 100, y: 100, r: 30 }, // too large
      { x: 200, y: 100, r: 1 }, // too small
    ]);
    const r = (k.fx * DIAMETER) / 2 / 400;
    const balls = findBrightBalls(image, r);
    expect(balls).toHaveLength(1);
    expect(balls[0].x).toBeCloseTo(WIDTH / 2, 0);
    expect(balls[0].radius).toBeCloseTo(r, 0);
  });

  it('ignores masked pixels', () => {
    const image = render(pose([0, 0, 0]), [new THREE.Vector3(0, 0, 0)]);
    const r = (k.fx * DIAMETER) / 2 / 400;
    expect(findBrightBalls(image, r, { ignore: (x) => x > WIDTH / 2 - 40 })).toHaveLength(0);
  });

  it('converts RGBA to luminance', () => {
    const gray = grayFromRGBA(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]), 2, 1);
    expect(Array.from(gray.data)).toEqual([255, 0]);
  });
});

describe('calibration capture', () => {
  it('locates each ball in the tracker frame from a slow turn', () => {
    const { run, progress } = capture(closedBalls);
    expect(progress.samples).toBeGreaterThanOrEqual(MIN_CAPTURE_SAMPLES);
    expect(progress.ready).toBe(true);
    const solved = run.solve();
    expect('points' in solved).toBe(true);
    if (!('points' in solved)) return;
    solved.points.forEach((point, i) => expect(point.distanceTo(closedBalls[i])).toBeLessThan(1.5));
  });

  it('is not ready without enough rotation', () => {
    const p = pose([-20, 10, 0], [5, -20, 380]);
    const run = new JawCapture('closed', closedBalls.map((b) => projectBodyPoint(p, b, k)!), DIAMETER, 0);
    for (let i = 0; i < 40; i++) run.update(frame(render(p, closedBalls), p, i * 33));
    expect(run.progress.samples).toBeGreaterThanOrEqual(MIN_CAPTURE_SAMPLES);
    expect(run.progress.ready).toBe(false);
  });

  it('records no samples while the instrument turns quickly', () => {
    const fast = (i: number) => pose([-20 + i * 1.5, 10 - i, 0], [5, -20, 380]);
    const run = new JawCapture('closed', closedBalls.map((b) => projectBodyPoint(fast(0), b, k)!), DIAMETER, 0);
    for (let i = 0; i < 30; i++) run.update(frame(render(fast(i), closedBalls), fast(i), i * 33));
    expect(run.progress.samples).toBeLessThanOrEqual(1);
  });

  it('fails when a ball disappears', () => {
    const p = turn(0);
    const run = new JawCapture('closed', closedBalls.map((b) => projectBodyPoint(p, b, k)!), DIAMETER, 0);
    for (let i = 0; i < 60; i++) run.update(frame(render(p, [closedBalls[0]]), p, i * 33));
    expect(run.progress.failed).toMatch(/Lost ball 2/);
  });
});

describe('jaw model', () => {
  it('pairs closed and open balls regardless of click order', () => {
    const model = buildJawModel(closedBalls, [openBalls[1], openBalls[0]]);
    expect('balls' in model).toBe(true);
    if (!('balls' in model)) return;
    expect(model.balls[1].open.distanceTo(openBalls[1])).toBeLessThan(1e-9);
  });

  it('requires a ball to move', () => {
    expect(buildJawModel(closedBalls, closedBalls)).toHaveProperty('error');
  });

  it('round-trips through storage and rejects other tracker geometry', () => {
    const model = buildJawModel(closedBalls, openBalls);
    if (!('balls' in model)) throw new Error('model');
    const saved = JSON.parse(JSON.stringify(serializeJawModel(model, 'ring8')));
    expect(parseJawModel(saved, 'ring8')?.balls[1].open.toArray()).toEqual(openBalls[1].toArray());
    expect(parseJawModel(saved, 'prism')).toBeNull();
    expect(parseJawModel({ ...saved, balls: [{ closed: [0, 0], open: [0, 0, 0] }] }, 'ring8')).toBeNull();
  });
});

describe('run-time opening', () => {
  const model = buildJawModel(closedBalls, openBalls);
  if (!('balls' in model)) throw new Error('model');

  it('measures the opening in different poses', () => {
    for (const [euler, opening] of [
      [[-30, 0, 0], 0],
      [[-10, 25, 5], 0.5],
      [[-45, -20, -10], 1],
      [[0, 15, 20], 0.25],
    ] as Array<[[number, number, number], number]>) {
      const tracker = new JawTracker(model);
      const p = pose(euler, [10, 0, 420]);
      const reading = tracker.update(frame(render(p, ballsAt(opening)), p, 0));
      expect(reading.opening).not.toBeNull();
      expect(Math.abs(reading.opening! - opening)).toBeLessThan(0.06);
      expect(reading.confidence).toBe(1);
    }
  });

  it('ignores a ball that does not move with the jaws', () => {
    const tracker = new JawTracker(model);
    const p = pose([-20, 0, 0]);
    const reading = tracker.update(frame(render(p, ballsAt(0.5)), p, 0));
    expect(reading.balls.filter((ball) => ball.moving)).toHaveLength(1);
  });

  it('ignores a bright spot away from the jaw path', () => {
    const tracker = new JawTracker(model);
    const p = pose([-20, 0, 0]);
    const closedB = projectBodyPoint(p, closedBalls[1], k)!;
    const reading = tracker.update(
      frame(render(p, ballsAt(0.3), [{ x: closedB.x, y: closedB.y + 40, r: 7 }]), p, 0),
    );
    expect(Math.abs(reading.opening! - 0.3)).toBeLessThan(0.06);
  });

  it('holds briefly when the balls are lost, then reports lost', () => {
    const tracker = new JawTracker(model);
    const p = pose([-20, 0, 0]);
    tracker.update(frame(render(p, ballsAt(0.8)), p, 0));
    const empty = render(p, []);
    expect(tracker.update(frame(empty, p, 100)).opening).not.toBeNull();
    expect(tracker.update(frame(empty, p, 400)).opening).toBeNull();
  });

  it('smooths changes', () => {
    const tracker = new JawTracker(model);
    const p = pose([-20, 0, 0]);
    tracker.update(frame(render(p, ballsAt(0)), p, 0));
    const next = tracker.update(frame(render(p, ballsAt(1)), p, 33)).opening!;
    expect(next).toBeGreaterThan(0.4);
    expect(next).toBeLessThan(1);
  });
});

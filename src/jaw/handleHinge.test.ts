import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { averageRotation, handleRelativeToRing, hingeOpening, parseHinge, serializeHinge, solveHinge } from './handleHinge';

const deg = (d: number) => (d * Math.PI) / 180;
const turn = (axis: Vector3, d: number) => new Quaternion().setFromAxisAngle(axis.clone().normalize(), deg(d));

// An arbitrary instrument: hinge axis and prism mounting are unknown to the solver.
const hingeAxis = new Vector3(0.3, 1, -0.2).normalize();
const mount = turn(new Vector3(1, 0.4, 0.7), 35);
/** Handle orientation (camera frame) for a ring pose and hinge angle. */
const handleAt = (ring: Quaternion, hingeDeg: number) => ring.clone().multiply(turn(hingeAxis, hingeDeg)).multiply(mount);

describe('handle hinge jaw opening', () => {
  const ringAtCalibration = turn(new Vector3(0.2, 0.9, 0.1), 50);
  const model = solveHinge(
    handleRelativeToRing(ringAtCalibration, handleAt(ringAtCalibration, 0)),
    handleRelativeToRing(ringAtCalibration, handleAt(ringAtCalibration, 20)),
  );
  if ('error' in model) throw new Error(model.error);

  it('reads the opening for any ring pose', () => {
    for (const ringDeg of [0, 70, 160, 250]) {
      const ring = turn(new Vector3(1, 0.5, -0.3), ringDeg);
      for (const hingeDeg of [0, 5, 10, 20]) {
        expect(hingeOpening(model, handleRelativeToRing(ring, handleAt(ring, hingeDeg)))).toBeCloseTo(hingeDeg / 20, 6);
      }
    }
  });

  it('ignores off-hinge wobble from pose noise', () => {
    const ring = turn(new Vector3(0, 0, 1), 30);
    const wobble = turn(hingeAxis.clone().cross(new Vector3(0, 0, 1)), 3);
    const handle = ring.clone().multiply(turn(hingeAxis, 10)).multiply(wobble).multiply(mount);
    expect(hingeOpening(model, handleRelativeToRing(ring, handle))).toBeCloseTo(0.5, 2);
  });

  it('rejects a too-small open capture and round-trips saved models', () => {
    const closed = handleRelativeToRing(ringAtCalibration, handleAt(ringAtCalibration, 0));
    expect(solveHinge(closed, handleRelativeToRing(ringAtCalibration, handleAt(ringAtCalibration, 2)))).toHaveProperty('error');
    const restored = parseHinge(JSON.parse(JSON.stringify(serializeHinge(model as Exclude<typeof model, { error: string }>))));
    expect(restored).not.toBeNull();
    expect(parseHinge({ version: 1, closed: [0, 0, 0, 1], axis: [0, 0, 2], openAngle: 0.3 })).toBeNull();
  });
});

describe('capture averaging', () => {
  it('averages a held-still capture despite noise and an occasional flip', () => {
    const base = turn(new Vector3(0, 1, 0), 40);
    const noisy = Array.from({ length: 20 }, (_, i) => base.clone().multiply(turn(new Vector3(1, 0.3, 0), ((i % 5) - 2) * 1.2)));
    noisy[3] = base.clone().multiply(turn(new Vector3(0, 0, 1), 25)); // a flipped single-marker pose
    const result = averageRotation(noisy);
    expect(result.mean).not.toBeNull();
    expect(result.mean!.angleTo(base)).toBeLessThan(deg(0.5));
    expect(result.inliers).toBe(19);
  });

  it('rejects a capture where the instrument really moved', () => {
    const base = turn(new Vector3(0, 1, 0), 40);
    const moving = Array.from({ length: 20 }, (_, i) => base.clone().multiply(turn(new Vector3(1, 0, 0), i * 1.5)));
    const result = averageRotation(moving);
    expect(result.mean).toBeNull();
    expect(result.spread).toBeGreaterThan(deg(5));
  });
});

describe('opening filter', () => {
  it('ignores isolated flips and settles near the true opening', async () => {
    const { OpeningFilter } = await import('./handleHinge');
    const f = new OpeningFilter();
    let out = 0;
    for (let i = 0; i < 40; i++) out = f.update(0.5 + (i % 2 ? 0.08 : -0.08) + (i === 20 ? 0.45 : 0));
    expect(Math.abs(out - 0.5)).toBeLessThan(0.05);
  });

  it('follows a real, repeated change', async () => {
    const { OpeningFilter } = await import('./handleHinge');
    const f = new OpeningFilter();
    for (let i = 0; i < 10; i++) f.update(0);
    let out = 0;
    for (let i = 0; i < 12; i++) out = f.update(1);
    expect(out).toBeGreaterThan(0.9);
  });
});

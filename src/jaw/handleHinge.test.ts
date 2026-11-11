import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { averageRotation, bestHingeReading, handleRelativeToRing, hingeOpening, hingeSwing, MAX_HINGE_SWING_RADIANS, parseHinge, serializeHinge, solveHinge } from './handleHinge';

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

describe('prism face layout', () => {
  it('learns corrections that make every face agree with the reference face, at any later pose', async () => {
    const { correctedRelative, faceCorrection, newFaceLayout, parseFaceLayout, serializeFaceLayout } = await import('./handleHinge');
    // Unknown per-face errors (e.g. order reversed: ±120° roll, or a sticker turned 90°).
    const errors = [new Quaternion(), turn(new Vector3(0, 1, 0), 240), turn(new Vector3(0, 0, 1), 90)];
    const reading = (trueRelative: Quaternion, face: number) => trueRelative.clone().multiply(errors[face]);
    const stillPose = turn(new Vector3(0.3, 1, 0.2), 25);
    const layout = newFaceLayout(0);
    for (const face of [1, 2]) layout.corrections[face] = faceCorrection(reading(stillPose, face), reading(stillPose, 0));
    const later = turn(new Vector3(1, 0.2, -0.4), 70);
    for (const face of [0, 1, 2]) expect(correctedRelative(layout, face, reading(later, face))!.angleTo(reading(later, 0))).toBeLessThan(1e-6);
    // Unaligned faces are not used; layouts survive saving.
    expect(correctedRelative(newFaceLayout(0), 2, reading(later, 2))).toBeNull();
    const restored = parseFaceLayout(JSON.parse(JSON.stringify(serializeFaceLayout(layout))))!;
    expect(correctedRelative(restored, 2, reading(later, 2))!.angleTo(reading(later, 0))).toBeLessThan(1e-6);
    expect(parseFaceLayout({ version: 1, reference: 1, corrections: [null, null, null] })).toBeNull();
  });
});

describe('face correction snapping', () => {
  it('snaps a noisy correction to the exact sticker layout, including reversed order and turned stickers', async () => {
    const { faceCorrection, snapFaceCorrection } = await import('./handleHinge');
    const { faceGeometry } = await import('../input/prismPose');
    const F = (k: number) => faceGeometry(k, 'prism').rotation;
    const Rz = (q: number) => new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (q * Math.PI) / 2);
    // Physical prism: sticker for face 1 sits on face 2 and is turned 90°; reference face 0 is correct.
    const E1 = F(2).clone().multiply(Rz(1)).multiply(F(1).clone().invert());
    const truth = turn(new Vector3(0.3, 1, 0.2), 25);
    const exact = faceCorrection(truth.clone().multiply(E1), truth);
    const noisy = faceCorrection(truth.clone().multiply(E1).multiply(turn(new Vector3(1, 0.5, 0), 3)), truth);
    expect(snapFaceCorrection(noisy, 1, 0).angleTo(exact)).toBeLessThan(1e-6);
    // Consistent faces: the noisy correction snaps to identity.
    expect(snapFaceCorrection(turn(new Vector3(0, 1, 1), 3), 2, 0).angleTo(new Quaternion())).toBeLessThan(1e-6);
    // A real prism that is 10° off the ideal layout keeps its measured correction.
    const handMade = turn(new Vector3(0, 1, 1), 10);
    expect(snapFaceCorrection(handMade, 2, 0).angleTo(handMade)).toBeLessThan(1e-6);
    // Something no real layout explains is kept as measured.
    const odd = turn(new Vector3(1, 1, 0), 45);
    expect(snapFaceCorrection(odd, 1, 0).angleTo(odd)).toBeLessThan(1e-6);
  });
});

describe('hinge swing check', () => {
  const closed = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.4);
  const axis = new Vector3(0, 0, 1);
  const turn = (v: Vector3, angle: number) => new Quaternion().setFromAxisAngle(v.clone().normalize(), angle);
  const model = { closed, axis, openAngle: 0.5 };
  it('is near zero for a turn about the hinge, and the off-axis angle otherwise', () => {
    expect(hingeSwing(model, closed.clone().multiply(turn(axis, 0.3)))).toBeLessThan(1e-6);
    const tilted = closed.clone().multiply(turn(axis, 0.3)).multiply(turn(new Vector3(1, 0, 0), 0.6));
    expect(hingeSwing(model, tilted)).toBeCloseTo(0.6, 5);
  });
  it('picks the reading that fits the hinge and rejects all-off-axis ones', () => {
    const good = closed.clone().multiply(turn(axis, 0.25));
    const mirrored = good.clone().multiply(turn(new Vector3(0, 1, 0), 1.2));
    expect(bestHingeReading(model, [mirrored, good], (q) => q)!.candidate).toBe(good);
    expect(hingeOpening(model, good)).toBeCloseTo(0.5, 5);
    expect(bestHingeReading(model, [mirrored], (q) => q)).toBeNull();
    const noisy = good.clone().multiply(turn(new Vector3(1, 1, 0), MAX_HINGE_SWING_RADIANS * 0.5));
    expect(bestHingeReading(model, [noisy], (q) => q)).not.toBeNull();
  });
});

describe('twist angle', () => {
  it('gives the same angle for q and −q (both describe the same rotation)', async () => {
    const { twistAngle } = await import('./handleHinge');
    const axis = new Vector3(0, 0, 1);
    const q = new Quaternion().setFromAxisAngle(axis, (-14 * Math.PI) / 180);
    const negated = new Quaternion(-q.x, -q.y, -q.z, -q.w);
    expect(twistAngle(q, axis)).toBeCloseTo((-14 * Math.PI) / 180, 6);
    expect(twistAngle(negated, axis)).toBeCloseTo((-14 * Math.PI) / 180, 6);
  });
});

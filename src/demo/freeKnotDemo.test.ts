import * as THREE from 'three';
import { expect, it } from 'vitest';
import { PracticeSession } from '../gameplay/PracticeSession';
import { Instrument } from '../instruments/Instrument';
import { NeedleGrasp } from '../suture/NeedleGrasp';
import { SutureModel } from '../suture/SutureModel';
import { Choreography } from './choreography';
import { physicsDemoSegments, stitchSummary } from './physicsDemo';

it('performs a free pass and ties a locked, seated surgeon’s knot by thread physics at the app frame rate, then keeps the stitch', async () => {
  const needle = new SutureModel(), left = new Instrument('left', 0), right = new Instrument('right', 0);
  const scene = new THREE.Scene();
  scene.add(needle.root, left.root, right.root);
  const grasp = new NeedleGrasp(needle);
  const session = new PracticeSession({ sample: () => ({ translation: [0, 0, 0], rotation: [0, 0, 0], jaw: 0 }), dispose: () => {} }, [left, right], grasp);
  const dance = new Choreography(physicsDemoSegments({ session, needle, grasp, left, right }));
  let everted = false, frames = 0, seated = false, technique: string | undefined, locked = false, picked = false, gap = Infinity, lowestShaft = Infinity;
  while (dance.step(1 / 60)) {
    session.update(1 / 60);
    everted ||= session.eversion.held && session.eversion.anchor.x > 0;
    if (session.freePass.passes.length === 0) {
      // The driver's jaws and shaft stay above the skin while loading and driving the needle.
      right.root.updateWorldMatrix(true, false);
      lowestShaft = Math.min(lowestShaft, right.root.localToWorld(new THREE.Vector3(0, 0, 0.05)).y, right.root.localToWorld(new THREE.Vector3(0, 0, 0.6)).y);
    }
    if (grasp.holder === right && !session.freePass.inTissue && session.freePass.passes.length === 0) {
      // A real grip: the driver's jaws are on the needle, not holding it at a distance.
      picked = true;
      right.root.updateWorldMatrix(true, false);
      needle.root.updateWorldMatrix(true, false);
      const jaw = right.root.localToWorld(new THREE.Vector3(0, 0, 0.05));
      gap = Math.min(...needle.points.map((p) => p.clone().applyMatrix4(needle.root.matrixWorld).distanceTo(jaw)));
    }
    if (session.freeKnot.active) {
      technique = session.freeKnot.sequence?.technique;
      locked = !!session.freeKnot.sequence?.locked;
      seated ||= session.canFinishSandboxStitch;
    }
    if (++frames % 120 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(everted).toBe(true);
  expect(picked).toBe(true);
  expect(gap).toBeLessThan(0.03);
  expect(lowestShaft).toBeGreaterThan(0.41);
  expect(technique).toBe('surgeon');
  expect(locked).toBe(true);
  expect(seated).toBe(true);
  // The stitch was kept after the instruments let go (a seated lock holds) and the practice is back in the Sandbox.
  expect(session.course.completed).toHaveLength(1);
  const review = session.course.completed[0].review.join(' | ');
  expect(review, review).toMatch(/Knot: secure/);
  expect(session.sandbox).toBe(true);
  expect(stitchSummary(session)).toMatch(/^Stitch complete · bites \d+\.\d mm \/ \d+\.\d mm from the edge · \d+\.\d mm deep \(dermis\) · knot secure$/);
  // A bite that reaches the dermis from about 6 mm out.
  const bite = session.freePass.passes[0];
  expect(bite.deepestLayer).toBe('dermis');
  expect(bite.entryEdge * 27).toBeGreaterThan(4.5);
  expect(bite.crossesWound).toBe(true);
  // Right to left: in through the right edge, out through the left.
  expect(bite.entry.x).toBeGreaterThan(0);
  expect(bite.exit!.x).toBeLessThan(0);
  // About a minute and a half of demo at 60 fps.
  expect(frames / 60).toBeLessThan(110);
}, 400000);

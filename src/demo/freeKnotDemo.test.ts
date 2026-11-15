import * as THREE from 'three';
import { expect, it } from 'vitest';
import { PracticeSession } from '../gameplay/PracticeSession';
import { Instrument } from '../instruments/Instrument';
import { NeedleGrasp } from '../suture/NeedleGrasp';
import { SutureModel } from '../suture/SutureModel';
import { Choreography } from './choreography';
import { physicsDemoSegments } from './physicsDemo';

it('performs a free pass and ties a locked, seated surgeon’s knot by thread physics at the app frame rate, then keeps the stitch', async () => {
  const needle = new SutureModel(), left = new Instrument('left', 0), right = new Instrument('right', 0);
  const scene = new THREE.Scene();
  scene.add(needle.root, left.root, right.root);
  const grasp = new NeedleGrasp(needle);
  const session = new PracticeSession({ sample: () => ({ translation: [0, 0, 0], rotation: [0, 0, 0], jaw: 0 }), dispose: () => {} }, [left, right], grasp);
  const dance = new Choreography(physicsDemoSegments({ session, needle, grasp, left, right }));
  let frames = 0, seated = false, technique: string | undefined, locked = false;
  while (dance.step(1 / 60)) {
    session.update(1 / 60);
    if (session.freeKnot.active) {
      technique = session.freeKnot.sequence?.technique;
      locked = !!session.freeKnot.sequence?.locked;
      seated ||= session.canFinishSandboxStitch;
    }
    if (++frames % 120 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(technique).toBe('surgeon');
  expect(locked).toBe(true);
  expect(seated).toBe(true);
  // The stitch was kept and the practice is back in the Sandbox.
  expect(session.course.completed).toHaveLength(1);
  expect(session.course.completed[0].review.join(' ')).toMatch(/Knot: /);
  expect(session.sandbox).toBe(true);
  // About two minutes of demo at 60 fps.
  expect(frames / 60).toBeLessThan(150);
}, 400000);

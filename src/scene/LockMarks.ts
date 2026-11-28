import * as THREE from 'three';
import { PRACTICE_SETUP } from '../setup/PracticeSetup';
import { disposeChildren } from './disposeChildren';

/** A small loop of thread lying on the skin at each locked running stitch (gameplay/runningLock.ts).
 * A marker for where the thread passes through its own loop; not part of the thread simulation. */
const LOOP_RADIUS = 0.05;
const THREAD_RADIUS = 0.008;

export class LockMarks {
  readonly root = new THREE.Group();
  private readonly geometry = new THREE.TorusGeometry(LOOP_RADIUS, THREAD_RADIUS, 6, 24);
  private readonly material = new THREE.MeshStandardMaterial({ color: PRACTICE_SETUP.suture.color, roughness: 0.4 });
  private key = '';

  constructor() {
    this.root.name = 'running-lock-marks';
  }

  update(exits: ReadonlyArray<{ x: number; y: number; z: number }>) {
    const key = exits.map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`).join(';');
    if (key === this.key) return;
    this.key = key;
    disposeChildren(this.root, new Set([this.material]), new Set([this.geometry]));
    for (const exit of exits) {
      const loop = new THREE.Mesh(this.geometry, this.material);
      loop.rotation.x = -Math.PI / 2;
      loop.position.set(exit.x, exit.y + THREAD_RADIUS, exit.z);
      loop.name = 'running-lock-loop';
      this.root.add(loop);
    }
  }
}

import * as THREE from 'three';
import { trackedInstrumentRotation } from '../input/trackingFrame';
import { Instrument } from '../instruments/Instrument';

/**
 * Instrument models for the tracking page's virtual view ("Instrument
 * diagnostics"). Moved out of src/tracking.ts on 2026-11-09 without changing
 * behaviour. Each model sits in a parent group whose origin is the tracked
 * pose; the shared mounting rotation keeps the neutral handle up, tip down.
 */

/** Height of each tracked group above the virtual pad, in scene units. */
const TRACKED_GROUP_HEIGHT = 0.25;
const INSTRUMENT_SCALE = 0.72;
const SCISSORS_SCALE = 0.8;

/** Needle driver ('right') or forceps ('left'), added to `scene`. */
export function createTrackedInstrument(scene: THREE.Scene, id: 'left' | 'right', color: number): { group: THREE.Group; model: Instrument } {
  const model = new Instrument(id, color);
  if (id === 'right') model.setDriverStyle('castro');
  const group = new THREE.Group();
  // Instrument.reset() positions/rotates the model for the main game.
  // In tracking, the parent group's origin is the measured prism center/tip.
  model.root.position.set(0, 0, 0);
  model.root.quaternion.copy(trackedInstrumentRotation());
  model.root.scale.setScalar(INSTRUMENT_SCALE);
  group.add(model.root);
  group.position.y = TRACKED_GROUP_HEIGHT;
  scene.add(group);
  return { group, model };
}

/** Scissors: two crossing blades and finger rings sharing one tracked pose, added to `scene`. */
export function createTrackedScissors(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xc5d1d5, metalness: 0.85, roughness: 0.27 });
  const rod = (a: THREE.Vector3, b: THREE.Vector3, radius: number) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 12), steel);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    group.add(mesh);
  };
  // Children per side, in order: rod, blade, ring (setScissorsOpening relies on this order).
  for (const side of [-1, 1]) {
    rod(new THREE.Vector3(side * 0.11, 0, 1.4), new THREE.Vector3(side * 0.015, 0, 0.7), 0.043);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.035, 0.85), steel);
    blade.position.set(side * 0.055, 0, 0.3);
    blade.rotation.y = side * 0.14;
    group.add(blade);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 10, 32), steel);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(side * 0.25, 0, 1.67);
    group.add(ring);
  }
  const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), steel);
  pivot.position.z = 0.72;
  group.add(pivot);
  group.scale.setScalar(SCISSORS_SCALE);
  // Scissors are also modelled along +Z; use the same shaft alignment.
  group.quaternion.copy(trackedInstrumentRotation());
  const tracked = new THREE.Group();
  tracked.add(group);
  tracked.position.y = TRACKED_GROUP_HEIGHT;
  scene.add(tracked);
  return tracked;
}

/** Index of each side's blade among the scissors model's children (rod, blade, ring per side). */
const BLADE_CHILD = { left: 1, right: 4 } as const;

/** Opens the scissors preview: 0 = closed … 1 = open. */
export function setScissorsOpening(scissors: THREE.Group, value: number) {
  const model = scissors.children[0] as THREE.Group;
  for (const side of [-1, 1]) {
    const blade = model.children[side === -1 ? BLADE_CHILD.left : BLADE_CHILD.right];
    if (blade instanceof THREE.Mesh) blade.rotation.y = side * (0.03 + value * 0.3);
  }
}

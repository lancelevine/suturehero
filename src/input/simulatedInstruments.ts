import * as THREE from 'three';

/**
 * Keyboard-driven instruments on the tracking page when "Simulated input" is on (moved out of
 * src/tracking.ts, 2026-11-27): arrows move the needle driver, WASD the forceps, IJKL the scissors,
 * Shift doubles the speed. Positions stay inside the practice area.
 */
export const SIMULATED_LIMIT = 2;

const KEY_MAP = {
  driver: { left: 'arrowleft', right: 'arrowright', up: 'arrowup', down: 'arrowdown' },
  forceps: { left: 'a', right: 'd', up: 'w', down: 's' },
  scissors: { left: 'j', right: 'l', up: 'i', down: 'k' },
} as const;

export function moveSimulatedInstruments(keys: ReadonlySet<string>, dt: number, instruments: Record<keyof typeof KEY_MAP, THREE.Object3D>) {
  const speed = (keys.has('shift') ? 2 : 1) * dt;
  const axis = (positive: string, negative: string) => Number(keys.has(positive)) - Number(keys.has(negative));
  for (const name of ['driver', 'scissors', 'forceps'] as const) {
    const keysFor = KEY_MAP[name];
    const position = instruments[name].position;
    position.x += axis(keysFor.right, keysFor.left) * speed;
    position.z += axis(keysFor.down, keysFor.up) * speed;
  }
  for (const name of ['driver', 'forceps', 'scissors'] as const) {
    const position = instruments[name].position;
    position.x = THREE.MathUtils.clamp(position.x, -SIMULATED_LIMIT, SIMULATED_LIMIT);
    position.z = THREE.MathUtils.clamp(position.z, -SIMULATED_LIMIT, SIMULATED_LIMIT);
  }
}

export function simulatedReadout(position: THREE.Vector3) {
  return `Simulated · (${position.x.toFixed(2)}, ${position.z.toFixed(2)})`;
}

/** Where the simulated instruments start (scene units): driver behind, forceps centre, scissors in front. */
export const SIMULATED_START = { driver: [0, 0.25, -0.65], forceps: [0, 0.25, 0.15], scissors: [0, 0.25, 1.05] } as const;

/** Put the simulated instruments back at their start, unrotated. */
export function resetSimulatedInstruments(instruments: Record<keyof typeof SIMULATED_START, THREE.Object3D>) {
  for (const name of ['driver', 'forceps', 'scissors'] as const) {
    const [x, y, z] = SIMULATED_START[name];
    instruments[name].position.set(x, y, z);
    instruments[name].quaternion.identity();
  }
}
